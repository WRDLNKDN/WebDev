import { expect, test } from './fixtures';

test.describe('Portfolio highlights carousel', () => {
  const waitForPublicProfileResponse = (
    page: import('@playwright/test').Page,
  ) =>
    page.waitForResponse((response) =>
      response.url().includes('/rest/v1/rpc/get_public_profile_by_share_token'),
    );

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

    await Promise.all([
      waitForPublicProfileResponse(page),
      page.goto('/p/highlights-token', {
        waitUntil: 'domcontentloaded',
      }),
    ]);

    const carousel = page.getByTestId('portfolio-highlights-carousel');
    await expect(carousel).toBeVisible({ timeout: 15_000 });
    await expect(carousel).toContainText('Launch Reel');
    await expect(carousel).not.toContainText('Ops Notes');

    await expect(
      page.getByTestId('portfolio-section-case-study'),
    ).toBeVisible();
    await expect(
      page.getByTestId('portfolio-section-operations'),
    ).toBeVisible();

    const carouselBox = await carousel.boundingBox();
    const firstSectionBox = await page
      .getByTestId('portfolio-section-case-study')
      .boundingBox();
    expect(carouselBox?.y ?? 0).toBeLessThan(firstSectionBox?.y ?? 0);

    await expect(page.getByTestId('portfolio-highlights-position')).toHaveText(
      '1 / 2',
    );
    await expect
      .poll(() => carousel.getAttribute('data-active-index'), {
        timeout: 7000,
      })
      .toBe('1');

    await page.getByTestId('portfolio-highlights-next').click();
    await expect(page.getByTestId('portfolio-highlights-position')).toHaveText(
      '1 / 2',
    );
    await expect(carousel).toContainText('Launch Reel');
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

    await Promise.all([
      waitForPublicProfileResponse(page),
      page.goto('/p/mobile-highlights-token', {
        waitUntil: 'domcontentloaded',
      }),
    ]);

    await expect(page.getByTestId('portfolio-highlights-carousel')).toBeVisible(
      {
        timeout: 15_000,
      },
    );
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
