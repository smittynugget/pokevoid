import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pokevoid.app",
  appName: "PokéVoid",
  webDir: "dist",
  server: { androidScheme: "https" },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      updateUrl: "https://smittynugget.github.io/pokevoid/capacitor-update.json",
      maxVersions: 2,
    },
  },
};

export default config;
