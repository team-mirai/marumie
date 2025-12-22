"use client";
import "client-only";

import { useState, useId } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { AddressSearchDialog } from "@/client/components/counterparts/AddressSearchDialog";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

interface CounterpartFormProps {
  name: string;
  onNameChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  disabled: boolean;
}

export function CounterpartForm({
  name,
  onNameChange,
  address,
  onAddressChange,
  disabled,
}: CounterpartFormProps) {
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const nameId = useId();
  const addressId = useId();

  const canSearchAddress = name.trim() !== "";

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor={nameId}>
            名前 <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            id={nameId}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="取引先名を入力"
            disabled={disabled}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor={addressId}>住所</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddressSearch(true)}
              disabled={disabled || !canSearchAddress}
            >
              住所を検索
            </Button>
          </div>
          <Input
            type="text"
            id={addressId}
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            maxLength={MAX_ADDRESS_LENGTH}
            placeholder="住所を入力（任意）"
            disabled={disabled}
          />
        </div>
      </div>

      {showAddressSearch && (
        <AddressSearchDialog
          companyName={name}
          currentAddress={address}
          onClose={() => setShowAddressSearch(false)}
          onSelect={(selectedAddress) => {
            onAddressChange(selectedAddress);
            setShowAddressSearch(false);
          }}
        />
      )}
    </>
  );
}
