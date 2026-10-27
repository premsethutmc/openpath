import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
async function tryNext(spec, ctx, next) {
  const r = await next(spec, ctx);
  if (r.url.endsWith(".json")) return { ...r, importAttributes: { ...(ctx.importAttributes||{}), type: "json" } };
  return r;
}
export async function resolve(spec, ctx, next) {
  if (spec.endsWith(".json")) ctx = { ...ctx, importAttributes: { ...(ctx.importAttributes||{}), type: "json" } };
  try { return await tryNext(spec, ctx, next); }
  catch (e) {
    if (spec.startsWith(".") || spec.startsWith("/")) {
      const base = spec.replace(/\\.js$/, "");
      for (const ext of [".ts", "/index.ts"]) { try { return await next(base + ext, ctx); } catch {} }
    }
    throw e;
  }
}`));
