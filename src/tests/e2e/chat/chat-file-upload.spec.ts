import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '../fixtures';
import { seedSignedInSession, USER_ID } from '../utils/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FIXTURE = path.join(
  __dirname,
  '..',
  'fixtures',
  'upload-sample.txt',
);

const E2E_ROOM_ID = 'e2e-room-1111-4111-8111-111111111111';

test.describe('Chat file upload', () => {
  async function stubChatRoom(
    page: import('@playwright/test').Page,
    profileOverride?: Partial<{ handle: string; display_name: string | null }>,
  ) {
    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      const isSingle = route
        .request()
        .headers()
        ['accept']?.includes('application/vnd.pgrst.object+json');
      const room = {
        id: E2E_ROOM_ID,
        room_type: 'dm',
        name: null,
        created_by: USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? room : [room]),
      });
    });

    await page.route('**/rest/v1/chat_room_members*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            room_id: E2E_ROOM_ID,
            user_id: USER_ID,
            role: 'member',
            joined_at: new Date().toISOString(),
            left_at: null,
          },
          {
            room_id: E2E_ROOM_ID,
            user_id: 'other-user-1',
            role: 'member',
            joined_at: new Date().toISOString(),
            left_at: null,
          },
        ]),
      });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: USER_ID,
            handle: 'member',
            display_name: 'Member',
            avatar: null,
          },
          {
            id: 'other-user-1',
            handle: profileOverride?.handle ?? 'nick',
            display_name: profileOverride?.display_name ?? 'Nick Clark',
            avatar: null,
          },
        ]),
      });
    });

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON() as {
          content?: string | null;
          room_id?: string;
          sender_id?: string;
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-e2e-1',
            room_id: payload.room_id ?? E2E_ROOM_ID,
            sender_id: payload.sender_id ?? USER_ID,
            content: payload.content ?? null,
            is_system_message: false,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });
  }

  test('attach file: input accepts file and send button enables (no permanent upload spinner)', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);

    await stubChatRoom(page);

    await page.route('**/storage/v1/object/**', async (route) => {
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible({
      timeout: 35_000,
    });

    const fileInput = page.locator('input[type=file]').first();
    await fileInput.setInputFiles(UPLOAD_FIXTURE);

    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeEnabled({ timeout: 15_000 });
  });

  test('keeps the message input visible and avoids page-level scroll gaps', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);

    await stubChatRoom(page);

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const messageInput = page.getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible({ timeout: 35_000 });
    await expect(page.getByTestId('chat-message-scroll')).toBeVisible();

    const layoutMetrics = await page.evaluate(() => {
      const scrollContainer = document.querySelector(
        '[data-testid="app-scroll-container"]',
      ) as HTMLElement | null;
      const messageScroll = document.querySelector(
        '[data-testid="chat-message-scroll"]',
      ) as HTMLElement | null;
      const input = document.querySelector(
        '[aria-label="Message"]',
      ) as HTMLElement | null;

      return {
        appScrollHasOverflow: scrollContainer
          ? scrollContainer.scrollHeight > scrollContainer.clientHeight + 1
          : null,
        messageScrollCanOwnOverflow: messageScroll
          ? messageScroll.clientHeight > 0
          : null,
        inputBottomWithinViewport: input
          ? input.getBoundingClientRect().bottom <= window.innerHeight
          : null,
      };
    });

    expect(layoutMetrics.appScrollHasOverflow).toBe(false);
    expect(layoutMetrics.messageScrollCanOwnOverflow).toBe(true);
    expect(layoutMetrics.inputBottomWithinViewport).toBe(true);
  });

  test('pressing Enter sends the message and keeps focus in the input', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page);

    let resolveSend: (() => void) | null = null;
    const sendStarted = new Promise<void>((resolve) => {
      resolveSend = resolve;
    });

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      resolveSend?.();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const payload = route.request().postDataJSON() as {
        content?: string | null;
        room_id?: string;
        sender_id?: string;
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-e2e-enter-focus',
          room_id: payload.room_id ?? E2E_ROOM_ID,
          sender_id: payload.sender_id ?? USER_ID,
          content: payload.content ?? null,
          is_system_message: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const messageInput = page.getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible({ timeout: 35_000 });
    await messageInput.click();
    await messageInput.fill('Enter keeps focus');
    await expect(messageInput).toBeFocused();

    await page.keyboard.press('Enter');
    await sendStarted;

    await expect(messageInput).toBeFocused();
    await expect(messageInput).toHaveValue('');
    await expect(messageInput).toBeEnabled();
  });

  test('keeps header and composer usable on mobile and supports keyboard navigation through the composer controls', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page, {
      display_name: 'A Very Long Display Name For Mobile Chat Header',
      handle: 'long-mobile-handle',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    const messageInput = page.getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible({ timeout: 35_000 });
    await expect(
      page.getByRole('button', { name: 'Chat options' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Attach image' }),
    ).toBeVisible();

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector(
        '[data-testid="chat-message-input-shell"]',
      ) as HTMLElement | null;
      return {
        viewportWidth: window.innerWidth,
        bodyOverflowX:
          document.documentElement.scrollWidth > window.innerWidth + 1,
        shellBottomWithinViewport: shell
          ? shell.getBoundingClientRect().bottom <= window.innerHeight
          : null,
      };
    });

    expect(metrics.bodyOverflowX).toBe(false);
    expect(metrics.shellBottomWithinViewport).toBe(true);

    await messageInput.focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Expand input' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Attach image' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Attach file' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Add GIF' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Add emoji' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'More options' }),
    ).toBeFocused();

    await messageInput.fill('hello');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeFocused();
  });
});
