// ausm comes from npm (`@ausm/ausm` in package.json). To run against a local checkout
// instead, set AUSM_ROOT to it before `npm install`:
//   AUSM_ROOT=../ausm npm install
// The checkout is linked, not copied, so its own node_modules, built helpers and .venv are
// used as they are. Build it first: `npm install && npm run build` in that folder.
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(here, "node_modules", "@ausm", "ausm");

if (process.env.AUSM_ROOT) {
  const root = resolve(process.env.AUSM_ROOT);
  const pkg = join(root, "packages", "ausm");
  if (!existsSync(join(pkg, "package.json"))) {
    console.error(`[ausm] AUSM_ROOT=${root} is not an ausm checkout (no packages/ausm)`);
    process.exit(1);
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(pkg, target, "dir");
  console.log(`[ausm] using the local checkout at ${root}`);
  if (!existsSync(join(pkg, "dist"))) {
    console.warn(`[ausm] ${root} isn't built yet. run: (cd "${root}" && npm install && npm run build)`);
  }
}
