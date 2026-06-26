import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  app: {
    name: {
      th: "MOPH NOTIFY ARANHOS",
      en: "MOPH NOTIFY ARANHOS",
    },
    version: packageJson.version,
  },
  hospital: {
    name: {
      th: "โรงพยาบาลอรัญประเทศ",
      en: "Aranyaprathet Hospital",
    },
    shortName: "ARH",
    website: "https://aranhos.moph.go.th",
    email: "aranyaprathethospital@gmail.com",
    facebook: "https://www.facebook.com/aran.hosp",
  },
  seo: {
    title: "MOPH NOTIFY ARANHOS",
    description: "MOPH NOTIFY ARANHOS",
    keywords: [
      "MOPH",
      "NOTIFY",
      "Hospital",
      "Aranyaprathet",
      "โรงพยาบาลอรัญประเทศ",
    ] satisfies string[],
    image: "/images/logo-aranhos.png",
  },
  copyright: `© ${currentYear}, Aranyaprathet Hospital.`,
} as const;
