import { expect, test } from '../fixtures';

test.describe('Portfolio categories on public profile', () => {
  test('renders project categories on card and preview modal', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const payload = {
      profile: {
        id: '11111111-1111-4111-8111-111111111111',
        display_name: 'Portfolio Member',
        tagline: 'Builder',
        avatar: null,
        nerd_creds: {},
        socials: [],
        resume_url: null,
      },
      portfolio: [
        {
          id: 'project-2',
          title: 'Data Artifact',
          description: 'Categorized under data.',
          project_url: 'https://example.com/data-case-study.pdf',
          image_url: null,
          tech_stack: ['Data'],
          sort_order: 0,
          normalized_url: 'https://example.com/data-case-study.pdf',
          embed_url: null,
          resolved_type: 'pdf',
          thumbnail_url: null,
          thumbnail_status: null,
        },
        {
          id: 'project-1',
          title: 'UAT Artifact',
          description: 'Created from dashboard portfolio flow.',
          project_url: 'https://example.com/case-study.pdf',
          image_url: null,
          tech_stack: ['Case Study', 'DevOps', 'UX', 'Performance', 'LongTail'],
          sort_order: 1,
          normalized_url: 'https://example.com/case-study.pdf',
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

    await page.goto('/p/portfolio-categories-token', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('app-main')).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText('Portfolio Member')).toBeVisible({
      timeout: 30_000,
    });

    const sectionOrder = await page
      .locator('[data-testid^="portfolio-section-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid')),
      );
    expect(sectionOrder.slice(0, 3)).toEqual([
      'portfolio-section-data',
      'portfolio-section-case-study',
      'portfolio-section-devops',
    ]);

    await expect(
      page.getByTestId('portfolio-section-case-study'),
    ).toBeVisible();
    await expect(page.getByTestId('portfolio-section-devops')).toBeVisible();
    await expect(page.getByTestId('portfolio-section-data')).toBeVisible();
    await expect(
      page
        .getByTestId('portfolio-section-case-study')
        .getByRole('button', { name: /uat artifact/i }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId('portfolio-section-data')
        .getByRole('button', { name: /data artifact/i }),
    ).toBeVisible();

    await page
      .getByTestId('portfolio-section-case-study')
      .getByRole('button', { name: /uat artifact/i })
      .click();
    const previewDialog = page.getByRole('dialog');
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByText('LongTail')).toBeVisible();
  });
});
