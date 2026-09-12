import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dir, "dist");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// 1. Build TypeScript code for Figma's JS sandbox
const result = await Bun.build({
  entrypoints: [join(import.meta.dir, "src/code.ts")],
  outdir: outDir,
  target: "browser",
  minify: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// 2. Copy UI HTML to dist
copyFileSync(
  join(import.meta.dir, "src/ui.html"),
  join(outDir, "ui.html")
);

console.log("✓ Figma Plugin built successfully in packages/figma-plugin/dist/");
