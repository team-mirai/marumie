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

export interface OtherIncomeXmlParams {
  politicalOrganizationId: string;
  financialYear: string;
}

export interface OtherIncomeXmlPreviewResponse {
  xml: string;
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
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
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

  async setupPassword(
    data: SetupPasswordRequest,
  ): Promise<SetupPasswordResponse> {
    return this.request<SetupPasswordResponse>("/api/auth/setup-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getBalanceSnapshots(orgId: string): Promise<BalanceSnapshot[]> {
    return this.request<BalanceSnapshot[]>(
      `/api/balance-snapshots?orgId=${orgId}`,
    );
  }

  async getOtherIncomeXmlPreview(
    params: OtherIncomeXmlParams,
  ): Promise<OtherIncomeXmlPreviewResponse> {
    const searchParams = new URLSearchParams({
      politicalOrganizationId: params.politicalOrganizationId,
      financialYear: params.financialYear,
      mode: "preview",
    });
    return this.request<OtherIncomeXmlPreviewResponse>(
      `/api/xml/other-income?${searchParams.toString()}`,
    );
  }

  async downloadOtherIncomeXml(params: OtherIncomeXmlParams): Promise<Blob> {
    const searchParams = new URLSearchParams({
      politicalOrganizationId: params.politicalOrganizationId,
      financialYear: params.financialYear,
    });
    const response = await fetch(
      `${this.baseUrl}/api/xml/other-income?${searchParams.toString()}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();
