import path from "path";
import fs from "fs";
import { type Plugin as VitePlugin } from "vite";
function applyToDir(dir: string, recursive?: boolean) {
  const files = fs.readdirSync(dir).filter((file) => !/^\..*/.test(file));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory() && recursive) {
      applyToDir(filePath, recursive);
    } else if (path.extname(file) === ".json") {
      const contents = fs.readFileSync(filePath, "utf8");
      const minifiedContent = JSON.stringify(JSON.parse(contents));

      fs.writeFileSync(filePath, minifiedContent, "utf8");
    }
  }
}
export function minifyJsonPlugin(basePath: string | string[], recursive?: boolean): VitePlugin {
  let buildDir = "dist";

  return {
    name: "flx-minify-json",
    apply: "build",
    configResolved(config) {
      buildDir = config.build.outDir;
    },
    async closeBundle() {
      console.log("Minifying JSON files...");
      const basePathes = Array.isArray(basePath) ? basePath : [basePath];

      basePathes.forEach((basePath) => {
        const baseDir = path.resolve(buildDir, basePath);
        if (fs.existsSync(baseDir)) {
          applyToDir(baseDir, recursive);
        } else {
          console.error(`Path ${baseDir} does not exist!`);
        }
      });
      console.log("Finished minifying JSON files!");
    },
  };
}