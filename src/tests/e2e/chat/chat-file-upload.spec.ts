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
const MID_SIZED_GIF = {
  name: 'party.gif',
  mimeType: 'image/gif',
  buffer: Buffer.alloc(5 * 1024 * 1024, 1),
};
/** Valid 1×1 GIF so `renderImageBlob` succeeds during structured chat upload (random bytes are not decodable). */
const DIRECT_GIF = {
  name: 'party.gif',
  mimeType: 'image/gif',
  buffer: Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  ),
};
const TOO_LARGE_GIF = {
  name: 'too-large.gif',
  mimeType: 'image/gif',
  /** Above the 6MB manual GIF upload ceiling. */
  buffer: Buffer.alloc(7 * 1024 * 1024, 1),
};

const E2E_ROOM_ID = 'e2e-room-1111-4111-8111-111111111111';

const threadComposer = (page: import('@playwright/test').Page) =>
  page
    .getByTestId('chat-thread-column')
    .getByRole('textbox', { name: 'Message' });

const threadSendButton = (page: import('@playwright/test').Page) =>
  page
    .getByTestId('chat-thread-column')
    .getByRole('button', { name: 'Send message' });

function requestWantsSingleObject(route: import('@playwright/test').Route) {
  return (
    route
      .request()
      .headers()
      ['accept']?.includes('application/vnd.pgrst.object+json') ?? false
  );
}

