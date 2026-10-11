// One place to find a headless Chromium for the art tools.
// Uses the project's Playwright when installed, or PLAYWRIGHT_MODULE / CHROMIUM_PATH when provided.
export async function launch() {
  const mod = process.env.PLAYWRIGHT_MODULE || "playwright";
  const { chromium } = await import(mod);
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}
