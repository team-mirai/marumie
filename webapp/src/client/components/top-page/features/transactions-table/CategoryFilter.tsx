"use client";
import "client-only";

import { useState } from "react";
import Image from "next/image";
import { PL_CATEGORIES, type CategoryMapping } from "@/shared/accounting/account-category";

interface CategoryItem {
  id: string;
  label: string;
  checked: boolean;
}

const INCOME_CATEGORIES: CategoryItem[] = Object.entries(PL_CATEGORIES)
  .filter(([, mapping]: [string, CategoryMapping]) => mapping.type === "income")
  .map(([, mapping]: [string, CategoryMapping]) => ({
    id: mapping.key,
    label: mapping.shortLabel,
    checked: false,
  }));

const EXPENSE_CATEGORIES: CategoryItem[] = Object.entries(PL_CATEGORIES)
  .filter(([, mapping]: [string, CategoryMapping]) => mapping.type === "expense")
  .map(([, mapping]: [string, CategoryMapping]) => ({
    id: mapping.key,
    label: mapping.shortLabel,
    checked: false,
  }));

interface CategoryFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (selectedKeys: string[]) => void;
  selectedCategories?: string[];
}

export default function CategoryFilter({
  isOpen,
  onClose,
  onApplyFilter,
  selectedCategories = [],
}: CategoryFilterProps) {
  const [incomeCategories, setIncomeCategories] = useState(() =>
    INCOME_CATEGORIES.map((cat) => ({
      ...cat,
      checked: selectedCategories.includes(cat.id),
    })),
  );
  const [expenseCategories, setExpenseCategories] = useState(() =>
    EXPENSE_CATEGORIES.map((cat) => ({
      ...cat,
      checked: selectedCategories.includes(cat.id),
    })),
  );

  if (!isOpen) return null;

  const handleIncomeToggle = (id: string) => {
    setIncomeCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, checked: !cat.checked } : cat)),
    );
  };

  const handleExpenseToggle = (id: string) => {
    setExpenseCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, checked: !cat.checked } : cat)),
    );
  };

  const handleIncomeSelectAll = () => {
    const allChecked = incomeCategories.every((cat) => cat.checked);
    setIncomeCategories((prev) => prev.map((cat) => ({ ...cat, checked: !allChecked })));
  };

  const handleExpenseSelectAll = () => {
    const allChecked = expenseCategories.every((cat) => cat.checked);
    setExpenseCategories((prev) => prev.map((cat) => ({ ...cat, checked: !allChecked })));
  };

  const handleCancel = () => {
    onClose();
  };

  const handleOk = () => {
    const selectedKeys = [
      ...incomeCategories.filter((cat) => cat.checked).map((cat) => cat.id),
      ...expenseCategories.filter((cat) => cat.checked).map((cat) => cat.id),
    ];

    onApplyFilter(selectedKeys);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-[2px_4px_8px_0px_rgba(0,0,0,0.1)] z-[9999] p-4">
      <div className="flex flex-col gap-4">
        {/* カテゴリーセクション */}
        <div className="flex gap-6">
          {/* 収入カテゴリー */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-600 text-sm font-medium leading-[1.67]">
                  収入カテゴリー
                </span>
              </div>
              <div className="flex flex-col">
                {/* すべて選択オプション */}
                <button
                  type="button"
                  onClick={handleIncomeSelectAll}
                  className="flex items-center gap-2 py-[6px] px-1 w-[236px] h-auto hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                >
                  <div className="w-[18px] h-[18px] flex items-center justify-center">
                    {incomeCategories.every((cat) => cat.checked) && (
                      <div className="w-[18px] h-[18px] relative">
                        <Image
                          src="/icons/icon-checkmark.svg"
                          alt="Checkmark"
                          width={13}
                          height={11}
                          className="absolute top-[4px] left-[2.5px]"
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[13px] leading-[1.31] text-left flex-1 ${
                      incomeCategories.every((cat) => cat.checked) ? "font-semibold" : "font-medium"
                    } text-[#47474C]`}
                  >
                    （すべて選択）
                  </span>
                </button>
                <div className="pl-4">
                  {incomeCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleIncomeToggle(category.id)}
                      className="flex items-center gap-2 py-[6px] px-1 w-[200px] h-auto hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                    >
                      <div className="w-[18px] h-[18px] flex items-center justify-center">
                        {category.checked && (
                          <div className="w-[18px] h-[18px] relative">
                            <Image
                              src="/icons/icon-checkmark.svg"
                              alt="Checkmark"
                              width={13}
                              height={11}
                              className="absolute top-[4px] left-[2.5px]"
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[13px] leading-[1.54] text-left flex-1 ${
                          category.checked ? "font-semibold" : "font-medium"
                        } text-[#47474C]`}
                      >
                        {category.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 支出カテゴリー */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center">
                <span className="text-gray-600 text-sm font-medium leading-[1.67] w-[212px]">
                  支出カテゴリー
                </span>
              </div>

              <div className="flex flex-col">
                {/* すべて選択オプション */}
                <button
                  type="button"
                  onClick={handleExpenseSelectAll}
                  className="flex items-center gap-2 py-[6px] px-1 w-[236px] h-auto hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                >
                  <div className="w-[18px] h-[18px] flex items-center justify-center">
                    {expenseCategories.every((cat) => cat.checked) && (
                      <div className="w-[18px] h-[18px] relative">
                        <Image
                          src="/icons/icon-checkmark.svg"
                          alt="Checkmark"
                          width={13}
                          height={11}
                          className="absolute top-[4px] left-[2.5px]"
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[13px] leading-[1.31] text-left flex-1 ${
                      expenseCategories.every((cat) => cat.checked)
                        ? "font-semibold"
                        : "font-medium"
                    } text-[#47474C]`}
                  >
                    （すべて選択）
                  </span>
                </button>
                <div className="pl-4">
                  {expenseCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleExpenseToggle(category.id)}
                      className="flex items-center gap-2 py-[6px] px-1 w-[200px] h-auto hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                    >
                      <div className="w-[18px] h-[18px] flex items-center justify-center">
                        {category.checked && (
                          <div className="w-[18px] h-[18px] relative">
                            <Image
                              src="/icons/icon-checkmark.svg"
                              alt="Checkmark"
                              width={13}
                              height={11}
                              className="absolute top-[4px] left-[2.5px]"
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[13px] leading-[1.54] text-left flex-1 ${
                          category.checked ? "font-semibold" : "font-medium"
                        } text-[#47474C]`}
                      >
                        {category.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-center items-center gap-4 w-full">
          <button
            type="button"
            onClick={handleCancel}
            className="flex justify-center items-center gap-[10px] py-2 px-4 w-[120px] bg-[#F1F5F9] border-[0.5px] border-[#D1D5DB] rounded-[6px] hover:opacity-70 transition-opacity cursor-pointer"
          >
            <span className="text-[#238778] text-sm font-medium leading-[1.29]">キャンセル</span>
          </button>
          <button
            type="button"
            onClick={handleOk}
            className="flex justify-center items-center gap-[10px] py-2 px-4 w-[120px] bg-[#238778] rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="text-white text-sm font-medium leading-[1.29]">OK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
