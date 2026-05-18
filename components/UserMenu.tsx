"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, ChevronDown, FileText } from "lucide-react";
import { signOut } from "next-auth/react";

interface Props {
  email: string;
  name?: string | null;
}

export default function UserMenu({ email, name }: Props) {
  const [open, setOpen] = useState(false);
  const display = name || email;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-blue-600" />
        </div>
        <span className="max-w-[140px] truncate">{display}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400">Нэвтэрсэн</p>
              <p className="text-sm font-medium text-gray-800 truncate">{email}</p>
            </div>
            <Link
              href="/statements"
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-gray-400" />
              Хуулга удирдах
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Гарах
            </button>
          </div>
        </>
      )}
    </div>
  );
}
