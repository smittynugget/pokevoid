import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { createHash } from "crypto";
import AdmZip from "adm-zip";

const UPDATE_MANIFEST_URL = "https://smittynugget.github.io/pokevoid/electron-update.json";
const VERSIONS_DIR_NAME = "web-versions";
const CURRENT_VERSION_FILE = "current-version.txt";

interface UpdateManifest {
  version: string;
  url: string;
  sha256: string;
  size: number;
}

function getVersionsDir(): string {
  return path.join(app.getPath("userData"), VERSIONS_DIR_NAME);
}

function getCurrentVersionFile(): string {
  return path.join(app.getPath("userData"), CURRENT_VERSION_FILE);
}

export function getActiveWebDir(bundledWebDir: string): string {
  const versionFile = getCurrentVersionFile();
  if (fs.existsSync(versionFile)) {
    const currentVersion = fs.readFileSync(versionFile, "utf-8").trim();
    const versionDir = path.join(getVersionsDir(), currentVersion);
    if (fs.existsSync(path.join(versionDir, "index.html"))) {
      return versionDir;
    }
  }
  return bundledWebDir;
}

export async function checkForWebUpdate(
  bundledWebDir: string
): Promise<{ updated: boolean; version: string } | null> {
  const manifest = await fetchManifest();
  if (!manifest) return null;

  const currentVersion = getCurrentVersion();
  if (currentVersion === manifest.version) return null;

  const versionsDir = getVersionsDir();
  fs.mkdirSync(versionsDir, { recursive: true });

  const stagingDir = path.join(versionsDir, `staging-${manifest.version}`);
  const targetDir = path.join(versionsDir, manifest.version);
  const zipPath = path.join(stagingDir, "update.zip");

  try {
    fs.mkdirSync(stagingDir, { recursive: true });
    await downloadFile(manifest.url, zipPath);

    const hash = createHash("sha256");
    hash.update(fs.readFileSync(zipPath));
    if (hash.digest("hex") !== manifest.sha256) {
      throw new Error("SHA256 mismatch");
    }

    const zip = new AdmZip(zipPath);
    for (const entry of zip.getEntries()) {
      if (entry.entryName.includes("..") || path.isAbsolute(entry.entryName)) {
        throw new Error(`Unsafe path in zip: ${entry.entryName}`);
      }
    }
    zip.extractAllTo(targetDir, true);

    if (!fs.existsSync(path.join(targetDir, "index.html"))) {
      throw new Error("Extracted update missing index.html");
    }

    fs.writeFileSync(getCurrentVersionFile(), manifest.version);
    fs.rmSync(stagingDir, { recursive: true, force: true });
    cleanupOldVersions(manifest.version);

    return { updated: true, version: manifest.version };
  } catch (error) {
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
    throw error;
  }
}

function getCurrentVersion(): string | null {
  const versionFile = getCurrentVersionFile();
  return fs.existsSync(versionFile)
    ? fs.readFileSync(versionFile, "utf-8").trim()
    : null;
}

async function fetchManifest(): Promise<UpdateManifest | null> {
  return new Promise((resolve) => {
    const req = https.get(UPDATE_MANIFEST_URL, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleRedirects = (currentUrl: string, redirectCount: number = 0) => {
      if (redirectCount > 5) { reject(new Error("Too many redirects")); return; }
      const protocol = currentUrl.startsWith("https") ? https : require("http");
      const req = protocol.get(currentUrl, (res: any) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          handleRedirects(res.headers.location, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      });
      req.on("error", reject);
      req.setTimeout(300000, () => { req.destroy(); reject(new Error("Timeout")); });
    };
    handleRedirects(url);
  });
}

function cleanupOldVersions(currentVersion: string): void {
  const versionsDir = getVersionsDir();
  if (!fs.existsSync(versionsDir)) return;
  const dirs = fs.readdirSync(versionsDir)
    .filter((d) => !d.startsWith("staging-") && d !== currentVersion)
    .map((d) => ({ name: d, path: path.join(versionsDir, d), mtime: fs.statSync(path.join(versionsDir, d)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  for (let i = 1; i < dirs.length; i++) {
    try { fs.rmSync(dirs[i].path, { recursive: true, force: true }); } catch {}
  }
}
