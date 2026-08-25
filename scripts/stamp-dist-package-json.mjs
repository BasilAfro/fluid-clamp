// Marks each dist output directory with the module system tsc compiled it
// for, since the package root has no top-level "type" field.
//
// `sideEffects` is repeated here rather than left to the root package.json:
// bundlers read that flag from the package.json *nearest* the module being
// resolved, so these files would shadow the root's `sideEffects: false` and
// fall back to "assume side effects" — silently disabling tree-shaking for the
// very build (dist/esm) bundlers actually consume. Every module here only
// declares functions and builds plain objects at import time, so the flag is
// accurate.
import { writeFileSync } from "node:fs";

const stamp = (dir, type) =>
  writeFileSync(
    `dist/${dir}/package.json`,
    JSON.stringify({ type, sideEffects: false }, null, 2) + "\n",
  );

stamp("cjs", "commonjs");
stamp("esm", "module");
