"use client";
import "client-only";

import { useState, useMemo } from "react";
import { Input, Label } from "@/client/components/ui";
import type { Donor, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";
import { DonorTypeBadge } from "@/client/components/donors/DonorTypeBadge";
import {
  CandidateEmpty,
  CandidateGroupLabel,
  CandidateList,
  CandidateListItem,
} from "@/client/components/assignment/CandidateList";
import { SelectedCandidateCard } from "@/client/components/assignment/SelectedCandidateCard";

interface DonorSelectorContentProps {
  allDonors: Donor[];
  selectedDonorId: string | null;
  onSelect: (donorId: string) => void;
  allowedDonorTypes?: DonorType[];
}

const DONOR_TYPE_ORDER: DonorType[] = ["individual", "corporation", "political_organization"];

/**
 * 紐付けダイアログの「既存から選択」タブ。検索 input + 種別ごとにグループ化した候補一覧。
 * 候補行の見た目は取引先側と共通（CandidateListItem）。
 */
export function DonorSelectorContent({
  allDonors,
  selectedDonorId,
  onSelect,
  allowedDonorTypes = [],
}: DonorSelectorContentProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDonors = useMemo(() => {
    return allDonors.filter((donor) => {
      if (allowedDonorTypes.length > 0 && !allowedDonorTypes.includes(donor.donorType)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        donor.name.toLowerCase().includes(query) ||
        (donor.address?.toLowerCase().includes(query) ?? false) ||
        (donor.occupation?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [allDonors, searchQuery, allowedDonorTypes]);

  const groupedDonors = useMemo(() => {
    const groups: Record<DonorType, Donor[]> = {
      individual: [],
      corporation: [],
      political_organization: [],
    };

    for (const donor of filteredDonors) {
      groups[donor.donorType].push(donor);
    }

    return groups;
  }, [filteredDonors]);

  const selectedDonor = allDonors.find((d) => d.id === selectedDonorId);
  const visibleTypes = allowedDonorTypes.length > 0 ? allowedDonorTypes : DONOR_TYPE_ORDER;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="donor-search">寄付者を検索</Label>
        <Input
          id="donor-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="名前、住所、職業で検索..."
          className="border-[1.5px] text-[13px]"
        />
      </div>

      {selectedDonor && (
        <SelectedCandidateCard>
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">{selectedDonor.name}</p>
            <DonorTypeBadge donorType={selectedDonor.donorType} />
          </div>
          {selectedDonor.address && (
            <p className="text-xs text-muted-foreground">{selectedDonor.address}</p>
          )}
        </SelectedCandidateCard>
      )}

      <CandidateList>
        {filteredDonors.length > 0 ? (
          visibleTypes.map((type) => {
            const donors = groupedDonors[type];
            if (donors.length === 0) return null;

            return (
              <div key={type} className="border-b border-border-soft last:border-b-0">
                <CandidateGroupLabel>
                  {DONOR_TYPE_LABELS[type]} (<span className="font-latin">{donors.length}</span>件)
                </CandidateGroupLabel>
                {donors.map((donor) => (
                  <CandidateListItem
                    key={donor.id}
                    selected={selectedDonorId === donor.id}
                    onSelect={() => onSelect(donor.id)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">
                        {donor.name}
                      </span>
                      <DonorTypeBadge donorType={donor.donorType} />
                    </span>
                    {donor.address && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {donor.address}
                      </span>
                    )}
                    {donor.donorType === "individual" && donor.occupation && (
                      <span className="block truncate text-xs text-muted-foreground">
                        職業: {donor.occupation}
                      </span>
                    )}
                  </CandidateListItem>
                ))}
              </div>
            );
          })
        ) : (
          <CandidateEmpty>該当する寄付者がありません</CandidateEmpty>
        )}
      </CandidateList>
    </div>
  );
}
