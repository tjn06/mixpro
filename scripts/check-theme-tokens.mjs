/**
 * Fails if src/app code imports legacy theme.colors / borders / surfaces.
 * App UI must use componentTokens via src/app/ui/tokens.ts.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP_DIR = join(ROOT, "src", "app");

const FORBIDDEN = [
  /\btheme\.colors\b/,
  /\btheme\.borders\b/,
  /\btheme\.surfaces\b/,
  /const\s*\{\s*[^}]*\bcolors\s*:/,
  /const\s*\{\s*[^}]*\bborders\s*:/,
  /const\s*\{\s*[^}]*\bsurfaces\s*:/,
  /import\s*\{\s*themeColors\b/,
  /import\s*\{\s*themeBorders\b/,
  /import\s*\{\s*themeSurfaces\b/,
  /componentTokens\.(text|state|recipeMeta|dropdown|mixerSwipe|bucket|lockedAction|headerIconButton|sheetFooterButton|fieldInput|shareBar|loadSheetStrip|loadSheetList|featureReadout|extraBatch|app)\./,
];

const ALLOWLIST = new Set(["ui/tokens.ts"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules") continue;
      walk(path, files);
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

const violations = [];

for (const file of walk(APP_DIR)) {
  const rel = relative(join(ROOT, "src", "app"), file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;

  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("//")) continue;
    if (line.includes("@legacy-theme-ok")) continue;

    for (const pattern of FORBIDDEN) {
      if (pattern.test(line)) {
        violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        break;
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "Legacy theme API or compile-time color token usage in src/app (use cv / themeColorVar instead):\n",
  );
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("Token API check passed.");
