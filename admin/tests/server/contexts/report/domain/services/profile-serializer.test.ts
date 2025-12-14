import { serializeProfileSection } from "@/server/contexts/report/domain/services/profile-serializer";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

describe("serializeProfileSection", () => {
  const createEmptyProfile = (): OrganizationReportProfile => ({
    id: "1",
    politicalOrganizationId: "1",
    financialYear: 2024,
    officialName: null,
    officialNameKana: null,
    officeAddress: null,
    officeAddressBuilding: null,
    details: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe("基本情報", () => {
    it("報告年と団体基本情報を出力する", () => {
      const profile = createEmptyProfile();
      profile.officialName = "テスト政治団体";
      profile.officialNameKana = "テストセイジダンタイ";
      profile.officeAddress = "東京都千代田区永田町1-1-1";
      profile.officeAddressBuilding = "国会議事堂";

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<HOUKOKU_NEN>2024</HOUKOKU_NEN>");
      expect(xml).toContain("<DANTAI_NM>テスト政治団体</DANTAI_NM>");
      expect(xml).toContain("<DANTAI_KANA>テストセイジダンタイ</DANTAI_KANA>");
      expect(xml).toContain("<JIM_ADR>東京都千代田区永田町1-1-1</JIM_ADR>");
      expect(xml).toContain("<JIM_APA_ADR>国会議事堂</JIM_APA_ADR>");
    });

    it("空の基本情報でも空タグを出力する", () => {
      const profile = createEmptyProfile();

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<DANTAI_NM></DANTAI_NM>");
      expect(xml).toContain("<DANTAI_KANA></DANTAI_KANA>");
    });
  });

  describe("代表者・会計責任者", () => {
    it("代表者と会計責任者の氏名を出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        representative: { lastName: "山田", firstName: "太郎" },
        accountant: { lastName: "鈴木", firstName: "花子" },
      };

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<DAI_NM1>山田</DAI_NM1>");
      expect(xml).toContain("<DAI_NM2>太郎</DAI_NM2>");
      expect(xml).toContain("<KAI_NM1>鈴木</KAI_NM1>");
      expect(xml).toContain("<KAI_NM2>花子</KAI_NM2>");
    });
  });

  describe("事務担当者", () => {
    it("事務担当者のタグ名は1始まり（TANTOU1_NM1, TANTOU2_NM1, TANTOU3_NM1）", () => {
      const profile = createEmptyProfile();
      profile.details = {
        contactPersons: [
          { id: "1", lastName: "田中", firstName: "一郎", tel: "03-1234-5678" },
          { id: "2", lastName: "佐藤", firstName: "二郎", tel: "03-2345-6789" },
          { id: "3", lastName: "高橋", firstName: "三郎", tel: "03-3456-7890" },
        ],
      };

      const xml = serializeProfileSection(profile).end();

      // 1人目
      expect(xml).toContain("<TANTOU1_NM1>田中</TANTOU1_NM1>");
      expect(xml).toContain("<TANTOU1_NM2>一郎</TANTOU1_NM2>");
      expect(xml).toContain("<TANTOU1_TEL>03-1234-5678</TANTOU1_TEL>");
      // 2人目
      expect(xml).toContain("<TANTOU2_NM1>佐藤</TANTOU2_NM1>");
      expect(xml).toContain("<TANTOU2_NM2>二郎</TANTOU2_NM2>");
      expect(xml).toContain("<TANTOU2_TEL>03-2345-6789</TANTOU2_TEL>");
      // 3人目
      expect(xml).toContain("<TANTOU3_NM1>高橋</TANTOU3_NM1>");
      expect(xml).toContain("<TANTOU3_NM2>三郎</TANTOU3_NM2>");
      expect(xml).toContain("<TANTOU3_TEL>03-3456-7890</TANTOU3_TEL>");
    });

    it("事務担当者が未登録でも3名分の空タグを出力する", () => {
      const profile = createEmptyProfile();

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<TANTOU1_NM1></TANTOU1_NM1>");
      expect(xml).toContain("<TANTOU2_NM1></TANTOU2_NM1>");
      expect(xml).toContain("<TANTOU3_NM1></TANTOU3_NM1>");
    });
  });

  describe("団体区分・活動区域", () => {
    it("団体区分と活動区域を出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        organizationType: "01",
        activityArea: "1",
      };

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<DANTAI_KBN>01</DANTAI_KBN>");
      expect(xml).toContain("<KATU_KUKI>1</KATU_KUKI>");
    });
  });

  describe("資金管理団体情報", () => {
    it("資金管理団体がない場合、SIKIN_UMU=0を出力する", () => {
      const profile = createEmptyProfile();

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<SIKIN_UMU>0</SIKIN_UMU>");
      expect(xml).toContain("<SIKIN_KIKAN1/>");
      expect(xml).toContain("<SIKIN_KIKAN2/>");
      expect(xml).toContain("<SIKIN_KIKAN_FUKUSU/>");
    });

    it("資金管理団体がある場合、SIKIN_UMU=1と詳細を出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        fundManagement: {
          publicPositionName: "衆議院議員",
          publicPositionType: "1",
          applicant: { lastName: "議員", firstName: "太郎" },
          periods: [{ id: "1", from: "R6/4/1", to: "R7/3/31" }],
        },
      };

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<SIKIN_UMU>1</SIKIN_UMU>");
      expect(xml).toContain("<KOSYOKU_NM>衆議院議員</KOSYOKU_NM>");
      expect(xml).toContain("<KOSYOKU_KBN>1</KOSYOKU_KBN>");
      expect(xml).toContain("<SIKIN_TODOKE_NM1>議員</SIKIN_TODOKE_NM1>");
      expect(xml).toContain("<SIKIN_TODOKE_NM2>太郎</SIKIN_TODOKE_NM2>");
      expect(xml).toContain("<SIKIN_KIKAN1>R6/4/1</SIKIN_KIKAN1>");
      expect(xml).toContain("<SIKIN_KIKAN2>R7/3/31</SIKIN_KIKAN2>");
    });

    it("複数期間がある場合、2件目以降はSIKIN_KIKAN_FUKUSUにカンマ区切りで出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        fundManagement: {
          publicPositionName: "衆議院議員",
          publicPositionType: "1",
          applicant: { lastName: "議員", firstName: "太郎" },
          periods: [
            { id: "1", from: "R5/4/1", to: "R6/3/31" },
            { id: "2", from: "R6/4/1", to: "R7/3/31" },
            { id: "3", from: "R7/4/1", to: "R8/3/31" },
          ],
        },
      };

      const xml = serializeProfileSection(profile).end();

      // 1件目
      expect(xml).toContain("<SIKIN_KIKAN1>R5/4/1</SIKIN_KIKAN1>");
      expect(xml).toContain("<SIKIN_KIKAN2>R6/3/31</SIKIN_KIKAN2>");
      // 2件目以降はカンマ区切り
      expect(xml).toContain(
        "<SIKIN_KIKAN_FUKUSU>R6/4/1～R7/3/31,R7/4/1～R8/3/31</SIKIN_KIKAN_FUKUSU>",
      );
    });
  });

  describe("国会議員関係政治団体情報", () => {
    it("国会議員関係がない場合、GIIN_DANTAI_KBN=0を出力する", () => {
      const profile = createEmptyProfile();

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<GIIN_DANTAI_KBN>0</GIIN_DANTAI_KBN>");
      expect(xml).toContain("<GIIN1_KOSYOKU_NM_1/>");
      expect(xml).toContain("<GIIN2_KOSYOKU_NM_1/>");
      expect(xml).toContain("<GIIN3_KOSYOKU_NM_1/>");
    });

    it("国会議員関係のタグ名は1始まり（GIIN1_KOSYOKU_NM_1, GIIN2_...）", () => {
      const profile = createEmptyProfile();
      profile.details = {
        dietMemberRelation: {
          type: "1",
          members: [
            {
              id: "1",
              lastName: "国会",
              firstName: "太郎",
              chamber: "1",
              positionType: "1",
            },
            {
              id: "2",
              lastName: "参議",
              firstName: "次郎",
              chamber: "2",
              positionType: "2",
            },
          ],
          periods: [{ id: "1", from: "R6/4/1", to: "R7/3/31" }],
        },
      };

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<GIIN_DANTAI_KBN>1</GIIN_DANTAI_KBN>");
      // 1人目
      expect(xml).toContain("<GIIN1_KOSYOKU_NM_1>国会</GIIN1_KOSYOKU_NM_1>");
      expect(xml).toContain("<GIIN1_KOSYOKU_NM_2>太郎</GIIN1_KOSYOKU_NM_2>");
      expect(xml).toContain("<GIIN1_KOSYOKU_NM>1</GIIN1_KOSYOKU_NM>");
      expect(xml).toContain("<GIIN1_KOSYOKU_KBN>1</GIIN1_KOSYOKU_KBN>");
      // 2人目
      expect(xml).toContain("<GIIN2_KOSYOKU_NM_1>参議</GIIN2_KOSYOKU_NM_1>");
      expect(xml).toContain("<GIIN2_KOSYOKU_NM_2>次郎</GIIN2_KOSYOKU_NM_2>");
      expect(xml).toContain("<GIIN2_KOSYOKU_NM>2</GIIN2_KOSYOKU_NM>");
      expect(xml).toContain("<GIIN2_KOSYOKU_KBN>2</GIIN2_KOSYOKU_KBN>");
    });

    it("複数期間がある場合、2件目以降はGIIN_KIKAN_FUKUSUにカンマ区切りで出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        dietMemberRelation: {
          type: "1",
          members: [
            {
              id: "1",
              lastName: "国会",
              firstName: "太郎",
              chamber: "1",
              positionType: "1",
            },
          ],
          periods: [
            { id: "1", from: "R5/4/1", to: "R6/3/31" },
            { id: "2", from: "R6/4/1", to: "R7/3/31" },
          ],
        },
      };

      const xml = serializeProfileSection(profile).end();

      // 1件目
      expect(xml).toContain("<GIIN_KIKAN1>R5/4/1</GIIN_KIKAN1>");
      expect(xml).toContain("<GIIN_KIKAN2>R6/3/31</GIIN_KIKAN2>");
      // 2件目以降はカンマ区切り
      expect(xml).toContain(
        "<GIIN_KIKAN_FUKUSU>R6/4/1～R7/3/31</GIIN_KIKAN_FUKUSU>",
      );
    });
  });

  describe("特定パーティー開催日", () => {
    it("特定パーティー開催日を出力する", () => {
      const profile = createEmptyProfile();
      profile.details = {
        specificPartyDate: "R6/6/15",
      };

      const xml = serializeProfileSection(profile).end();

      expect(xml).toContain("<KAISAI_DT>R6/6/15</KAISAI_DT>");
    });
  });
});
