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
});
