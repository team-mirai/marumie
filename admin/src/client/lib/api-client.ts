export interface UpdateUserRoleRequest {
  userId: string;
  role: string;
}

export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  message: string;
}

export interface SetupPasswordRequest {
  password: string;
}

export interface SetupPasswordResponse {
  success: boolean;
  message?: string;
}

export interface BalanceSnapshot {
  id: string;
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface XmlExportParams {
  politicalOrganizationId: string;
  financialYear: string;
  sections: string[];
}

export class ApiClient {
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

  async updateUserRole(data: UpdateUserRoleRequest): Promise<void> {
    return this.request<void>("/api/users/role", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async inviteUser(data: InviteUserRequest): Promise<InviteUserResponse> {
    return this.request<InviteUserResponse>("/api/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async setupPassword(data: SetupPasswordRequest): Promise<SetupPasswordResponse> {
    return this.request<SetupPasswordResponse>("/api/auth/setup-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getBalanceSnapshots(orgId: string): Promise<BalanceSnapshot[]> {
    return this.request<BalanceSnapshot[]>(`/api/balance-snapshots?orgId=${orgId}`);
  }

  async downloadXmlExport(
    params: XmlExportParams,
  ): Promise<{ blob: Blob; filename: string | null }> {
    const searchParams = new URLSearchParams({
      politicalOrganizationId: params.politicalOrganizationId,
      financialYear: params.financialYear,
      sections: params.sections.join(","),
    });
    const response = await fetch(`${this.baseUrl}/api/xml-export?${searchParams.toString()}`);

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
