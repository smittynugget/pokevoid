import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import processor, { KoreanPostpositionProcessor } from "i18next-korean-postposition-processor";
import { deConfig } from "#app/locales/de/config.js";
import { enConfig } from "#app/locales/en/config.js";
import { esConfig } from "#app/locales/es/config.js";
import { frConfig } from "#app/locales/fr/config.js";
import { itConfig } from "#app/locales/it/config.js";
import { koConfig } from "#app/locales/ko/config.js";
import { jaConfig } from "#app/locales/ja/config.js";
import { ptBrConfig } from "#app/locales/pt_BR/config.js";
import { ruConfig } from "#app/locales/ru/config.js";
import { zhCnConfig } from "#app/locales/zh_CN/config.js";
import { zhTwConfig } from "#app/locales/zh_TW/config.js";

interface LoadingFontFaceProperty {
  face: FontFace,
  extraOptions?: { [key:string]: any },
  only?: Array<string>
}

const unicodeRanges = {
  fullwidth: "U+FF00-FFEF",
  hangul: "U+1100-11FF,U+3130-318F,U+A960-A97F,U+AC00-D7AF,U+D7B0-D7FF",
  kana: "U+3040-30FF",
  CJKCommon: "U+2E80-2EFF,U+3000-303F,U+31C0-31EF,U+3200-32FF,U+3400-4DBF,U+F900-FAFF,U+FE30-FE4F",
  CJKIdeograph: "U+4E00-9FFF",
  cyrillic: "U+0400-04FF,U+0500-052F",
  specialCharacters: "U+266A,U+2605,U+2665,U+2663"
};
const rangesByLanguage = {
  korean: [unicodeRanges.CJKCommon, unicodeRanges.hangul].join(","),
  chinese: [unicodeRanges.CJKCommon, unicodeRanges.fullwidth, unicodeRanges.CJKIdeograph].join(","),
  japanese: [unicodeRanges.CJKCommon, unicodeRanges.fullwidth, unicodeRanges.kana, unicodeRanges.CJKIdeograph].join(",")
};

const fonts: Array<LoadingFontFaceProperty> = [

  {
    face: new FontFace("emerald", "url(./fonts/PokePT_Wansung.woff2)", { unicodeRange: unicodeRanges.specialCharacters }),
  },
  {
    face: new FontFace("pkmnems", "url(./fonts/PokePT_Wansung.woff2)", { unicodeRange: unicodeRanges.specialCharacters }),
    extraOptions: { sizeAdjust: "133%" },
  },

  {
    face: new FontFace("emerald", "url(./fonts/PokePT_Wansung.woff2)", { unicodeRange: rangesByLanguage.korean }),
  },
  {
    face: new FontFace("pkmnems", "url(./fonts/PokePT_Wansung.woff2)", { unicodeRange: rangesByLanguage.korean }),
    extraOptions: { sizeAdjust: "133%" },
  },

  {
    face: new FontFace("emerald", "url(./fonts/unifont-15.1.05.subset.woff2)", { unicodeRange: rangesByLanguage.chinese }),
    extraOptions: { sizeAdjust: "70%", format: "woff2" },
    only: [ "en", "es", "fr", "it", "de", "zh", "pt", "ko" ],
  },
  {
    face: new FontFace("pkmnems", "url(./fonts/unifont-15.1.05.subset.woff2)", { unicodeRange: rangesByLanguage.chinese }),
    extraOptions: { format: "woff2" },
    only: [ "en", "es", "fr", "it", "de", "zh", "pt", "ko"],
  },
  {
    face: new FontFace("emerald", "url(./fonts/unifont-15.1.05.otf)", { unicodeRange: unicodeRanges.cyrillic }),
    extraOptions: { sizeAdjust: "70%", format: "opentype" },
    only: [ "ru" ],
  },
  {
    face: new FontFace("pkmnems", "url(./fonts/unifont-15.1.05.otf)", { unicodeRange: unicodeRanges.cyrillic }),
    extraOptions: { format: "opentype" },
    only: [ "ru" ],
  },

  {
    face: new FontFace("emerald", "url(./fonts/Galmuri11.subset.woff2)", { unicodeRange: rangesByLanguage.japanese }),
    extraOptions: { sizeAdjust: "66%" },
    only: [ "ja" ],
  },
  {
    face: new FontFace("pkmnems", "url(./fonts/Galmuri9.subset.woff2)", { unicodeRange: rangesByLanguage.japanese }),
    only: [ "ja" ],
  },
];

async function initFonts(language: string | undefined) {
  const results = await Promise.allSettled(
    fonts
      .filter(font => !font.only || font.only.some(exclude => language?.indexOf(exclude) === 0))
      .map(font => Object.assign(font.face, font.extraOptions ?? {}).load())
  );
  for (const result of results) {
    if (result.status === "fulfilled") {
      document.fonts?.add(result.value);
    } else {
      console.error(result.reason);
    }
  }
}

export async function initI18n(): Promise<void> {

  if (isInitialized) {
    return;
  }
  isInitialized = true;
  i18next.use(LanguageDetector);
  i18next.use(processor);
  i18next.use(new KoreanPostpositionProcessor());
  i18next.use({
    type: "postProcessor",
    name: "duelmon-article-strip",
    process(value: string, key: string[], options: any) {
      if (typeof value !== "string") return value;
      const ns = options?.ns;
      if (ns === "duelmonNames" || ns === "duelmon-names") {
        if (key[0]?.endsWith(".skipStrip")) return value;
        const baseKey = key[0]?.replace(".name", "");
        if (baseKey) {
          const langData = i18next.getDataByLanguage(i18next.resolvedLanguage || i18next.language) as any;
          const entry = langData?.duelmonNames?.[baseKey];
          if (entry?.skipStrip === true || entry?.skipStrip === "true") {
            return value;
          }
        }
        return value.replace(/\b(?:the|of|is|in|a|an)\b/gi, "").replace(/\s{2,}/g, " ").trim();
      }
      return value;
    }
  } as any);
  await i18next.init({
    nonExplicitSupportedLngs: true,
    fallbackLng: "en",
    saveMissing: false,
    missingKeyHandler: () => {},
    supportedLngs: ["en", "es", "fr", "it", "de", "ru", "zh", "pt", "ko", "ja"],
    defaultNS: "menu",
    ns: Object.keys(enConfig),
    detection: {
      lookupLocalStorage: "prLang"
    },
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        ...enConfig
      },
      es: {
        ...esConfig
      },
      fr: {
        ...frConfig
      },
      it: {
        ...itConfig
      },
      de: {
        ...deConfig
      },
      ru: {
        ...ruConfig
      },
      "pt-BR": {
        ...ptBrConfig
      },
      "zh-CN": {
        ...zhCnConfig
      },
      "zh-TW": {
        ...zhTwConfig
      },
      ko: {
        ...koConfig
      },
      ja: {
        ...jaConfig
      }

    },
    postProcess: ["korean-postposition", "duelmon-article-strip"],
  });

  await initFonts(localStorage.getItem("prLang") ?? undefined);

  updateMobileButtonLabels();
  i18next.on('languageChanged', updateMobileButtonLabels);
}

function updateMobileButtonLabels(): void {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      const translated = i18next.t(key);
      element.textContent = translated.toUpperCase();
    }
  });
}

export default i18next;

export function getIsInitialized(): boolean {
  return isInitialized;
}

let isInitialized = false;