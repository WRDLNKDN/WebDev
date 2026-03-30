import { expect, test } from '../fixtures';
import {
  DASHBOARD_RESUME_DOCX_FIXTURE,
  arrangeDashboardResumeDocxUpload,
} from '../utils/dashboardResumeDocxPicker';
import { RESUME_E2E_PDF_PUBLIC_URL } from '../utils/dashboardResumeDocxStubs';

test.describe('Dashboard DOCX resume + generate-thumbnail (stubbed API)', () => {
  test('Word upload calls generate-thumbnail and surfaces PDF resume URL', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await arrangeDashboardResumeDocxUpload(page, 'success');

    await expect(page.getByTestId('resume-file-name')).toContainText(
      DASHBOARD_RESUME_DOCX_FIXTURE.name,
      { timeout: 25_000 },
    );

    const openDoc = page
      .getByTestId('dashboard-portfolio-showcase-section')
      .getByRole('link', { name: 'Open document' });
    await expect(openDoc).toBeVisible({ timeout: 15_000 });
    await expect(openDoc).toHaveAttribute('href', RESUME_E2E_PDF_PUBLIC_URL);
  });

  test('failed generate-thumbnail shows preview warning toast', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await arrangeDashboardResumeDocxUpload(page, '422');

    await expect(
      page.getByRole('alert').filter({ hasText: /Preview was not generated/i }),
    ).toBeVisible({ timeout: 25_000 });
  });
});
