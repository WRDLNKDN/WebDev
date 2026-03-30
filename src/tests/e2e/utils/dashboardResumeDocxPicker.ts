import { expect, type Page } from '@playwright/test';
import { setupDashboardResumeStubs } from './dashboardResumeDocxStubs';

export const DASHBOARD_RESUME_DOCX_FIXTURE = {
  name: 'E2E-Resume.docx',
  mimeType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  buffer: Buffer.from('e2e-stub-docx'),
} as const;

export async function openDashboardResumeDocxPicker(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-main')).toBeVisible({
    timeout: 45_000,
  });
  await expect(
    page.getByTestId('dashboard-portfolio-showcase-section'),
  ).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: /add to portfolio/i }).click();
  await page.getByRole('menuitem', { name: /^add resume$/i }).click();

  const fileInput = page.locator('input[type="file"][accept*=".docx"]').first();
  await fileInput.setInputFiles(DASHBOARD_RESUME_DOCX_FIXTURE);
}

/** Stubs + navigation + file pick (shared by resume thumbnail E2E cases). */
export async function arrangeDashboardResumeDocxUpload(
  page: Page,
  thumbnailMode: 'success' | '422',
) {
  await setupDashboardResumeStubs(page, { thumbnailMode });
  await openDashboardResumeDocxPicker(page);
}
