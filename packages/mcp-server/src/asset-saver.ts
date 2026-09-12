import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import type { ExportedAsset } from "../../shared/src/types";

export async function saveAssetsToDisk(
  assets: ExportedAsset[],
  targetDirParam?: string
): Promise<string[]> {
  if (!assets || assets.length === 0) return [];

  const cwd = process.cwd();
  const defaultDir = join(cwd, "src", "assets");
  const targetDir = targetDirParam
    ? isAbsolute(targetDirParam)
      ? targetDirParam
      : join(cwd, targetDirParam)
    : defaultDir;

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const savedPaths: string[] = [];

  for (const asset of assets) {
    if (!asset.dataBase64) continue;

    try {
      const fileName = `${asset.name}.${asset.format}`;
      const filePath = join(targetDir, fileName);
      const buffer = Buffer.from(asset.dataBase64, "base64");

      await Bun.write(filePath, buffer);
      
      const relPath = relative(cwd, filePath);
      savedPaths.push(relPath.startsWith(".") ? relPath : `./${relPath}`);
    } catch (err) {
      console.error(`[Figma Live Bridge] Failed to save asset ${asset.name}:`, err);
    }
  }

  return savedPaths;
}
