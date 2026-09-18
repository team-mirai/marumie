interface BalanceSnapshot {
  id: string;
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
  created_at: Date;
  updated_at: Date;
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

  async getBalanceSnapshots(orgId: string): Promise<BalanceSnapshot[]> {
    return this.request<BalanceSnapshot[]>(`/api/balance-snapshots?orgId=${orgId}`);
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
