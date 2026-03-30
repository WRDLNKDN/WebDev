import { expect, test, type Page } from '../fixtures';
import {
  DASHBOARD_RESUME_DOCX_FIXTURE,
  arrangeDashboardResumeDocxUpload,
} from '../utils/dashboardResumeDocxPicker';
import { RESUME_E2E_PDF_PUBLIC_URL } from '../utils/dashboardResumeDocxStubs';

type ThumbnailScenario = {
  title: string;
  thumbnailMode: 'success' | '422';
  assert: (page: Page) => Promise<void>;
};

const DOCX_THUMBNAIL_SCENARIOS: ThumbnailScenario[] = [
  {
    title: 'Word upload calls generate-thumbnail and surfaces PDF resume URL',
    thumbnailMode: 'success',
    assert: async (page) => {
      await expect(page.getByTestId('resume-file-name')).toContainText(
        DASHBOARD_RESUME_DOCX_FIXTURE.name,
        { timeout: 25_000 },
      );

      const openDoc = page
        .getByTestId('dashboard-portfolio-showcase-section')
        .getByRole('link', { name: 'Open document' });
      await expect(openDoc).toBeVisible({ timeout: 15_000 });
      await expect(openDoc).toHaveAttribute('href', RESUME_E2E_PDF_PUBLIC_URL);
    },
  },
  {
    title: 'failed generate-thumbnail shows preview warning toast',
    thumbnailMode: '422',
    assert: async (page) => {
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: /Preview was not generated/i }),
      ).toBeVisible({ timeout: 25_000 });
    },
  },
];

test.describe('Dashboard DOCX resume + generate-thumbnail (stubbed API)', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const { title, thumbnailMode, assert } of DOCX_THUMBNAIL_SCENARIOS) {
    test(title, async ({ page }) => {
      await arrangeDashboardResumeDocxUpload(page, thumbnailMode);
      await assert(page);
    });
  }
});
