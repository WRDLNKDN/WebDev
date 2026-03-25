import type { Locator, Page } from '@playwright/test';

/** Selects the Research portfolio category in Add/Edit project dialogs (MUI Autocomplete). */
export async function selectResearchCategoryInProjectDialog(
  page: Page,
  dialog: Locator,
): Promise<void> {
  const categoriesInput = dialog.getByRole('combobox', { name: 'Category' });
  await categoriesInput.click();
  await categoriesInput.fill('Research');
  await page.getByRole('option', { name: 'Research' }).click();
}
