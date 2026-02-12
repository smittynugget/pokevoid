import path from "path";
import fs from "fs";
import crypto from "crypto";
import { type Plugin as VitePlugin } from "vite";

function walkDir(dir: string, basePath: string, result: Record<string, string>): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, basePath, result);
    } else {
      const relativePath = "/" + path.relative(basePath, fullPath).replace(/\\/g, "/");
      const hash = crypto.createHash("md5");
      hash.update(fs.readFileSync(fullPath));
      result[relativePath] = hash.digest("hex").slice(0, 10);
    }
  }
}

export function assetManifestPlugin(): VitePlugin {
  let buildDir = "dist";

  return {
    name: "pokevoid-asset-manifest",
    apply: "build",
    configResolved(config) {
      buildDir = config.build.outDir;
    },
    async closeBundle() {
      console.log("Generating asset manifest...");
      const manifest: Record<string, string> = {};
      walkDir(buildDir, buildDir, manifest);
      const manifestData = JSON.stringify({ manifest }, null, 0);
      fs.writeFileSync(path.join(buildDir, "manifest.json"), manifestData, "utf-8");
      console.log(`Asset manifest generated: ${Object.keys(manifest).length} entries`);
    },
  };
}