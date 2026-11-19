import * as fs from "fs";
import * as path from "path";

function parseEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function applyEnvFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const parsed = parseEnv(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

/** The ausm repo root when node_modules/@ausm/ausm is a link into a local checkout. */
function localAusmRoot(): string[] {
  try {
    const pkg = fs.realpathSync(require.resolve("@ausm/ausm/package.json"));
    const root = path.resolve(path.dirname(pkg), "../..");
    return fs.existsSync(path.join(root, "packages/ausm")) ? [root] : [];
  } catch {
    return [];
  }
}

/** Load .env from this repo, then from the local ausm checkout, without overriding existing env vars. */
export function loadAusmEnv(): void {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, "../../.env"),
    // a local ausm checkout (linked by scripts/link-ausm.mjs) keeps its .env at its root
    ...localAusmRoot().map((root) => path.join(root, ".env")),
  ];
  const seen = new Set<string>();
  for (const file of candidates) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (applyEnvFile(resolved)) {
      console.log(`[Main] Loaded env from ${resolved}`);
    }
  }
}

loadAusmEnv();
