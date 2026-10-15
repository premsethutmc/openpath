/**
 * Private demo server: the built English app (dist-english/) behind a server-side password, for one product owner.
 *
 *   DEMO_PASSWORD_HASH=… DEMO_SESSION_SECRET=… node scripts/demo-server.mjs
 *
 * Nothing of the app (HTML, JavaScript, CSS, icons, licences, source maps) is served before a valid session. Only
 * /login, /healthz, /robots.txt and a no-op /sw.js answer without one. Node's standard library only: no dependencies.
 *
 * Configuration (environment):
 *   DEMO_PASSWORD_HASH   required. scrypt hash from `node scripts/demo-hash-password.mjs`; never the password itself
 *   DEMO_SESSION_SECRET  required, at least 32 characters. Signs session cookies, so sessions survive a restart.
 *                        Changing it, or the password hash, ends every session.
 *   DEMO_SESSION_HOURS   session lifetime, default 168 (7 days). The session ends after this, active or not.
 *   PORT, HOST           default 10000 and 0.0.0.0 (Render sets PORT)
 *   DEMO_DIST            the build folder, default dist-english
 *   DEMO_ALLOW_HTTP=1    local testing only: cookies without Secure, no HTTPS redirect, no HSTS
 *
 * Sessions: an HMAC-signed cookie (__Host-openpath_demo; Secure, HttpOnly, SameSite=Strict) holding a random id and
 * an expiry. Logout revokes the id at once (kept in memory until it would have expired: a restart forgets revocations,
 * so a cookie copied before logging out would work again until it expires, which is why "log out everywhere" means
 * changing DEMO_SESSION_SECRET). Login attempts are limited per client and in total; failures are not logged with
 * any detail. The service worker of the static build is replaced by one that removes itself: the app is never cached
 * for offline use, so nothing of it stays readable after logging out.
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

// ------------------------------------------------------------------ passwords

const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 32 };
const scryptOpts = (N, r, p) => ({ N, r, p, maxmem: 128 * N * r * 2 });

/** `scrypt$N$r$p$salt$hash` (base64url), for DEMO_PASSWORD_HASH. */
export async function hashPassword(password, salt = randomBytes(16)) {
  const key = await scrypt(password.normalize("NFKC"), salt, SCRYPT.keylen, scryptOpts(SCRYPT.N, SCRYPT.r, SCRYPT.p));
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export function parseHash(stored) {
  const m = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9_-]{16,})\$([A-Za-z0-9_-]{32,})$/.exec(stored ?? "");
  if (!m) return null;
  const [N, r, p] = [m[1], m[2], m[3]].map(Number);
  if (N < 1 << 14 || N > 1 << 20 || (N & (N - 1)) !== 0 || r < 8 || r > 32 || p < 1 || p > 4) return null;
  return { N, r, p, salt: Buffer.from(m[4], "base64url"), key: Buffer.from(m[5], "base64url") };
}

export async function verifyPassword(password, parsed) {
  const got = await scrypt(String(password).normalize("NFKC"), parsed.salt, parsed.key.length, scryptOpts(parsed.N, parsed.r, parsed.p));
  return got.length === parsed.key.length && timingSafeEqual(got, parsed.key);
}

// ------------------------------------------------------------------ the server

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};
// the app's own CSP (english.html) plus what only a header can say
const APP_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const NO_OP_WORKER = `// OpenPath private demo: no offline cache (the app is only served after logging in). This removes any older worker.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister())));
`;
/** Files in the build that are never served: host configuration and build stamps. */
const HIDDEN = new Set(["/_headers", "/BUILD", "/sw.js"]);

