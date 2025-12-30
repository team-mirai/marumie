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
      comment: "sharedコンテキストから他のコンテキストへの依存は禁止",
      severity: "error",
      from: { path: "contexts/shared" },
      to: { path: "contexts/(data-import|report|auth)" },
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
