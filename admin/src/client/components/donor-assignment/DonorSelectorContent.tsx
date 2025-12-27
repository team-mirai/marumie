"use client";
import "client-only";

import { useState, useMemo } from "react";
import { Input, Label } from "@/client/components/ui";
import type { Donor, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";

interface DonorSelectorContentProps {
  allDonors: Donor[];
  selectedDonorId: string | null;
  onSelect: (donorId: string) => void;
  allowedDonorTypes?: DonorType[];
}

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

  const renderDonorItem = (donor: Donor) => {
    const isSelected = selectedDonorId === donor.id;
    return (
      <button
        key={donor.id}
        type="button"
        onClick={() => onSelect(donor.id)}
        className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-start gap-3 ${
          isSelected ? "bg-secondary" : ""
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
            isSelected ? "border-primary" : "border-gray-500"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{donor.name}</span>
            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {DONOR_TYPE_LABELS[donor.donorType]}
            </span>
          </div>
          {donor.address && (
            <span className="text-muted-foreground text-xs truncate block">{donor.address}</span>
          )}
          {donor.donorType === "individual" && donor.occupation && (
            <span className="text-muted-foreground text-xs truncate block">
              職業: {donor.occupation}
            </span>
          )}
        </div>
      </button>
    );
  };

  const donorTypeOrder: DonorType[] = ["individual", "corporation", "political_organization"];
  const visibleTypes = allowedDonorTypes.length > 0 ? allowedDonorTypes : donorTypeOrder;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="donor-search">寄付者を検索</Label>
        <Input
          id="donor-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="名前、住所、職業で検索..."
        />
      </div>

      {selectedDonor && (
        <div className="bg-primary/10 border border-primary rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">選択中:</p>
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">{selectedDonor.name}</p>
            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
              {DONOR_TYPE_LABELS[selectedDonor.donorType]}
            </span>
          </div>
          {selectedDonor.address && (
            <p className="text-muted-foreground text-xs">{selectedDonor.address}</p>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
        {filteredDonors.length > 0 ? (
          visibleTypes.map((type) => {
            const donors = groupedDonors[type];
            if (donors.length === 0) return null;

            return (
              <div key={type} className="py-1 border-b border-border last:border-b-0">
                <div className="px-3 py-1 text-xs text-muted-foreground bg-secondary/30">
                  {DONOR_TYPE_LABELS[type]} ({donors.length}件)
                </div>
                {donors.map(renderDonorItem)}
              </div>
            );
          })
        ) : (
          <div className="px-3 py-4 text-center text-muted-foreground text-sm">
            該当する寄付者がありません
          </div>
        )}
      </div>
    </div>
  );
}
