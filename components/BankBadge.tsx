"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { getBankMeta, getBankLogoUrl, getBankFaviconUrl } from "@/lib/bankMeta";

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
  const iconBox = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  // Logo: эхлээд Clearbit, амжилтгүй бол Google favicon, амжилтгүй бол Landmark icon
  const [logoStage, setLogoStage] = useState<"clearbit" | "favicon" | "icon">(
    meta.domain ? "clearbit" : "icon"
  );

  const logoUrl =
    logoStage === "clearbit"
      ? getBankLogoUrl(meta.domain)
      : logoStage === "favicon"
        ? getBankFaviconUrl(meta.domain, 64)
        : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${meta.className} ${padding}`}
      title={meta.fullName}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          width={size === "sm" ? 12 : 16}
          height={size === "sm" ? 12 : 16}
          className={`${iconBox} object-contain rounded-sm`}
          onError={() => {
            // Clearbit → favicon → Landmark icon
            if (logoStage === "clearbit") setLogoStage("favicon");
            else if (logoStage === "favicon") setLogoStage("icon");
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <Landmark className={iconBox} />
      )}
      {full ? meta.fullName : meta.shortName}
    </span>
  );
}
