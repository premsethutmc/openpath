/** Pool-selector registry and offline-research import boundary. Shared by Node CI and Bun. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");

export const REGISTERED_SELECTORS = ["frontend/src/curriculum/TeachingContent.tsx", "frontend/src/learning/adaptive-loop.ts", "frontend/src/review/Main.tsx", "packages/learning/src/compiler.ts",
      // deep-recovery.ts: added in a reviewed change (deep-select@1, research, off by default). Every question it chooses passes selectable(),
      // keyboardOffered(), the grade ceiling and, after teaching, the taught method; see frontend/src/journey/deep-select.test.ts
      "packages/learning/src/deep-recovery.ts",
      "packages/learning/src/exact/verify.ts",
      // gated-mastery.ts: added in a reviewed change (M1, shadow only). proposedRetentionPlan reads phasePool (which applies selectable()) for
      // a due sub-skill's delayed-check items; it is never read by the engine, the plan or the app (the module's own selector is unchanged)
      "packages/learning/src/gated-mastery.ts",
      // hypotheses.ts: added in a reviewed change (Milestone 2). Its only selector, discriminatingProbe, applies selectable(), formCertified() and
      // the grade ceiling, and its result is asked only through moduleState; see "hypotheses.ts resolution probes pass the eligibility gate".
      "packages/learning/src/hypotheses.ts",
      // index.ts only re-exports the existing filtered pool API; the AST check also inventories re-exports.
      "packages/learning/src/index.ts",
      "packages/learning/src/intervention.ts",
      // lesson-checks.ts: added in a reviewed change (lesson-checks@1, report only). pageCandidates reads modulePhasePool (phasePool applies
      // selectable()) to rebuild the lesson page's practice candidates exactly as TeachingContent.tsx does; nothing it returns is served
      "packages/learning/src/lesson-checks.ts",
      "packages/learning/src/library.ts", "packages/learning/src/reasoning.ts", "packages/learning/src/spec.ts"];

export const SOURCE_ROOTS = ["packages/learning/src", "packages/mathematics/src", "frontend/src"];
const SELECTORS = new Set(["pool", "phasePool", "variantsOf", "modulePhasePool", "fromPool"]);
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TEST = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const OFFLINE = "research/deep-recovery/";
const POSIX = (p) => p.replaceAll("\\", "/");

function sourceFiles(root, dirs) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "node_modules") walk(path); }
      else if (SOURCE.test(path) && !TEST.test(path) && !/\.d\.ts$/.test(path)) out.push(path);
    }
  };
  dirs.forEach((dir) => walk(join(root, dir)));
  return out;
}

/** AST imports include aliases, re-exports, namespace imports, require() and dynamic import(). */
export function importsOf(text, file = "source.ts") {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = [];
  const add = (specifier, selectors = false) => imports.push({ specifier, selectors });
  const selected = (elements) => elements?.some((e) => !e.isTypeOnly && SELECTORS.has((e.propertyName ?? e.name).text)) ?? false;
  const poolModule = (s) => {
    if (/(?:^|\/)(?:families|library|intervention)(?:\.[cm]?[jt]s)?$/.test(s)) return true;
    // The existing public learning barrel re-exports fromPool. A namespace or dynamic caller of it also needs review.
    const path = POSIX(resolve(dirname(file), s)).replace(/\.[cm]?[jt]s$/, "");
    return /\/packages\/learning\/src(?:\/index)?$/.test(path);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly) return;
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      add(specifier, bindings && (ts.isNamedImports(bindings) ? selected(bindings.elements) : poolModule(specifier)));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
      const specifier = node.moduleSpecifier.text;
      add(specifier, node.exportClause && ts.isNamedExports(node.exportClause) ? selected(node.exportClause.elements) : poolModule(specifier));
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) {
      const specifier = node.moduleReference.expression?.text;
      add(specifier ?? null, specifier ? poolModule(specifier) : false);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      const argument = node.arguments[0];
      const specifier = argument && (ts.isStringLiteralLike(argument)) ? argument.text : null;
      add(specifier, specifier ? poolModule(specifier) : false);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return imports;
}

/** Scan every application module, plus local runtime dependencies, not just the default entrypoint. */
export function inspectSelectionBoundary(root, dirs = SOURCE_ROOTS) {
  root = resolve(root);
  const todo = sourceFiles(root, dirs), seen = new Set(), readers = new Set(), violations = [];
  const options = { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true, resolveJsonModule: true };
  // Respect frontend aliases if future code introduces them, rather than allowing an alias to hide research imports.
  const configPath = join(root, "frontend/tsconfig.json");
  if (existsSync(configPath)) {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    Object.assign(options, ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath)).options);
  }
  while (todo.length) {
    const file = todo.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const from = POSIX(relative(root, file));
    for (const item of importsOf(readFileSync(file, "utf8"), file)) {
      if (item.selectors) readers.add(from);
      if (item.specifier === null) {
        violations.push(`${from}: non-literal runtime import cannot be checked`);
        continue;
      }
      const target = ts.resolveModuleName(item.specifier, file, options, ts.sys).resolvedModule?.resolvedFileName;
      if (!target) {
        // Bundlers also import CSS and other assets. They are not runtime code, but must exist.
        const asset = resolve(dirname(file), item.specifier);
        if (item.specifier.startsWith(".") && /\.[^/]+$/.test(item.specifier) && !SOURCE.test(asset) && existsSync(asset)) continue;
        if (item.specifier.startsWith(".")) violations.push(`${from}: unresolved local import ${item.specifier}`);
        continue; // external modules without types are not source dependencies
      }
      const to = POSIX(relative(root, target));
      if (to.startsWith(OFFLINE) || TEST.test(to)) {
        violations.push(`${from} -> ${to}`);
      } else if (!to.startsWith("../") && !to.includes("node_modules/") && SOURCE.test(target) && !/\.d\.ts$/.test(target)) {
        todo.push(target);
      }
    }
  }
  return { readers: [...readers].sort(), violations: [...new Set(violations)].sort() };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectSelectionBoundary(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  const expected = [...REGISTERED_SELECTORS].sort();
  const unregistered = result.readers.filter((path) => !expected.includes(path));
  const stale = expected.filter((path) => !result.readers.includes(path));
  if (unregistered.length || stale.length || result.violations.length) {
    console.error(JSON.stringify({ unregistered, stale, violations: result.violations }, null, 2));
    process.exitCode = 1;
  } else console.log(`Question selection boundary passed: ${result.readers.length} registered readers, no offline research or test imports.`);
}
