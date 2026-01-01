"use client";
import "client-only";

import type { OrganizationReportProfileDetails } from "@/server/contexts/report/domain/models/organization-report-profile";
import { Card, CardHeader, CardTitle, CardContent, Label, Input } from "@/client/components/ui";

interface RepresentativeSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

export function RepresentativeSection({ details, updateDetails }: RepresentativeSectionProps) {
  const representative = details.representative ?? {
    lastName: "",
    firstName: "",
  };
  const accountant = details.accountant ?? { lastName: "", firstName: "" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>代表者・会計責任者</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-md font-medium text-foreground mb-2">代表者</h3>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground">姓</Label>
              <Input
                type="text"
                value={representative.lastName}
                onChange={(e) =>
                  updateDetails({
                    representative: {
                      ...representative,
                      lastName: e.target.value,
                    },
                  })
                }
                maxLength={30}
                placeholder="山田"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground">名</Label>
              <Input
                type="text"
                value={representative.firstName}
                onChange={(e) =>
                  updateDetails({
                    representative: {
                      ...representative,
                      firstName: e.target.value,
                    },
                  })
                }
                maxLength={30}
                placeholder="太郎"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-md font-medium text-foreground mb-2">会計責任者</h3>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground">姓</Label>
              <Input
                type="text"
                value={accountant.lastName}
                onChange={(e) =>
                  updateDetails({
                    accountant: { ...accountant, lastName: e.target.value },
                  })
                }
                maxLength={30}
                placeholder="鈴木"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-muted-foreground">名</Label>
              <Input
                type="text"
                value={accountant.firstName}
                onChange={(e) =>
                  updateDetails({
                    accountant: { ...accountant, firstName: e.target.value },
                  })
                }
                maxLength={30}
                placeholder="花子"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
