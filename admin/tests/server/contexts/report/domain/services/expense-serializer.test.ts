import {
  serializeExpenseSection,
  serializePoliticalActivityExpenseSection,
  type PoliticalActivityExpenseSections,
} from "@/server/contexts/report/domain/services/expense-serializer";
import type {
  UtilityExpenseSection,
  SuppliesExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  ElectionExpenseSection,
  PublicationExpenseSection,
  AdvertisingExpenseSection,
  FundraisingPartyExpenseSection,
  OtherBusinessExpenseSection,
  ResearchExpenseSection,
  DonationGrantExpenseSection,
  OtherPoliticalExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";

describe("serializeExpenseSection", () => {
  it("serializes three KUBUN sections into XML format", () => {
    const utilitySection: UtilityExpenseSection = {
      totalAmount: 50000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "電気代",
          kingaku: 50000,
          dt: new Date("2024-06-01"),
          nm: "東京電力",
          adr: "東京都千代田区",
          bikou: "6月分",
        },
      ],
    };

    const suppliesSection: SuppliesExpenseSection = {
      totalAmount: 30000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "事務用品",
          kingaku: 30000,
          dt: new Date("2024-06-15"),
          nm: "文具店",
          adr: "東京都渋谷区",
        },
      ],
    };

    const officeSection: OfficeExpenseSection = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "家賃",
          kingaku: 100000,
          dt: new Date("2024-06-01"),
          nm: "不動産会社",
          adr: "東京都新宿区",
        },
      ],
    };

    const xmlBuilder = serializeExpenseSection(
      utilitySection,
      suppliesSection,
      officeSection,
    );
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_14>");
    expect(xml).toContain("<KUBUN1>");
    expect(xml).toContain("<KUBUN2>");
    expect(xml).toContain("<KUBUN3>");
    expect(xml).toContain("<MOKUTEKI>電気代</MOKUTEKI>");
    expect(xml).toContain("<MOKUTEKI>事務用品</MOKUTEKI>");
    expect(xml).toContain("<MOKUTEKI>家賃</MOKUTEKI>");
  });

  it("serializes underThresholdAmount correctly", () => {
    const utilitySection: UtilityExpenseSection = {
      totalAmount: 80000,
      underThresholdAmount: 20000,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "ガス代",
          kingaku: 60000,
          dt: new Date("2024-07-01"),
          nm: "東京ガス",
          adr: "東京都港区",
        },
      ],
    };

    const emptySection = {
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const xmlBuilder = serializeExpenseSection(
      utilitySection,
      emptySection,
      emptySection,
    );
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<KINGAKU_GK>80000</KINGAKU_GK>");
    expect(xml).toContain("<SONOTA_GK>20000</SONOTA_GK>");
  });

  it("serializes empty sections with self-closing SONOTA_GK", () => {
    const emptySection = {
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const xmlBuilder = serializeExpenseSection(
      emptySection,
      emptySection,
      emptySection,
    );
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<KINGAKU_GK>0</KINGAKU_GK>");
    expect(xml).toContain("<SONOTA_GK/>");
    expect(xml).not.toContain("<ROW>");
  });

  it("escapes special XML characters", () => {
    const section: UtilityExpenseSection = {
      totalAmount: 10000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "水道 & ガス",
          kingaku: 10000,
          dt: new Date("2024-08-01"),
          nm: "<会社名>",
          adr: "住所",
        },
      ],
    };

    const emptySection = {
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const xmlBuilder = serializeExpenseSection(
      section,
      emptySection,
      emptySection,
    );
    const xml = xmlBuilder.toString();

    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;会社名&gt;");
  });
});

