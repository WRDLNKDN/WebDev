import { expect, test } from '../fixtures';

test.describe('Portfolio highlights carousel', () => {
  test('renders above category sections, shows only highlighted items, and supports navigation', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const payload = {
      profile: {
        id: '33333333-3333-4333-8333-333333333333',
        display_name: 'Highlight Member',
        tagline: 'Showcase owner',
        avatar: null,
        nerd_creds: {},
        socials: [],
        resume_url: null,
      },
      portfolio: [
        {
          id: 'highlight-1',
          title: 'Launch Reel',
          description: 'Primary highlight artifact.',
          project_url: 'https://example.com/launch-reel',
          image_url: 'https://picsum.photos/seed/highlight-1/1200/675',
          tech_stack: ['Case Study'],
          is_highlighted: true,
          sort_order: 0,
          normalized_url: 'https://example.com/launch-reel',
          embed_url: null,
          resolved_type: 'image',
          thumbnail_url: null,
          thumbnail_status: null,
        },
        {
          id: 'standard-1',
          title: 'Ops Notes',
          description: 'Standard section artifact.',
          project_url: 'https://example.com/ops-notes',
          image_url: null,
          tech_stack: ['Operations'],
          is_highlighted: false,
          sort_order: 1,
          normalized_url: 'https://example.com/ops-notes',
          embed_url: null,
          resolved_type: 'pdf',
          thumbnail_url: null,
          thumbnail_status: null,
        },
        {
          id: 'highlight-2',
          title: 'Demo Deck',
          description: 'Secondary highlight artifact.',
          project_url: 'https://example.com/demo-deck',
          image_url: 'https://picsum.photos/seed/highlight-2/1200/675',
          tech_stack: ['Presentations'],
          is_highlighted: true,
          sort_order: 2,
          normalized_url: 'https://example.com/demo-deck',
          embed_url: null,
          resolved_type: 'image',
          thumbnail_url: null,
          thumbnail_status: null,
        },
      ],
    };

    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      },
    );

    await page.goto('/p/highlights-token', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 30_000,
    });

    const nextButton = page.getByRole('button', { name: /next highlight/i });
    const previousButton = page.getByRole('button', {
      name: /previous highlight/i,
    });
    const position = page
      .locator('main')
      .getByText(/^[12]\s*\/\s*2$/)
      .first();

    await expect(nextButton).toBeVisible({ timeout: 30_000 });
    await expect(previousButton).toBeVisible({ timeout: 30_000 });
    await expect(position).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'Launch Reel', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByTestId('portfolio-section-case-study'),
    ).toBeVisible();
    await expect(
      page.getByTestId('portfolio-section-operations'),
    ).toBeVisible();

    const carouselBox = await nextButton.boundingBox();
    const firstSectionBox = await page
      .getByTestId('portfolio-section-case-study')
      .boundingBox();
    expect(carouselBox?.y ?? 0).toBeLessThan(firstSectionBox?.y ?? 0);

    const before = (await position.textContent())?.trim();
    await nextButton.click();
    await expect(position).toBeVisible();
    const after = (await position.textContent())?.trim();
    expect(after).not.toBeNull();
    expect(after).not.toEqual(before);
  });

  test('stays readable on mobile without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const payload = {
      profile: {
        id: '44444444-4444-4444-8444-444444444444',
        display_name: 'Mobile Showcase',
        tagline: 'Responsive',
        avatar: null,
        nerd_creds: {},
        socials: [],
        resume_url: null,
      },
      portfolio: [
        {
          id: 'mobile-highlight',
          title: 'Mobile Highlight',
          description:
            'A highlighted artifact with enough copy to stress the mobile layout.',
          project_url: 'https://example.com/mobile-highlight',
          image_url: 'https://picsum.photos/seed/mobile-highlight/1200/675',
          tech_stack: ['Case Study', 'Mobile'],
          is_highlighted: true,
          sort_order: 0,
          normalized_url: 'https://example.com/mobile-highlight',
          embed_url: null,
          resolved_type: 'image',
          thumbnail_url: null,
          thumbnail_status: null,
        },
        {
          id: 'mobile-standard',
          title: 'Mobile Grid Card',
          description: 'A standard artifact rendered below the carousel.',
          project_url: 'https://example.com/mobile-grid-card',
          image_url: null,
          tech_stack: ['Mobile'],
          is_highlighted: false,
          sort_order: 1,
          normalized_url: 'https://example.com/mobile-grid-card',
          embed_url: null,
          resolved_type: 'pdf',
          thumbnail_url: null,
          thumbnail_status: null,
        },
      ],
    };

    await page.route(
      '**/rest/v1/rpc/get_public_profile_by_share_token*',
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      },
    );

    await page.goto('/p/mobile-highlights-token', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 30_000,
    });

    await expect(
      page.getByRole('heading', { name: 'Mobile Highlight', exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId('portfolio-section-mobile').getByRole('button', {
        name: /mobile grid card/i,
      }),
    ).toBeVisible();

    const noHorizontalOverflow = await page.evaluate(() => {
      const body = document.body;
      const doc = document.documentElement;
      return (
        Math.max(body.scrollWidth, doc.scrollWidth) <= window.innerWidth + 1
      );
    });
    expect(noHorizontalOverflow).toBe(true);
  });
});
