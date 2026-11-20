// Collects Chromium JS coverage from every page an e2e test opens, into $COVERAGE_RAW (default /tmp/english-coverage).
// Use: node --import ./scripts/english-coverage/preload.mjs --test e2e/<x>.test.mjs, then report.mjs.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const RAW = process.env.COVERAGE_RAW ?? "/tmp/english-coverage";
mkdirSync(RAW, { recursive: true });
let n = 0;
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const browser = await launch(...a);
  const pages = new Set();
  const dump = async (only) => {
    for (const p of [...pages]) {
      if (only && !only.includes(p)) continue;
      pages.delete(p);
      try {
        const cov = await p.coverage.stopJSCoverage();
        const keep = cov.filter((e) => /\/assets\/.*\.js(\?|$)/.test(e.url)).map((e) => ({ url: e.url, functions: e.functions }));
        writeFileSync(`${RAW}/${process.pid}-${n++}.json`, JSON.stringify(keep));
      } catch {}
    }
  };
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...b) => {
    const ctx = await newContext(...b);
    const mine = [];
    const newPage = ctx.newPage.bind(ctx);
    ctx.newPage = async (...c) => {
      const p = await newPage(...c);
      try { await p.coverage.startJSCoverage({ resetOnNavigation: false }); pages.add(p); mine.push(p); } catch {}
      return p;
    };
    const close = ctx.close.bind(ctx);
    ctx.close = async (...c) => (await dump(mine), close(...c));
    return ctx;
  };
  const bclose = browser.close.bind(browser);
  browser.close = async (...c) => (await dump(), bclose(...c));
  return browser;
};
