import packageJson from "../../package.json";
import { ENV } from "./env";

const currentYear = new Date().getFullYear();

export interface MultiLang {
  readonly th: string;
  readonly en: string;
}

export interface AppConfig {
  readonly app: {
    readonly name: MultiLang;
    readonly shortName: string;
    readonly version: string;
  };
  readonly hospital: {
    readonly name: MultiLang;
    readonly shortName: string;
    readonly hospcode5: string;
    readonly hospcode9: string;
    readonly zone: string;
    readonly website: string;
    readonly email: string;
    readonly phone: string;
    readonly facebook: string;
  };
  readonly api: {
    readonly baseUrl: string;
  };
  readonly seo: {
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly keywords: readonly string[];
  };
  readonly copyright: string;
}

export const APP_CONFIG: AppConfig = {
  app: {
    name: {
      th: "MOPH NOTIFY ARANHOS",
      en: "MOPH NOTIFY ARANHOS",
    },
    shortName: "NTF",
    version: packageJson.version,
  },
  hospital: {
    name: {
      th: "โรงพยาบาลอรัญประเทศ",
      en: "Aranyaprathet Hospital",
    },
    shortName: "ARH",
    hospcode5: "10870",
    hospcode9: "EA0010870",
    zone: "6",
    website: "https://aranhos.moph.go.th",
    email: "aranyaprathethospital@gmail.com",
    phone: "037-233-033",
    facebook: "https://www.facebook.com/aran.hosp",
  },
  api: {
    baseUrl:
      ENV.appUrl ?? "http://192.168.4.30:50000/api/",
  },
  seo: {
    title: "MOPH NOTIFY ARANHOS",
    description: "MOPH NOTIFY ARANHOS",
    image: "/images/logo-aranhos.png",
    keywords: [
      "MOPH",
      "NOTIFY",
      "Hospital",
      "Aranyaprathet",
      "โรงพยาบาลอรัญประเทศ",
    ] satisfies string[],
  },
  copyright: `© ${currentYear}, Aranyaprathet Hospital.`,
} as const;
