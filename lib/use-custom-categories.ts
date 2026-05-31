"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserType } from "@/lib/categories";

export interface CustomCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  userType: UserType;
}

/**
 * Хэрэглэгчийн өөрөө нэмсэн ангиллуудыг авах hook.
 * `userType` өгвөл зөвхөн тухайн горимын ангиллуудыг шүүж буцаана.
 */
export function useCustomCategories(userType?: UserType) {
  const [all, setAll] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) return;
      const data = await res.json();
      setAll(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const scoped = userType ? all.filter(c => c.userType === userType) : all;
  const income = scoped.filter(c => c.type === "income");
  const expense = scoped.filter(c => c.type === "expense");

  return { all, income, expense, loading, reload };
}
