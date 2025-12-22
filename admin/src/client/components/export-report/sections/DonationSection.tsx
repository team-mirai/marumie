"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { SectionWrapper } from "./SectionWrapper";
import type {
  PersonalDonationSection,
  PersonalDonationRow,
} from "@/server/contexts/report/domain/models/donation-transaction";

interface DonationSectionProps {
  personalDonations: PersonalDonationSection;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}/${month}/${day}`;
}

interface PersonalDonationTableProps {
  rows: PersonalDonationRow[];
}

function PersonalDonationTable({ rows }: PersonalDonationTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">明細はありません</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-black">
          <TableHead className="w-[50px] text-black">No.</TableHead>
          <TableHead className="w-[150px] text-black">寄附者氏名</TableHead>
          <TableHead className="w-[100px] text-right text-black">金額</TableHead>
          <TableHead className="w-[100px] text-black">年月日</TableHead>
          <TableHead className="w-[200px] text-black">住所</TableHead>
          <TableHead className="w-[100px] text-black">職業</TableHead>
          <TableHead className="w-[150px] text-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border-black">
            <TableCell className="text-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black">{row.kifusyaNm}</TableCell>
            <TableCell className="text-right text-black">{formatCurrency(row.kingaku)}</TableCell>
            <TableCell className="text-black">{formatDate(row.dt)}</TableCell>
            <TableCell className="text-black">{row.adr}</TableCell>
            <TableCell className="text-black">{row.syokugyo}</TableCell>
            <TableCell className="text-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DonationSection({ personalDonations }: DonationSectionProps) {
  const hasPersonalDonationData =
    personalDonations.rows.length > 0 || personalDonations.totalAmount > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">寄附 (SYUUSHI07_07)</h2>

      <SectionWrapper
        title="個人からの寄附"
        formId="KUBUN1"
        totalAmount={personalDonations.totalAmount}
        underThresholdAmount={personalDonations.sonotaGk}
        thresholdLabel="その他の寄附"
        isEmpty={!hasPersonalDonationData}
      >
        {hasPersonalDonationData ? (
          <PersonalDonationTable rows={personalDonations.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>
    </div>
  );
}
