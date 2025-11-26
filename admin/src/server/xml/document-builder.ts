interface XmlHead {
  version: string;
  appName: string;
  fileFormatNo: string;
  kokujiAppFlag: string;
  choboAppVersion: string;
}

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
}

export function buildXmlDocument({
  head,
  sections,
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

  const indentedSections = [headXml, ...sections].map((section) =>
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