describe("serializePoliticalActivityExpenseSection", () => {
  it("serializes all nine KUBUN sections into XML format", () => {
    const organizationExpenses: OrganizationExpenseSection = {
      himoku: "人件費",
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "給与",
          kingaku: 100000,
          dt: new Date("2024-06-01"),
          nm: "職員A",
          adr: "東京都千代田区",
        },
      ],
    };

    const electionExpenses: ElectionExpenseSection = {
      himoku: "ポスター制作",
      totalAmount: 200000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "選挙ポスター",
          kingaku: 200000,
          dt: new Date("2024-06-15"),
          nm: "印刷会社",
          adr: "東京都港区",
        },
      ],
    };

    const emptySection = {
      himoku: "",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [organizationExpenses],
      electionExpenses: [electionExpenses],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_15>");
    expect(xml).toContain("<KUBUN1>");
    expect(xml).toContain("<KUBUN2>");
    expect(xml).toContain("<KUBUN3>");
    expect(xml).toContain("<KUBUN4>");
    expect(xml).toContain("<KUBUN5>");
    expect(xml).toContain("<KUBUN6>");
    expect(xml).toContain("<KUBUN7>");
    expect(xml).toContain("<KUBUN8>");
    expect(xml).toContain("<KUBUN9>");
    expect(xml).toContain("<HIMOKU>人件費</HIMOKU>");
    expect(xml).toContain("<HIMOKU>ポスター制作</HIMOKU>");
    expect(xml).toContain("<MOKUTEKI>給与</MOKUTEKI>");
    expect(xml).toContain("<MOKUTEKI>選挙ポスター</MOKUTEKI>");
  });

  it("serializes himoku and underThresholdAmount correctly", () => {
    const sectionWithHimoku: OrganizationExpenseSection = {
      himoku: "交通費",
      totalAmount: 150000,
      underThresholdAmount: 30000,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "出張費",
          kingaku: 120000,
          dt: new Date("2024-07-01"),
          nm: "旅行代理店",
          adr: "東京都新宿区",
        },
      ],
    };

    const emptySection = {
      himoku: "",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [sectionWithHimoku],
      electionExpenses: [],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<HIMOKU>交通費</HIMOKU>");
    expect(xml).toContain("<KINGAKU_GK>150000</KINGAKU_GK>");
    expect(xml).toContain("<SONOTA_GK>30000</SONOTA_GK>");
  });

  it("serializes empty sections with self-closing HIMOKU and SONOTA_GK", () => {
    const emptySection = {
      himoku: "",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [],
      electionExpenses: [],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<KINGAKU_GK>0</KINGAKU_GK>");
    expect(xml).toContain("<HIMOKU/>");
    expect(xml).toContain("<SONOTA_GK/>");
    expect(xml).not.toContain("<ROW>");
  });

  it("escapes special XML characters in himoku and other fields", () => {
    const section: ResearchExpenseSection = {
      himoku: "調査 & 研究",
      totalAmount: 50000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "市場調査 <重要>",
          kingaku: 50000,
          dt: new Date("2024-08-01"),
          nm: "<調査会社>",
          adr: "東京都渋谷区",
          bikou: "特別 & 緊急",
        },
      ],
    };

    const emptySection = {
      himoku: "",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [],
      electionExpenses: [],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [section],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("調査 &amp; 研究");
    expect(xml).toContain("&lt;重要&gt;");
    expect(xml).toContain("&lt;調査会社&gt;");
    expect(xml).toContain("特別 &amp; 緊急");
  });

  it("単一KUBUNに複数SHEETを出力する（複数費目のグループ化）", () => {
    const meetingExpense: OrganizationExpenseSection = {
      himoku: "会議費",
      totalAmount: 130000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "会議室利用",
          kingaku: 60000,
          dt: new Date("2024-06-01"),
          nm: "会議室A",
          adr: "東京都千代田区",
        },
        {
          ichirenNo: "2",
          mokuteki: "会議室利用",
          kingaku: 70000,
          dt: new Date("2024-06-20"),
          nm: "会議室B",
          adr: "東京都渋谷区",
        },
      ],
    };

    const transportExpense: OrganizationExpenseSection = {
      himoku: "交通費",
      totalAmount: 80000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "タクシー代",
          kingaku: 80000,
          dt: new Date("2024-06-15"),
          nm: "タクシー会社",
          adr: "東京都港区",
        },
      ],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [meetingExpense, transportExpense],
      electionExpenses: [],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_15>");
    expect(xml).toContain("<KUBUN1>");

    const kubun1Match = xml.match(/<KUBUN1>([\s\S]*?)<\/KUBUN1>/);
    expect(kubun1Match).not.toBeNull();
    const kubun1Content = kubun1Match![1];

    const sheetMatches = kubun1Content.match(/<SHEET>/g);
    expect(sheetMatches).toHaveLength(2);

    expect(kubun1Content).toContain("<HIMOKU>会議費</HIMOKU>");
    expect(kubun1Content).toContain("<HIMOKU>交通費</HIMOKU>");

    expect(kubun1Content).toContain("<KINGAKU_GK>130000</KINGAKU_GK>");
    expect(kubun1Content).toContain("<KINGAKU_GK>80000</KINGAKU_GK>");

    expect(kubun1Content).toContain("<MOKUTEKI>会議室利用</MOKUTEKI>");
    expect(kubun1Content).toContain("<MOKUTEKI>タクシー代</MOKUTEKI>");
  });

  it("複数KUBUNにそれぞれ複数SHEETを出力する", () => {
    const orgExpense1: OrganizationExpenseSection = {
      himoku: "会議費",
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "会議",
          kingaku: 100000,
          dt: new Date("2024-06-01"),
          nm: "会議室",
          adr: "東京都",
        },
      ],
    };

    const orgExpense2: OrganizationExpenseSection = {
      himoku: "交通費",
      totalAmount: 50000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "タクシー",
          kingaku: 50000,
          dt: new Date("2024-06-15"),
          nm: "タクシー",
          adr: "東京都",
        },
      ],
    };

    const electionExpense1: ElectionExpenseSection = {
      himoku: "ポスター",
      totalAmount: 200000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "ポスター制作",
          kingaku: 200000,
          dt: new Date("2024-07-01"),
          nm: "印刷会社",
          adr: "東京都",
        },
      ],
    };

    const electionExpense2: ElectionExpenseSection = {
      himoku: "チラシ",
      totalAmount: 150000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "チラシ制作",
          kingaku: 150000,
          dt: new Date("2024-07-15"),
          nm: "印刷会社B",
          adr: "東京都",
        },
      ],
    };

    const sections: PoliticalActivityExpenseSections = {
      organizationExpenses: [orgExpense1, orgExpense2],
      electionExpenses: [electionExpense1, electionExpense2],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    };

    const xmlBuilder = serializePoliticalActivityExpenseSection(sections);
    const xml = xmlBuilder.toString();

    const kubun1Match = xml.match(/<KUBUN1>([\s\S]*?)<\/KUBUN1>/);
    expect(kubun1Match).not.toBeNull();
    const kubun1Sheets = kubun1Match![1].match(/<SHEET>/g);
    expect(kubun1Sheets).toHaveLength(2);
    expect(kubun1Match![1]).toContain("<HIMOKU>会議費</HIMOKU>");
    expect(kubun1Match![1]).toContain("<HIMOKU>交通費</HIMOKU>");

    const kubun2Match = xml.match(/<KUBUN2>([\s\S]*?)<\/KUBUN2>/);
    expect(kubun2Match).not.toBeNull();
    const kubun2Sheets = kubun2Match![1].match(/<SHEET>/g);
    expect(kubun2Sheets).toHaveLength(2);
    expect(kubun2Match![1]).toContain("<HIMOKU>ポスター</HIMOKU>");
    expect(kubun2Match![1]).toContain("<HIMOKU>チラシ</HIMOKU>");
  });
});