test.describe('Chat file upload', () => {
  async function stubChatRoom(
    page: import('@playwright/test').Page,
    profileOverride?: Partial<{ handle: string; display_name: string | null }>,
  ) {
    const messages: Array<Record<string, unknown>> = [];

    await page.route('**/rest/v1/chat_rooms*', async (route) => {
      const isSingle = requestWantsSingleObject(route);
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
      const requestUrl = new URL(route.request().url());
      const idFilter = requestUrl.searchParams.get('id');
      const requestedId = idFilter?.startsWith('eq.')
        ? idFilter.slice(3)
        : null;
      const profiles = [
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
      ];
      const matchedProfiles = requestedId
        ? profiles.filter((profile) => profile.id === requestedId)
        : profiles;
      const isSingle = requestWantsSingleObject(route);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          isSingle ? (matchedProfiles[0] ?? null) : matchedProfiles,
        ),
      });
    });

    await page.route('**/rest/v1/chat_messages*', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON() as {
          content?: string | null;
          room_id?: string;
          sender_id?: string;
        };
        const message = {
          id: 'msg-e2e-1',
          room_id: payload.room_id ?? E2E_ROOM_ID,
          sender_id: payload.sender_id ?? USER_ID,
          content: payload.content ?? null,
          is_system_message: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        messages.splice(0, messages.length, message);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(message),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
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
    await expect(threadComposer(page)).toBeVisible({
      timeout: 35_000,
    });

    const fileInput = page.getByTestId('chat-attachment-file-input');
    await fileInput.setInputFiles(UPLOAD_FIXTURE);

    await expect(threadSendButton(page)).toBeEnabled({ timeout: 15_000 });
  });

  test('allows a larger gif within the 6MB upload ceiling', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page);

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(threadComposer(page)).toBeVisible({
      timeout: 35_000,
    });

    const fileInput = page.getByTestId('chat-attachment-file-input');
    await fileInput.setInputFiles(MID_SIZED_GIF);

    await expect(
      page.getByText('This GIF is too large to process. Try a smaller file.'),
    ).not.toBeVisible();
    await expect(threadSendButton(page)).toBeEnabled();
  });

  test('uploads a small gif in direct mode without the optimizer flow', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    let processedGifRequested = false;
    let uploadPath: string | null = null;
    let uploadMimeType: string | null = null;
    let attachmentInsertMime: string | null = null;

    await page.route('**/api/chat/attachments/process-gif', async (route) => {
      processedGifRequested = true;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'should not be called' }),
      });
    });

    await page.route(
      '**/storage/v1/object/chat-attachments/**',
      async (route) => {
        uploadPath = route.request().url();
        uploadMimeType = await route.request().headerValue('content-type');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: `${USER_ID}/party.gif` }),
        });
      },
    );

    await page.route('**/rest/v1/chat_message_attachments*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { mime_type?: string };
        attachmentInsertMime = body.mime_type ?? null;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'attachment-1',
            message_id: 'msg-e2e-1',
            storage_path: `${USER_ID}/party.gif`,
            mime_type: body.mime_type ?? 'image/gif',
            file_size: DIRECT_GIF.buffer.length,
            created_at: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'attachment-1',
            message_id: 'msg-e2e-1',
            storage_path: `${USER_ID}/party.gif`,
            mime_type: 'image/gif',
            file_size: DIRECT_GIF.buffer.length,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route(
      '**/storage/v1/object/sign/chat-attachments/**',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            signedUrl:
              'https://example.supabase.co/storage/v1/object/sign/chat-attachments/fake.gif?token=e2e',
            signedURL:
              '/storage/v1/object/sign/chat-attachments/fake.gif?token=e2e',
          }),
        });
      },
    );

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(threadComposer(page)).toBeVisible({
      timeout: 35_000,
    });

    const fileInput = page.getByTestId('chat-attachment-file-input');
    await fileInput.setInputFiles(DIRECT_GIF);
    await threadComposer(page).fill('processed gif');
    await threadSendButton(page).click();

    await expect.poll(() => processedGifRequested).toBe(false);
    await expect.poll(() => attachmentInsertMime).toBe('image/gif');
    await expect
      .poll(() => uploadPath)
      .toContain('/storage/v1/object/chat-attachments/');
    await expect
      .poll(() => uploadMimeType ?? '')
      .toMatch(/^(image\/gif|multipart\/form-data;)/);
    const gifPreview = page.getByAltText('GIF attachment');
    await expect(gifPreview).toHaveCount(1);
    await expect
      .poll(async () =>
        gifPreview.evaluate((element) => {
          const styles = globalThis.getComputedStyle(element);
          return {
            objectFit: styles.objectFit,
            maxHeight: styles.maxHeight,
            height: styles.height,
          };
        }),
      )
      .toMatchObject({
        objectFit: 'contain',
        maxHeight: '440px',
      });
  });

  test('rejects a gif above the 6MB upload ceiling with a clear message', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const { stubAdminRpc } = await seedSignedInSession(page.context());
    await stubAdminRpc(page);
    await stubChatRoom(page);

    await page.goto(`/chat-full/${E2E_ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(threadComposer(page)).toBeVisible({
      timeout: 35_000,
    });

    const fileInput = page.getByTestId('chat-attachment-file-input');
    await fileInput.setInputFiles(TOO_LARGE_GIF);

    await expect(
      page.getByText('This GIF is too large to process. Try a smaller file.'),
    ).toBeVisible();
    await expect(threadSendButton(page)).toBeDisabled();
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

    const messageInput = threadComposer(page);
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
        '[data-testid="chat-thread-column"] [aria-label="Message"]',
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

    const messageInput = threadComposer(page);
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

    const messageInput = threadComposer(page);
    await expect(messageInput).toBeVisible({ timeout: 35_000 });
    const thread = page.getByTestId('chat-thread-column');
    await expect(
      thread.getByRole('button', { name: 'Chat options' }),
    ).toBeVisible();
    await expect(
      thread.getByRole('button', { name: 'Attach image or GIF' }),
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

    const activeComposerLabel = async () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        return (
          active?.getAttribute('aria-label') ??
          active?.getAttribute('title') ??
          active?.textContent ??
          ''
        ).trim();
      });

    await messageInput.focus();
    await page.keyboard.press('Tab');
    await expect
      .poll(async () => {
        const label = await activeComposerLabel();
        return [
          'Expand input',
          'Attach image',
          'Attach image or GIF',
          'Open menu',
        ].includes(label)
          ? label
          : '';
      })
      .not.toBe('');
    const firstComposerFocus = await activeComposerLabel();
    expect([
      'Expand input',
      'Attach image',
      'Attach image or GIF',
      'Open menu',
    ]).toContain(firstComposerFocus);
    if (
      firstComposerFocus === 'Expand input' ||
      firstComposerFocus === 'Open menu'
    ) {
      await page.keyboard.press('Tab');
      await expect.poll(activeComposerLabel).toBe('Attach image or GIF');
    } else {
      await expect.poll(activeComposerLabel).toBe('Attach image or GIF');
    }
    await page.keyboard.press('Tab');
    await expect.poll(activeComposerLabel).toBe('Attach document or file');
    await page.keyboard.press('Tab');
    await expect.poll(activeComposerLabel).toBe('Add GIF');
    await page.keyboard.press('Tab');
    await expect.poll(activeComposerLabel).toBe('Add emoji');
    await page.keyboard.press('Tab');
    await expect.poll(activeComposerLabel).toBe('More options');

    await messageInput.fill('hello');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect.poll(activeComposerLabel).toBe('Send message');
  });
});
