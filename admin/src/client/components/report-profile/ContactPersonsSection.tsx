"use client";
import "client-only";

import type {
  ContactPerson,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";
import {
  ShadcnButton,
  ShadcnCard,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  ShadcnInput,
} from "@/client/components/ui";

interface ContactPersonsSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

const generateId = () => crypto.randomUUID();

const emptyContactPerson = (): ContactPerson => ({
  id: generateId(),
  lastName: "",
  firstName: "",
  tel: "",
});

export function ContactPersonsSection({ details, updateDetails }: ContactPersonsSectionProps) {
  const contactPersons = details.contactPersons ?? [];

  const updateContactPerson = (index: number, updates: Partial<ContactPerson>) => {
    const newContactPersons = [...contactPersons];
    if (index < newContactPersons.length) {
      newContactPersons[index] = { ...newContactPersons[index], ...updates };
      updateDetails({ contactPersons: newContactPersons });
    }
  };

  const addContactPerson = () => {
    if (contactPersons.length < 3) {
      updateDetails({
        contactPersons: [...contactPersons, emptyContactPerson()],
      });
    }
  };

  const removeContactPerson = (index: number) => {
    const newContactPersons = contactPersons.filter((_, i) => i !== index);
    updateDetails({ contactPersons: newContactPersons });
  };

  return (
    <ShadcnCard>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>事務担当者（最大3名）</CardTitle>
        {contactPersons.length < 3 && (
          <ShadcnButton type="button" variant="ghost" size="sm" onClick={addContactPerson}>
            + 追加
          </ShadcnButton>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {contactPersons.length === 0 && (
          <p className="text-muted-foreground text-sm">
            事務担当者が登録されていません。「+ 追加」をクリックして追加してください。
          </p>
        )}

        {contactPersons.map((person, index) => (
          <div key={person.id} className="bg-card rounded-lg p-3 border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">事務担当者 {index + 1}</span>
              <ShadcnButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeContactPerson(index)}
                className="text-destructive hover:text-destructive"
              >
                削除
              </ShadcnButton>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">姓</Label>
                <ShadcnInput
                  type="text"
                  value={person.lastName}
                  onChange={(e) => updateContactPerson(index, { lastName: e.target.value })}
                  maxLength={30}
                  className="bg-input"
                  placeholder="田中"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">名</Label>
                <ShadcnInput
                  type="text"
                  value={person.firstName}
                  onChange={(e) => updateContactPerson(index, { firstName: e.target.value })}
                  maxLength={30}
                  className="bg-input"
                  placeholder="一郎"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">電話番号</Label>
                <ShadcnInput
                  type="text"
                  value={person.tel}
                  onChange={(e) => updateContactPerson(index, { tel: e.target.value })}
                  maxLength={20}
                  className="bg-input"
                  placeholder="03-1234-5678"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </ShadcnCard>
  );
}
