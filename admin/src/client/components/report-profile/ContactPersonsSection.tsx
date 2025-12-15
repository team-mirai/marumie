"use client";
import "client-only";

import type {
  ContactPerson,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";

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
    <div className="bg-primary-hover rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">事務担当者（最大3名）</h2>
        {contactPersons.length < 3 && (
          <button
            type="button"
            onClick={addContactPerson}
            className="text-primary-accent hover:text-blue-400 text-sm"
          >
            + 追加
          </button>
        )}
      </div>

      <div className="space-y-4">
        {contactPersons.length === 0 && (
          <p className="text-primary-muted text-sm">
            事務担当者が登録されていません。「+ 追加」をクリックして追加してください。
          </p>
        )}

        {contactPersons.map((person, index) => (
          <div
            key={person.id}
            className="bg-primary-panel rounded-lg p-3 border border-primary-border"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-primary-muted">事務担当者 {index + 1}</span>
              <button
                type="button"
                onClick={() => removeContactPerson(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                削除
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm text-primary-muted">
                姓
                <input
                  type="text"
                  value={person.lastName}
                  onChange={(e) => updateContactPerson(index, { lastName: e.target.value })}
                  maxLength={30}
                  className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                  placeholder="田中"
                />
              </label>
              <label className="block text-sm text-primary-muted">
                名
                <input
                  type="text"
                  value={person.firstName}
                  onChange={(e) => updateContactPerson(index, { firstName: e.target.value })}
                  maxLength={30}
                  className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                  placeholder="一郎"
                />
              </label>
              <label className="block text-sm text-primary-muted">
                電話番号
                <input
                  type="text"
                  value={person.tel}
                  onChange={(e) => updateContactPerson(index, { tel: e.target.value })}
                  maxLength={20}
                  className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                  placeholder="03-1234-5678"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
