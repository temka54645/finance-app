"use client";

import { Landmark } from "lucide-react";
import { getBankMeta } from "@/lib/bankMeta";

interface Props {
  bankName: string | null | undefined;
  /** "sm" — гүйлгээний мөр дотор, "md" — breakdown card дотор */
  size?: "sm" | "md";
  /** Бүтэн нэрийг харуулах эсэх (default: shortName) */
  full?: boolean;
}

export default function BankBadge({ bankName, size = "sm", full = false }: Props) {
  const meta = getBankMeta(bankName);
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${meta.className} ${padding}`}
      title={meta.fullName}
    >
      <Landmark className={iconSize} />
      {full ? meta.fullName : meta.shortName}
    </span>
  );
}
