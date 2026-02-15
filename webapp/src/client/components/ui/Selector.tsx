"use client";
import "client-only";
import { useId, useRef, useState } from "react";
import Image from "next/image";

interface SelectorOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SelectorProps {
  options: SelectorOption[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  title: string;
  onSelect?: (value: string) => void;
}

export default function Selector({
  options,
  defaultValue,
  value,
  placeholder = "選択してください",
  title,
  onSelect,
}: SelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || "");

  const uniqueId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const currentValue = value !== undefined ? value : selectedValue;

  const selectedOption = options.find((option) => option.value === currentValue);

  const openMenu = () => {
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    // 閉じられたときに、元の開くボタンにフォーカスを戻す
    requestAnimationFrame(() => {
      openButtonRef.current?.focus();
    });
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleSelect = (newValue: string) => {
    if (value === undefined) {
      setSelectedValue(newValue);
    }
    closeMenu();
    onSelect?.(newValue);
  };

  return (
    <div className="relative w-full min-w-0 max-w-full">
      {/* Closed State Button */}
      <button
        type="button"
        className="flex items-center justify-between w-full min-w-0 px-2 py-2 lg:px-4 lg:py-2.5 border border-gray-600 rounded-md text-gray-800 text-sm lg:text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
        style={{
          background:
            "linear-gradient(90deg, rgba(226, 246, 243, 1) 0%, rgba(238, 246, 226, 1) 100%)",
        }}
        onClick={() => toggleMenu()}
        ref={openButtonRef}
        role="combobox"
        aria-haspopup="menu"
        aria-controls={`${uniqueId}-options-list`}
        aria-expanded={isOpen}
        aria-label={selectedOption ? `${title}, 現在の選択: ${selectedOption.label}` : title}
        // 開いている間、このボタンは隠れた状態になり、閉じる操作は前面に表示されるボタンが請け負う
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        {/* aria-hidden: 現在の選択項目の表現はbuttonのaria-labelに委ねる */}
        <span className="text-left truncate flex-1 min-w-0" aria-hidden="true">
          {selectedOption?.label || placeholder}
        </span>
        <Image
          src="/icons/icon-chevron-down.svg"
          alt=""
          width={20}
          height={20}
          className={isOpen ? "rotate-180" : ""}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-0 right-0 w-full bg-white border border-gray-600 rounded-md shadow-lg z-50">
          <div className="space-y-0">
            {/* Header */}
            <button
              type="button"
              className="flex items-center justify-between w-full px-4 py-2.5 bg-white rounded-md text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => closeMenu()}
              ref={(el) => el?.focus()}
              role="combobox"
              aria-haspopup="listbox"
              aria-controls={`${uniqueId}-options-list`}
              aria-expanded={isOpen}
            >
              <span className="text-left truncate">{title}</span>
              <Image
                src="/icons/icon-chevron-down.svg"
                alt=""
                width={20}
                height={20}
                className="rotate-180"
              />
            </button>

            {/* Options List */}
            <div className="px-2 lg:px-4 space-y-1" id={`${uniqueId}-options-list`} role="listbox">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex items-start gap-2 w-full cursor-pointer hover:bg-gray-50 px-1 py-2 rounded"
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={currentValue === option.value}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center w-[18px] h-[18px] mt-0.5">
                    {currentValue === option.value && (
                      <Image src="/icons/icon-checkmark.svg" alt="" width={13} height={11} />
                    )}
                  </div>

                  {/* Option Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-bold text-gray-600 leading-5">{option.label}</div>
                    {option.subtitle && (
                      <div className="text-[9px] text-gray-600 leading-tight mt-1">
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
