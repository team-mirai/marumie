/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ===========================================
    // Client層からの依存ルール (admin)
    // ===========================================
    {
      name: "no-client-to-infrastructure",
      comment: "Client層からInfrastructure層への依存は禁止",
      severity: "error",
      from: { path: "^src/client" },
      to: { path: "infrastructure" },
    },
    {
      name: "no-client-to-application",
      comment: "Client層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "^src/client" },
      to: { path: "application" },
    },

    // ===========================================
    // Presentation層からの依存ルール (admin)
    // ===========================================
    {
      name: "no-presentation-to-client",
      comment: "Presentation層からClient層への依存は禁止",
      severity: "error",
      from: { path: "presentation" },
      to: { path: "^src/client" },
    },

    // ===========================================
    // Domain層からの依存ルール (admin)
    // ===========================================
    {
      name: "no-domain-to-application",
      comment: "Domain層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "domain" },
      to: { path: "application" },
    },
    {
      name: "no-domain-to-presentation",
      comment: "Domain層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "domain" },
      to: { path: "presentation" },
    },
    {
      name: "no-domain-to-infrastructure-impl",
      comment: "Domain層からInfrastructure層の実装への依存は禁止（インターフェースは許可）",
      severity: "error",
      from: { path: "domain" },
      to: {
        path: "infrastructure",
        pathNot: "domain/repositories", // リポジトリインターフェースは許可
      },
    },

    // ===========================================
    // Application層からの依存ルール (admin)
    // ===========================================
    {
      name: "no-application-to-infrastructure",
      comment:
        "Application層からInfrastructure層への依存は禁止。" +
        "外部サービス（CSVローダー、LLMゲートウェイ等）もdomain/repositoriesの" +
        "インターフェースに依存し、実装はPresentation層から注入する",
      severity: "error",
      from: { path: "^admin/src/server/contexts/.*/application" },
      to: { path: "contexts/.*/infrastructure" },
    },
    {
      name: "no-application-to-presentation",
      comment: "Application層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "^admin/src/server/contexts/.*/application" },
      to: { path: "contexts/.*/presentation" },
    },

    // ===========================================
    // Infrastructure層からの依存ルール (admin)
    // ===========================================
    {
      name: "no-infrastructure-to-application",
      comment: "Infrastructure層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "infrastructure" },
      to: { path: "application" },
    },
    {
      name: "no-infrastructure-to-presentation",
      comment: "Infrastructure層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "infrastructure" },
      to: { path: "presentation" },
    },

    // ===========================================
    // Bounded Context間の依存ルール (admin)
    // ===========================================
    {
      name: "no-data-import-to-report",
      comment: "data-importコンテキストからreportコンテキストへの依存は禁止",
      severity: "error",
      from: { path: "contexts/data-import" },
      to: { path: "contexts/report" },
    },
    {
      name: "no-report-to-data-import",
      comment: "reportコンテキストからdata-importコンテキストへの依存は禁止",
      severity: "error",
      from: { path: "contexts/report" },
      to: { path: "contexts/data-import" },
    },
    {
      name: "no-auth-to-data-import",
      comment: "authコンテキストからdata-importコンテキストへの依存は禁止",
      severity: "error",
      from: { path: "contexts/auth" },
      to: { path: "contexts/data-import" },
    },
    {
      name: "no-auth-to-report",
      comment: "authコンテキストからreportコンテキストへの依存は禁止",
      severity: "error",
      from: { path: "contexts/auth" },
      to: { path: "contexts/report" },
    },
    {
      name: "no-shared-to-contexts",
      comment:
        "sharedコンテキストから他のコンテキストへの依存は禁止。" +
        "ただし認証ガード（auth の requireAuth）のみ暫定的に許可している。" +
        "shared/presentation/actions の 6 件は本来 shared に置くべきものではなく" +
        "（他コンテキストから呼ばれておらず、admin 画面専用の入口である）、" +
        "適切なコンテキストへ移設した時点でこの例外は削除すること。" +
        "それまでは shared → auth の循環依存が残っている状態。",
      severity: "error",
      from: { path: "contexts/shared" },
      to: {
        path: "contexts/(data-import|report|auth)",
        pathNot: "contexts/auth/presentation/loaders/require-auth",
      },
    },

    // ===========================================
    // webapp: Client層からの依存ルール
    // ===========================================
    {
      name: "webapp-no-client-to-infrastructure",
      comment: "webapp: Client層からInfrastructure層への依存は禁止",
      severity: "error",
      from: { path: "^webapp/src/client" },
      to: { path: "contexts/.*/infrastructure" },
    },
    {
      name: "webapp-no-client-to-application",
      comment: "webapp: Client層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "^webapp/src/client" },
      to: { path: "contexts/.*/application" },
    },
    {
      name: "webapp-no-client-to-domain-services",
      comment: "webapp: Client層からDomain層のservicesへの依存は禁止（modelsは許可）",
      severity: "error",
      from: { path: "^webapp/src/client" },
      to: { path: "contexts/.*/domain/services" },
    },
    {
      name: "webapp-no-client-to-domain-repositories",
      comment: "webapp: Client層からDomain層のrepositoriesへの依存は禁止（modelsは許可）",
      severity: "error",
      from: { path: "^webapp/src/client" },
      to: { path: "contexts/.*/domain/repositories" },
    },

    // ===========================================
    // webapp: Presentation層からの依存ルール
    // ===========================================
    {
      name: "webapp-no-presentation-to-client",
      comment: "webapp: Presentation層からClient層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/presentation" },
      to: { path: "^webapp/src/client" },
    },
    // Presentation層からInfrastructure層へのDI（リポジトリのインスタンス化）は許可

    // ===========================================
    // webapp: Domain層からの依存ルール
    // ===========================================
    {
      name: "webapp-no-domain-to-application",
      comment: "webapp: Domain層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/domain" },
      to: { path: "contexts/.*/application" },
    },
    {
      name: "webapp-no-domain-to-presentation",
      comment: "webapp: Domain層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/domain" },
      to: { path: "contexts/.*/presentation" },
    },
    {
      name: "webapp-no-domain-to-infrastructure",
      comment: "webapp: Domain層からInfrastructure層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/domain" },
      to: { path: "contexts/.*/infrastructure" },
    },

    // ===========================================
    // webapp: Infrastructure層からの依存ルール
    // ===========================================
    {
      name: "webapp-no-infrastructure-to-application",
      comment: "webapp: Infrastructure層からApplication層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/infrastructure" },
      to: { path: "contexts/.*/application" },
    },
    {
      name: "webapp-no-infrastructure-to-presentation",
      comment: "webapp: Infrastructure層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/infrastructure" },
      to: { path: "contexts/.*/presentation" },
    },

    // ===========================================
    // webapp: Application層からの依存ルール
    // ===========================================
    {
      name: "webapp-no-application-to-presentation",
      comment: "webapp: Application層からPresentation層への依存は禁止",
      severity: "error",
      from: { path: "webapp/src/server/contexts/.*/application" },
      to: { path: "contexts/.*/presentation" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
