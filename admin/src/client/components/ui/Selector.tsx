"use client";
import "client-only";

import { useId } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export default function Selector({
  value,
  onChange,
  options,
  label,
  className = "bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-primary-accent",
  placeholder = "選択してください",
  required = false,
}: SelectorProps) {
  const selectId = useId();

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
