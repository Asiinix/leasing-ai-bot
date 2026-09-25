import { build } from "esbuild";
import * as sass from "sass";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const vendor = path.join(root, "vendor/bcc-design");
const styleSources = new Set();

await build({
  absWorkingDir: vendor,
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  packages: "external",
  banner: { js: '"use client";' },
  logOverride: { "direct-eval": "silent" },
  plugins: [
    {
      name: "bcc-scss",
      setup(builder) {
        builder.onLoad({ filter: /\.scss$/ }, ({ path: filename }) => {
          const result = sass.compile(filename, { logger: sass.Logger.silent });
          result.loadedUrls.forEach((url) =>
            styleSources.add(path.relative(vendor, fileURLToPath(url))),
          );
          return { contents: result.css, loader: "css", resolveDir: path.dirname(filename) };
        });
      },
    },
  ],
});

// Upstream publishes declarations without diagnostics. App consumers remain strictly checked.
execFileSync(
  process.execPath,
  [path.join(root, "node_modules/typescript/bin/tsc"), "-p", path.join(vendor, "tsconfig.json")],
  { stdio: "inherit" },
);
writeFileSync(
  path.join(vendor, "dist/style-sources.json"),
  JSON.stringify([...styleSources].sort(), null, 2) + "\n",
);
console.log("BCC Design runtime and declarations built.");