export function configFromEnv(env = process.env) {
  const problems = [];
  const hash = parseHash(env.DEMO_PASSWORD_HASH);
  if (!hash) problems.push("DEMO_PASSWORD_HASH is missing or not a hash from scripts/demo-hash-password.mjs");
  const secret = env.DEMO_SESSION_SECRET ?? "";
  if (secret.length < 32) problems.push("DEMO_SESSION_SECRET must be at least 32 characters (for example: openssl rand -base64 48)");
  const hours = env.DEMO_SESSION_HOURS === undefined ? 168 : Number(env.DEMO_SESSION_HOURS);
  if (!(hours > 0 && hours <= 24 * 30)) problems.push("DEMO_SESSION_HOURS must be between 0 and 720");
  const dist = env.DEMO_DIST ? env.DEMO_DIST : fileURLToPath(new URL(`../${"dist-english"}`, import.meta.url));
  if (!existsSync(join(dist, "index.html"))) problems.push(`no build at ${dist}: run npm run english:build first`);
  return { problems, config: { hash, hashText: env.DEMO_PASSWORD_HASH ?? "", secret, sessionMs: hours * 3_600_000, dist, allowHttp: env.DEMO_ALLOW_HTTP === "1" } };
}

/**
 * The request handler. `now` and `log` are injectable for tests. Limits: 5 failed logins per client and 30 in total
 * per 15 minutes.
 */
