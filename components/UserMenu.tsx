"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, ChevronDown, FileText, Tags, Building2, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface Props {
  email: string;
  name?: string | null;
  /** "header" — баруун дээрээс доош нээнэ. "sidebar" — зүүн доороос дээш нээнэ. */
  variant?: "header" | "sidebar";
}

export default function UserMenu({ email, name, variant = "header" }: Props) {
  const { data: session } = useSession();
  const userType = (session?.user as { userType?: string | null } | undefined)?.userType;
  const isBusiness = userType === "business";
  const isPersonal = userType === "personal";

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const display = name || email;
  const isSidebar = variant === "sidebar";

  // Click-outside + Escape — document-level listener тул z-index давтлагад нөлөөлөхгүй
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={
          isSidebar
            ? "flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            : "flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150 hover:scale-[1.02]"
        }
      >
        <div className="w-7 h-7 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center transition-transform duration-200">
          {isBusiness ? (
            <Building2 className="w-4 h-4 text-blue-600" />
          ) : (
            <UserIcon className="w-4 h-4 text-blue-600" />
          )}
        </div>
        <span className={`truncate ${isSidebar ? "flex-1 text-left" : "max-w-[140px]"}`}>{display}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={
            isSidebar
              ? "absolute bottom-full left-0 mb-1 w-full min-w-[15rem] bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 origin-bottom-left animate-pop-in"
              : "absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 origin-top-right animate-pop-in"
          }
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">Нэвтэрсэн</p>
            <p className="text-sm font-medium text-gray-800 truncate">{email}</p>
            {(isBusiness || isPersonal) && (
              <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isBusiness
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isBusiness ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                {isBusiness ? "Байгууллага" : "Хувь хүн"}
              </span>
            )}
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            Миний профайл
          </Link>
          <Link
            href="/categories"
            onClick={() => setOpen(false)}
            className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Tags className="w-4 h-4 text-gray-400" />
            Ангиллын каталог
          </Link>
          <Link
            href="/statements"
            onClick={() => setOpen(false)}
            className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            Хуулга удирдах
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Гарах
          </button>
        </div>
      )}
    </div>
  );
}
