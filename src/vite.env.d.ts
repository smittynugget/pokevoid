/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PORT?: string;
    readonly VITE_BYPASS_LOGIN?: string;
    readonly VITE_BYPASS_TUTORIAL?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_SERVER_URL?: string;
    readonly VITE_DISCORD_CLIENT_ID?: string;
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_I18N_DEBUG?: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
