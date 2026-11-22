import type {
  BalanceSnapshot,
  BalanceSnapshotOverview,
} from "@/server/contexts/shared/domain/models/balance-snapshot";

/** JSON で受け取った残高スナップショット（日付は ISO 8601 の文字列） */
type BalanceSnapshotJson = Omit<BalanceSnapshot, "snapshot_date" | "created_at" | "updated_at"> & {
  snapshot_date: string;
  created_at: string;
  updated_at: string;
};

interface BalanceSnapshotOverviewJson {
  snapshots: BalanceSnapshotJson[];
  current: BalanceSnapshotJson | null;
}

function toBalanceSnapshot(json: BalanceSnapshotJson): BalanceSnapshot {
  return {
    ...json,
    snapshot_date: new Date(json.snapshot_date),
    created_at: new Date(json.created_at),
    updated_at: new Date(json.updated_at),
  };
}

interface ExportReportParams {
  politicalOrganizationId: string;
  financialYear: string;
  sections: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === "development" ? "" : "";
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getBalanceSnapshots(orgId: string): Promise<BalanceSnapshotOverview> {
    const data = await this.request<BalanceSnapshotOverviewJson>(
      `/api/balance-snapshots?orgId=${orgId}`,
    );
    return {
      snapshots: data.snapshots.map(toBalanceSnapshot),
      current: data.current ? toBalanceSnapshot(data.current) : null,
    };
  }

  async downloadReport(
    params: ExportReportParams,
  ): Promise<{ blob: Blob; filename: string | null }> {
    const searchParams = new URLSearchParams({
      politicalOrganizationId: params.politicalOrganizationId,
      financialYear: params.financialYear,
      sections: params.sections.join(","),
    });
    return this.downloadFile(`/api/export-report?${searchParams.toString()}`);
  }

  /** 政治団体 1 件分の環境間同期用 JSON をダウンロードする（admin ロールのみ） */
  async downloadOrganizationSync(
    politicalOrganizationId: string,
  ): Promise<{ blob: Blob; filename: string | null }> {
    const searchParams = new URLSearchParams({ politicalOrganizationId });

    return this.downloadFile(`/api/export-organization-sync?${searchParams.toString()}`);
  }

  /** 選んだ議員室の調研費データをまとめた環境間同期用 JSON をダウンロードする（admin ロールのみ） */
  async downloadResearchFundSync(
    politicianIds: string[],
  ): Promise<{ blob: Blob; filename: string | null }> {
    const searchParams = new URLSearchParams(politicianIds.map((id) => ["politicianId", id]));

    return this.downloadFile(`/api/export-research-fund-sync?${searchParams.toString()}`);
  }

  private async downloadFile(url: string): Promise<{ blob: Blob; filename: string | null }> {
    const response = await fetch(`${this.baseUrl}${url}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename = this.extractFilenameFromContentDisposition(contentDisposition);

    return { blob, filename };
  }

  private extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const filenameStarMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (filenameStarMatch?.[1]) {
      try {
        return decodeURIComponent(filenameStarMatch[1]);
      } catch {
        // ignore decoding errors and continue to fallback
      }
    }

    const filenameMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    if (filenameMatch?.[1]) {
      return filenameMatch[1];
    }

    return null;
  }
}

export const apiClient = new ApiClient();
