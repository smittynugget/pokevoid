import { ensureDriveToken, setLastSyncTime } from "./drive-auth";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const SAVE_FILENAME = "pokevoid_save.prsv";
const META_FILENAME = "pokevoid_meta.json";

interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface DriveSaveMeta {
  fileId: string;
  modifiedTime: string;
  systemTimestamp: number;
  gameVersion: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function getBodyExcerpt(res: Response, limit: number): Promise<string> {
  try {
    const text = await res.clone().text();
    if (!text) return "";
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  } catch {
    return "";
  }
}

async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await ensureDriveToken();
  if (!token) throw new Error("No Drive token");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;

      const retryable = res.status === 429 || (res.status >= 500 && res.status <= 504);
      if (retryable && attempt < maxAttempts - 1) {
        const retryAfterHeader = res.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
        const baseDelay = 1000 * Math.pow(2, attempt);
        const delay = Number.isFinite(retryAfterSeconds) ? (retryAfterSeconds * 1000) : baseDelay;
        await sleep(Math.min(delay, 10000));
        continue;
      }

      const body = await getBodyExcerpt(res, 512);
      console.warn(`[Drive] Request failed ${res.status} ${res.statusText}: ${url}${body ? ` | ${body}` : ""}`);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < maxAttempts - 1) {
        const baseDelay = 1000 * Math.pow(2, attempt);
        await sleep(Math.min(baseDelay, 10000));
        continue;
      }
      console.warn(`[Drive] Request error: ${url}`, err);
      throw err;
    }
  }
  return fetch(url, { ...options, headers });
}

async function findFile(name: string): Promise<DriveFileMeta | null> {
  const q = encodeURIComponent(`name='${name}' and 'appDataFolder' in parents and trashed=false`);
  const res = await driveRequest(`${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function getDriveSaveMeta(): Promise<DriveSaveMeta | null> {
  const metaFile = await findFile(META_FILENAME);
  if (!metaFile) return null;
  const res = await driveRequest(`${DRIVE_API_BASE}/files/${metaFile.id}?alt=media`);
  if (!res.ok) return null;
  const meta = await res.json();
  return {
    fileId: metaFile.id,
    modifiedTime: metaFile.modifiedTime,
    systemTimestamp: meta.systemTimestamp || Date.parse(metaFile.modifiedTime),
    gameVersion: meta.gameVersion || "",
  };
}

export async function downloadDriveSave(): Promise<string | null> {
  const saveFile = await findFile(SAVE_FILENAME);
  if (!saveFile) return null;
  const res = await driveRequest(`${DRIVE_API_BASE}/files/${saveFile.id}?alt=media`);
  if (!res.ok) return null;
  return res.text();
}

export async function uploadDriveSave(payload: string, systemTimestamp: number, gameVersion: string): Promise<boolean> {
  try {
    const existingSave = await findFile(SAVE_FILENAME);
    const existingMeta = await findFile(META_FILENAME);

    if (existingSave) {
      const res = await driveRequest(`${DRIVE_UPLOAD_BASE}/files/${existingSave.id}?uploadType=media`, {
        method: "PATCH",
        headers: { "Content-Type": "text/plain" },
        body: payload,
      });
      if (!res.ok) return false;
    } else {
      const metadata = JSON.stringify({ name: SAVE_FILENAME, parents: ["appDataFolder"] });
      const boundary = "pokevoid_boundary";
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\n${payload}\r\n--${boundary}--`;
      const res = await driveRequest(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      });
      if (!res.ok) return false;
    }

    const metaPayload = JSON.stringify({ systemTimestamp, gameVersion, lastSync: Date.now() });
    const uploadMeta = async (): Promise<boolean> => {
      if (existingMeta) {
        const metaRes = await driveRequest(`${DRIVE_UPLOAD_BASE}/files/${existingMeta.id}?uploadType=media`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: metaPayload,
        });
        return metaRes.ok;
      }
      const metadata = JSON.stringify({ name: META_FILENAME, parents: ["appDataFolder"] });
      const boundary = "pokevoid_meta_boundary";
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${metaPayload}\r\n--${boundary}--`;
      const metaRes = await driveRequest(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      });
      return metaRes.ok;
    };

    let metaOk = await uploadMeta();
    if (!metaOk) {
      await new Promise((r) => setTimeout(r, 1000));
      metaOk = await uploadMeta();
    }
    if (!metaOk) return false;

    setLastSyncTime();
    return true;
  } catch {
    return false;
  }
}