/** Test-only: advance ordinary evidence without assuming its answer is correct. */
export async function submitAnyReadingEvidence(page){
 await page.locator('[data-evidence-stage="evidence"]').waitFor();
 await page.getByRole('checkbox').first().check();
 await page.getByRole('button',{name:/^Save evidence/}).click();
}
