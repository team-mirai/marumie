import "server-only";
import LegalPageLayout, {
  Paragraph,
  SubSectionTitle,
  List,
} from "@/client/components/layout/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー">
      <div className="space-y-6">
        <div>
          <SubSectionTitle>1. 個人情報の定義</SubSectionTitle>
          <Paragraph className="mb-3">
            個人情報とは、以下のような情報により特定の個人を識別することができるものを指します。
          </Paragraph>
          <List
            items={[
              "氏名、年齢、性別、住所、電話番号、職業、メールアドレス",
              "個人ごとに割り当てられたIDやパスワード、その他識別可能な記号など",
              "単体では個人の特定ができないものの、他の情報と容易に照合することができ、個人を特定できる情報",
            ]}
          />
        </div>

        <div>
          <SubSectionTitle>2. 個人情報の収集目的と使用範囲</SubSectionTitle>
          <Paragraph>
            個人情報をご提供いただく際には、ユーザーの同意に基づいて行うことを原則とし、無断で収集・利用することはありません。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>3. 第三者への情報提供について</SubSectionTitle>
          <Paragraph className="mb-3">
            以下のいずれかに該当する場合を除き、利用者から提供された個人情報を第三者に開示・提供することはありません。
          </Paragraph>
          <List
            items={[
              "利用者本人の同意がある場合",
              "利用者個人が識別されない形（他の情報と照合しても個人を特定できない場合）で提供する場合",
              "法令に基づく開示請求があった場合",
              "不正アクセスや規約違反など、利用者本人による違反が確認された場合",
              "第三者に対して不利益を与えると判断された場合",
              "公共の利益や利用者本人の利益のために必要と判断された場合",
              "寄付金が年間5万円を超える場合、およびそれ以下の金額でも寄付金控除を申請する場合は、政治資金収支報告書に寄付者の情報が記載されます。また、寄附金控除を受ける場合は、総務省のウェブサイトにて寄付年月日・金額・住所・氏名・職業が公開されます。",
            ]}
          />
        </div>

        <div>
          <SubSectionTitle>4. 安全管理措置について</SubSectionTitle>
          <Paragraph>
            個人情報の適切な管理を行うために、責任者を定めた上で、厳正な管理・監督体制を構築しています。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>5. Cookie（クッキー）について</SubSectionTitle>
          <Paragraph className="mb-3">
            Cookieとは、サーバーが利用者の識別を目的として、利用者のブラウザに送信し、端末に保存される情報です。
          </Paragraph>
          <Paragraph>
            当ウェブサイトでは、Googleによるアクセス解析ツール「Google
            アナリティクス」を使用しており、Google
            アナリティクスはデータ収集のためにCookieを使用しています。データは匿名で収集されており、個人を特定するものではありません。この機能はお使いのブラウザの設定でCookieを無効にすることで拒否することができます。Google
            アナリティクスでデータが収集および処理される仕組みの詳細は「Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用」のページをご覧ください。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>6. 個人情報の保管期間</SubSectionTitle>
          <Paragraph>
            取得した個人情報は、政治資金規正法等の法令に基づき、必要な期間（原則として7年間）保管した後、適切な方法により廃棄・削除いたします。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>7. プライバシーポリシーの改訂と通知について</SubSectionTitle>
          <Paragraph>
            このプライバシーポリシーは、必要に応じて内容の見直しを行い、改訂されることがあります。その際、個別の通知は行いませんので、最新の情報については当ウェブサイトをご確認ください。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>8. 個人情報に関するお問い合わせ</SubSectionTitle>
          <Paragraph className="mb-3">
            個人情報の確認・修正・削除・利用停止等をご希望される場合は、下記のお問い合わせ窓口までご連絡ください。なお、ご請求内容がご本人によるものであることが確認できた場合に限り、必要な調査を行い、その結果に基づき適切な対応を行います。
          </Paragraph>
          <Paragraph className="font-bold mt-4">お問い合わせ窓口</Paragraph>
          <Paragraph>チームみらい 個人情報保護管理責任者</Paragraph>
          <Paragraph>support@team-mir.ai</Paragraph>
        </div>
      </div>
    </LegalPageLayout>
  );
}
