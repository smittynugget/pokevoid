declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        };
      };
    };
  }
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: GoogleTokenError) => void;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

interface GoogleTokenError {
  type: string;
  message?: string;
}

export interface DriveAuthState {
  connected: boolean;
  accessToken: string | null;
  tokenExpiryMs: number | null;
  googleEmail: string | null;
}

const DRIVE_CONNECTED_KEY = "drive_connected";
const DRIVE_ACCESS_TOKEN_KEY = "drive_access_token";
const DRIVE_TOKEN_EXPIRY_KEY = "drive_token_expiry";
const DRIVE_GOOGLE_EMAIL_KEY = "drive_google_email";
const DRIVE_LAST_SYNC_KEY = "drive_last_sync";
const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

let driveAuthState: DriveAuthState = {
  connected: false,
  accessToken: null,
  tokenExpiryMs: null,
  googleEmail: null,
};

let tokenClient: GoogleTokenClient | null = null;
let connectInFlight: Promise<{ success: boolean; error?: string }> | null = null;
let ensureInFlight: Promise<string | null> | null = null;
let driveAuthReadyResolve: (() => void) | null = null;
const driveAuthReadyPromise: Promise<void> = new Promise((resolve) => {
  driveAuthReadyResolve = resolve;
});

export function waitForDriveAuth(): Promise<void> {
  return driveAuthReadyPromise;
}

export function isDriveConnected(): boolean {
  return driveAuthState.connected && !!driveAuthState.accessToken;
}

export function getLastSyncLabel(): string | null {
  const raw = localStorage.getItem(DRIVE_LAST_SYNC_KEY);
  if (!raw) return null;
  const date = new Date(parseInt(raw, 10));
  return date.toLocaleString();
}

export function setLastSyncTime(): void {
  localStorage.setItem(DRIVE_LAST_SYNC_KEY, String(Date.now()));
}

export function hydrateDriveAuthFromStorage(): void {
  const connected = localStorage.getItem(DRIVE_CONNECTED_KEY) === "1";
  localStorage.removeItem(DRIVE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(DRIVE_GOOGLE_EMAIL_KEY);
  driveAuthState = {
    connected,
    accessToken: null,
    tokenExpiryMs: null,
    googleEmail: null,
  };
}

function persistDriveAuthState(state: DriveAuthState): void {
  if (state.connected) {
    localStorage.setItem(DRIVE_CONNECTED_KEY, "1");
  } else {
    localStorage.removeItem(DRIVE_CONNECTED_KEY);
  }
  driveAuthState = state;
}

function waitForGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const deadline = Date.now() + 10000;
    const tick = (): void => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("GIS script did not load"));
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

export async function initDriveAuth(): Promise<void> {
  hydrateDriveAuthFromStorage();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId || !navigator.onLine) {
    driveAuthReadyResolve?.();
    return;
  }
  try {
    await waitForGis();
    let initSettled = false;
    const settleInit = () => {
      if (!initSettled) {
        initSettled = true;
        driveAuthReadyResolve?.();
      }
    };
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_APPDATA_SCOPE,
      callback: (response) => {
        persistDriveAuthState({
          connected: true,
          accessToken: response.access_token,
          tokenExpiryMs: Date.now() + response.expires_in * 1000,
          googleEmail: driveAuthState.googleEmail,
        });
        settleInit();
      },
      error_callback: () => {
        if (driveAuthState.connected && !driveAuthState.accessToken) {
          persistDriveAuthState({ connected: false, accessToken: null, tokenExpiryMs: null, googleEmail: null });
        }
        settleInit();
      },
    });
    if (driveAuthState.connected) {
      tokenClient.requestAccessToken({ prompt: "" });
      window.setTimeout(settleInit, 8000);
    } else {
      settleInit();
    }
  } catch {
    driveAuthReadyResolve?.();
  }
}

export function connectGoogleDrive(): Promise<{ success: boolean; error?: string }> {
  if (connectInFlight) return connectInFlight;
  connectInFlight = new Promise(async (resolve) => {
    const finalize = (result: { success: boolean; error?: string }) => {
      connectInFlight = null;
      resolve(result);
    };
    if (ensureInFlight) {
      await ensureInFlight;
    }
    if (!tokenClient) {
      await initDriveAuth();
    }
    if (!tokenClient) {
      finalize({ success: false, error: "GIS unavailable" });
      return;
    }
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
      scope: DRIVE_APPDATA_SCOPE,
      callback: (response) => {
        persistDriveAuthState({
          connected: true,
          accessToken: response.access_token,
          tokenExpiryMs: Date.now() + response.expires_in * 1000,
          googleEmail: driveAuthState.googleEmail,
        });
        finalize({ success: true });
      },
      error_callback: (error) => finalize({ success: false, error: error.type }),
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
  return connectInFlight;
}

export function disconnectGoogleDrive(): void {
  const token = driveAuthState.accessToken;
  if (token) {
    fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(token)}`
    }).catch(() => {});
  }
  persistDriveAuthState({ connected: false, accessToken: null, tokenExpiryMs: null, googleEmail: null });
  localStorage.removeItem(DRIVE_LAST_SYNC_KEY);
  localStorage.removeItem(DRIVE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(DRIVE_GOOGLE_EMAIL_KEY);
}

export async function ensureDriveToken(): Promise<string | null> {
  if (!driveAuthState.connected) return null;
  const bufferMs = 5 * 60 * 1000;
  if (driveAuthState.accessToken && driveAuthState.tokenExpiryMs && (driveAuthState.tokenExpiryMs - Date.now()) > bufferMs) {
    return driveAuthState.accessToken;
  }
  if (connectInFlight) {
    await connectInFlight;
  }
  if (ensureInFlight) return ensureInFlight;
  ensureInFlight = new Promise(async (resolve) => {
    if (!tokenClient) {
      await initDriveAuth();
    }
    if (!tokenClient) {
      resolve(null);
      ensureInFlight = null;
      return;
    }
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        driveAuthState = { ...driveAuthState, connected: false, accessToken: null };
        resolve(null);
        ensureInFlight = null;
      }
    }, 10000);
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
      scope: DRIVE_APPDATA_SCOPE,
      callback: (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        persistDriveAuthState({
          connected: true,
          accessToken: response.access_token,
          tokenExpiryMs: Date.now() + response.expires_in * 1000,
          googleEmail: driveAuthState.googleEmail,
        });
        resolve(response.access_token);
        ensureInFlight = null;
      },
      error_callback: () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(null);
        ensureInFlight = null;
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
  return ensureInFlight;
}