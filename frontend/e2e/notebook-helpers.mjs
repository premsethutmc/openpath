/** Secondary input modes moved into the approved exercise overflow menu. */
export async function notebookOption(page, name) {
  const button = page.getByRole('button', {name, exact:true});
  if (!await button.isVisible()) await page.getByLabel('Lesson options', {exact:true}).click();
  await button.click();
}
