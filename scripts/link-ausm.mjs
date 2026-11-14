// Puts ausm in node_modules, the same way fairy cursor finds it:
//   1. AUSM_ROOT, if set
//   2. a sibling checkout: ../ausm or ../ausm-public
//   3. otherwise the published `ausm` package from npm
// A local checkout is linked, not copied, so its own node_modules, built helpers and
// .venv are used as they are. Build it first: `npm install && npm run build` in that folder.
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(here, "node_modules", "ausm");
const isCheckout = (dir) => existsSync(join(dir, "packages", "ausm", "package.json"));

const candidates = [process.env.AUSM_ROOT, join(here, "../ausm"), join(here, "../ausm-public")]
  .filter(Boolean)
  .map((p) => resolve(p));
const root = candidates.find(isCheckout);

if (root) {
  const pkg = join(root, "packages", "ausm");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(pkg, target, "dir");
  console.log(`[ausm] using the local checkout at ${root}`);
  if (!existsSync(join(pkg, "dist"))) {
    console.warn(`[ausm] ${root} isn't built yet. run: (cd "${root}" && npm install && npm run build)`);
  }
} else if (process.env.AUSM_LINKING !== "1") {
  // a link left over from an earlier local checkout would shadow the npm package
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) rmSync(target);
  console.log("[ausm] no local checkout found, installing ausm from npm");
  execSync("npm install --no-save ausm@^0.1.0", {
    cwd: here,
    stdio: "inherit",
    env: { ...process.env, AUSM_LINKING: "1" },
  });
}
