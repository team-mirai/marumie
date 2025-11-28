interface XmlHead {
  version: string;
  appName: string;
  fileFormatNo: string;
  kokujiAppFlag: string;
  choboAppVersion: string;
}

const FLAG_STRING_LENGTH = 51;
const KNOWN_FORM_IDS = [
  "SYUUSHI07_01",
  "SYUUSHI07_02",
  "SYUUSHI07_03",
  "SYUUSHI07_04",
  "SYUUSHI07_05",
  "SYUUSHI07_06",
  "SYUUSHI07_07",
  "SYUUSHI07_08",
  "SYUUSHI07_09",
  "SYUUSHI07_10",
  "SYUUSHI07_11",
  "SYUUSHI07_12",
  "SYUUSHI07_13",
  "SYUUSHI07_14",
  "SYUUSHI07_15",
  "SYUUSHI07_16",
  "SYUUSHI07_17",
  "SYUUSHI07_18",
  "SYUUSHI07_19",
  "SYUUSHI07_20",
  "SYUUSHI08",
  "SYUUSHI08_02",
  "SYUUSHI_KIFUKOUJYO",
] as const;

const DEFAULT_AVAILABLE_FORMS = new Set<string>(["SYUUSHI07_06"]);

const DEFAULT_HEAD: XmlHead = {
  version: "20081001",
  appName: "収支報告書作成ソフト (収支報告書作成ソフト)",
  fileFormatNo: "1",
  kokujiAppFlag: "0",
  choboAppVersion: "20081001",
};

export interface XmlDocumentOptions {
  head?: Partial<XmlHead>;
  sections: string[];
  availableFormIds?: string[];
}

function buildSyushiFlagSection(availableFormIds?: string[]): string {
  const formSet =
    availableFormIds && availableFormIds.length > 0
      ? new Set(
          availableFormIds.filter((formId) =>
            KNOWN_FORM_IDS.includes(formId as (typeof KNOWN_FORM_IDS)[number]),
          ),
        )
      : new Set(DEFAULT_AVAILABLE_FORMS);

  const flagString = KNOWN_FORM_IDS.map((formId) =>
    formSet.has(formId) ? "1" : "0",
  )
    .join("")
    .padEnd(FLAG_STRING_LENGTH, "0")
    .slice(0, FLAG_STRING_LENGTH);

  return [
    "<SYUUSHI_FLG>",
    "  <SYUUSHI_UMU_FLG>",
    `    <SYUUSHI_UMU>${flagString}</SYUUSHI_UMU>`,
    "  </SYUUSHI_UMU_FLG>",
    "</SYUUSHI_FLG>",
  ].join("\n");
}

export function buildXmlDocument({
  head,
  sections,
  availableFormIds,
}: XmlDocumentOptions): string {
  const resolvedHead: XmlHead = {
    ...DEFAULT_HEAD,
    ...head,
  };

  const headXml = [
    "<HEAD>",
    `  <VERSION>${resolvedHead.version}</VERSION>`,
    `  <APP>${resolvedHead.appName}</APP>`,
    `  <FILE_FORMAT_NO>${resolvedHead.fileFormatNo}</FILE_FORMAT_NO>`,
    `  <KOKUJI_APP_FLG>${resolvedHead.kokujiAppFlag}</KOKUJI_APP_FLG>`,
    `  <CHOUBO_APP_VER>${resolvedHead.choboAppVersion}</CHOUBO_APP_VER>`,
    "</HEAD>",
  ].join("\n");
  const availabilityXml = buildSyushiFlagSection(availableFormIds);

  const indentedSections = [headXml, availabilityXml, ...sections].map(
    (section) =>
      section
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="Shift_JIS" ?>',
    "<BOOK>",
    ...indentedSections,
    "</BOOK>",
  ].join("\n");
}