export function createDemoServer(config, { now = () => Date.now(), log = (line) => console.log(line), limits = { perClient: 5, total: 30, windowMs: 15 * 60_000 } } = {}) {
  const dist = realpathSync(config.dist);
  // the signing key depends on the password hash too: a new password ends every session
  const key = createHmac("sha256", config.secret).update(`openpath-demo-session|${config.hashText}`).digest();
  const cookieName = config.allowHttp ? "openpath_demo" : "__Host-openpath_demo";
  const revoked = new Map(); // session id -> expiry
  const failures = new Map(); // client -> [times]
  let totalFailures = [];

  const sign = (payload) => createHmac("sha256", key).update(payload).digest("base64url");
  const issue = () => {
    const sid = randomBytes(18).toString("base64url");
    const exp = now() + config.sessionMs;
    const payload = Buffer.from(JSON.stringify({ sid, exp })).toString("base64url");
    return { token: `${payload}.${sign(payload)}`, exp };
  };
  const session = (req) => {
    const raw = (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!raw || raw.length > 512) return null;
    const [payload, mac] = raw.split(".");
    if (!payload || !mac) return null;
    const want = Buffer.from(sign(payload));
    const got = Buffer.from(mac);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    let body;
    try {
      body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    if (typeof body?.sid !== "string" || typeof body?.exp !== "number" || body.exp <= now() || revoked.has(body.sid)) return null;
    return body;
  };
  const cookie = (value, maxAge) => [`${cookieName}=${value}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`, ...(config.allowHttp ? [] : ["Secure"])].join("; ");

  // Render's proxy appends the client address to X-Forwarded-For: the last entry is the one a client cannot forge
  const client = (req) => (config.allowHttp ? req.socket.remoteAddress : ((req.headers["x-forwarded-for"] ?? "").split(",").pop().trim() || req.socket.remoteAddress)) ?? "unknown";
  const recent = (times) => times.filter((t) => t > now() - limits.windowMs);
  const blocked = (who) => recent(failures.get(who) ?? []).length >= limits.perClient || recent(totalFailures).length >= limits.total;
  const fail = (who) => {
    failures.set(who, [...recent(failures.get(who) ?? []), now()]);
    totalFailures = [...recent(totalFailures), now()];
    if (failures.size > 10_000) failures.clear(); // bounded memory
  };
  const prune = () => {
    for (const [sid, exp] of revoked) if (exp <= now()) revoked.delete(sid);
  };

  const base = () => ({
    "X-Content-Type-Options": "nosniff",
    // same-origin, not no-referrer: with no-referrer, browsers send "Origin: null" on our own form posts
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(config.allowHttp ? {} : { "Strict-Transport-Security": "max-age=31536000" }),
  });
  const page = (res, status, html, extra = {}) => {
    res.writeHead(status, { ...base(), "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": PAGE_CSP, ...extra });
    res.end(html);
  };
  const text = (res, status, body, extra = {}) => {
    res.writeHead(status, { ...base(), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...extra });
    res.end(body);
  };
  const sameOrigin = (req) => {
    const origin = req.headers.origin;
    const site = req.headers["sec-fetch-site"];
    if (site && site !== "same-origin") return false; // a browser telling us the post came from elsewhere
    if (!origin || origin === "null") return !origin || site === "same-origin";
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  };
  const readForm = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > 4096) {
          reject(new Error("too large"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => resolve(new URLSearchParams(Buffer.concat(chunks).toString("utf8"))));
      req.on("error", reject);
    });

  async function handle(req, res) {
    const url = new URL(req.url, "http://demo.invalid");
    const path = url.pathname;
    // HTTPS only: Render terminates TLS and says how the request arrived
    if (!config.allowHttp && req.headers["x-forwarded-proto"] === "http") {
      res.writeHead(301, { Location: `https://${req.headers.host}${path}` });
      return res.end();
    }
    if (path === "/healthz") return text(res, 200, "ok");
    if (path === "/robots.txt") return text(res, 200, "User-agent: *\nDisallow: /\n");
    if (path === "/sw.js") return text(res, 200, NO_OP_WORKER, { "Content-Type": "text/javascript; charset=utf-8" });

    if (path === "/login") {
      if (req.method === "GET" || req.method === "HEAD") {
        if (session(req)) {
          res.writeHead(303, { ...base(), Location: "/" });
          return res.end();
        }
        return page(res, 200, loginPage(url.searchParams.has("out") ? "You are logged out." : ""));
      }
      if (req.method !== "POST") return text(res, 405, "Method not allowed", { Allow: "GET, POST" });
      if (!sameOrigin(req)) return text(res, 403, "Forbidden");
      const who = client(req);
      if (blocked(who)) return page(res, 429, loginPage("Too many attempts. Wait 15 minutes and try again."), { "Retry-After": String(Math.ceil(limits.windowMs / 1000)) });
      let form;
      try {
        form = await readForm(req);
      } catch {
        return text(res, 413, "Too large");
      }
      const ok = await verifyPassword(form.get("password") ?? "", config.hash);
      if (!ok) {
        fail(who);
        return page(res, 401, loginPage("That password is not right."));
      }
      failures.delete(who);
      const s = issue();
      res.writeHead(303, { ...base(), Location: "/", "Set-Cookie": cookie(s.token, Math.floor(config.sessionMs / 1000)), "Cache-Control": "no-store" });
      return res.end();
    }

    const s = session(req);
    if (path === "/logout") {
      if (req.method === "GET" || req.method === "HEAD") {
        if (!s) {
          res.writeHead(303, { ...base(), Location: "/login" });
          return res.end();
        }
        return page(res, 200, logoutPage());
      }
      if (req.method !== "POST") return text(res, 405, "Method not allowed", { Allow: "GET, POST" });
      if (!sameOrigin(req)) return text(res, 403, "Forbidden");
      let form;
      try {
        form = await readForm(req);
      } catch {
        return text(res, 413, "Too large");
      }
      if (s) {
        prune();
        revoked.set(s.sid, s.exp);
      }
      // "cache" drops anything of the app the browser kept; "storage" also erases the demo learners on this device
      const erase = form.get("erase") === "1";
      res.writeHead(303, { ...base(), Location: "/login?out", "Set-Cookie": cookie("", 0), "Clear-Site-Data": erase ? '"cache", "storage"' : '"cache"', "Cache-Control": "no-store" });
      return res.end();
    }

    // everything else is the application: only with a session
    if (!s) {
      const navigation = req.method === "GET" && (req.headers["sec-fetch-mode"] === "navigate" || (req.headers.accept ?? "").includes("text/html"));
      if (navigation) {
        res.writeHead(303, { ...base(), Location: "/login", "Cache-Control": "no-store" });
        return res.end();
      }
      return text(res, 401, "Log in first", { "WWW-Authenticate": 'FormBased realm="OpenPath demo"' });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return text(res, 405, "Method not allowed", { Allow: "GET" });

    // no account server in this demo: the app runs on this device only (as the static build does)
    if (path.startsWith("/api/")) {
      const account = path === "/api/account/";
      res.writeHead(account ? 200 : 404, { ...base(), "Content-Type": "application/json", "Cache-Control": "no-store" });
      return res.end(JSON.stringify(account ? { authenticated: false, accounts: false } : { detail: "This demo has no account server: it works on this device only." }));
    }
    // the developer page is the same app at /developer, without a trailing slash so relative asset paths resolve
    if (path.length > 1 && path.endsWith("/") && path.startsWith("/developer")) {
      res.writeHead(301, { ...base(), Location: "/developer" });
      return res.end();
    }

    let rel;
    try {
      rel = normalize(decodeURIComponent(path));
    } catch {
      return text(res, 400, "Bad request");
    }
    let file = join(dist, rel);
    const inside = file.startsWith(dist + sep);
    const servable = inside && !HIDDEN.has(rel.replace(/\\/g, "/")) && existsSync(file) && statSync(file).isFile();
    if (!servable) {
      // a missing or hidden file is a 404; any other path is the app itself (deep links, reloads)
      if (extname(rel)) return text(res, 404, "Not found");
      file = join(dist, "index.html");
    }
    const html = file.endsWith(".html");
    res.writeHead(200, {
      ...base(),
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      // private: never kept by shared caches; the page itself is always checked (it names the current assets)
      "Cache-Control": html ? "no-store" : "private, max-age=3600",
      ...(html ? { "Content-Security-Policy": APP_CSP } : {}),
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  }

  const server = http.createServer((req, res) => {
    const t = now();
    res.on("finish", () => log(`${req.method} ${new URL(req.url, "http://demo.invalid").pathname} ${res.statusCode} ${Math.round(now() - t)}ms`));
    handle(req, res).catch(() => {
      if (!res.headersSent) text(res, 500, "Error");
      else res.destroy();
    });
  });
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;
  return server;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const shell = (title, body) => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title}</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eef2f7;color:#1c2333;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}main{width:100%;max-width:380px;background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(31,58,147,.08)}h1{font-size:1.3rem;margin:0 0 4px;color:#1f3a93}p{margin:8px 0}.small{font-size:.85rem;color:#5a6478}label{display:block;font-weight:600;margin:16px 0 6px}input{width:100%;font:inherit;padding:12px;border:2px solid #c9d3e6;border-radius:10px}input:focus{outline:none;border-color:#1f3a93}button{width:100%;min-height:48px;margin-top:16px;font:inherit;font-weight:600;border:0;border-radius:10px;background:#1f3a93;color:#fff}button.secondary{background:#fff;color:#1f3a93;border:2px solid #1f3a93}.msg{background:#fff4d6;border-radius:8px;padding:8px 12px}a{color:#1f3a93}</style></head><body><main>${body}</main></body></html>`;

function loginPage(message) {
  return shell(
    "OpenPath demo: log in",
    `<h1>OpenPath English</h1><p class="small">Private product demo for the owner. Draft content, synthetic learners only. Not for pupils.</p>
${message ? `<p class="msg" role="status">${esc(message)}</p>` : ""}
<form method="post" action="/login"><label for="password">Demo password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="200"><button type="submit">Log in</button></form>`,
  );
}

function logoutPage() {
  return shell(
    "OpenPath demo: log out",
    `<h1>Log out of the demo</h1><p class="small">Demo learners are kept in this browser on this phone until you erase them.</p>
<form method="post" action="/logout"><button type="submit">Log out</button></form>
<form method="post" action="/logout"><input type="hidden" name="erase" value="1"><button type="submit" class="secondary">Log out and erase the demo learners on this phone</button></form>
<p class="small"><a href="/">Back to the demo</a></p>`,
  );
}

// ------------------------------------------------------------------ command line

if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, config } = configFromEnv();
  if (problems.length) {
    for (const p of problems) console.error(`demo-server: ${p}`);
    console.error("demo-server: refusing to start (nothing is served without a password).");
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 10000);
  const host = process.env.HOST ?? "0.0.0.0";
  createDemoServer(config).listen(port, host, () => console.log(`OpenPath private demo on ${host}:${port}${config.allowHttp ? " (HTTP allowed: local testing only)" : ""}`));
}
