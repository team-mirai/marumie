import { create, fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";

export interface XmlHead {
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
  sections: XMLBuilder[];
}

export function buildXmlDocument({
  head,
  sections,
}: XmlDocumentOptions): string {
  const resolvedHead: XmlHead = {
    ...DEFAULT_HEAD,
    ...head,
  };

  const doc = create({ version: "1.0", encoding: "Shift_JIS" }).ele("BOOK");

  doc
    .ele("HEAD")
    .ele("VERSION")
    .txt(resolvedHead.version)
    .up()
    .ele("APP")
    .txt(resolvedHead.appName)
    .up()
    .ele("FILE_FORMAT_NO")
    .txt(resolvedHead.fileFormatNo)
    .up()
    .ele("KOKUJI_APP_FLG")
    .txt(resolvedHead.kokujiAppFlag)
    .up()
    .ele("CHOUBO_APP_VER")
    .txt(resolvedHead.choboAppVersion)
    .up()
    .up();

  for (const section of sections) {
    doc.import(section);
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

export { fragment };
