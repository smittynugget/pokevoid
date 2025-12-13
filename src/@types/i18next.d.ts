import { type enConfig } from "#app/locales/en/config.js";
import { TOptions } from "i18next";
declare module "i18next" {
    interface CustomTypeOptions {
      defaultNS: "menu",
      resources: typeof enConfig
    }

    interface TFunction {
      (
        key: string | string[],
        options?: TOptions & Record<string, unknown>
      ): string;
    }
  }