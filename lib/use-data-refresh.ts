"use client";

import { useEffect } from "react";

/**
 * Хуулга орсон / шинэчлэх товч дарагдсан үед бүх дата татдаг
 * client component-уудыг нэг дор сэргээх энгийн event-bus.
 *
 * AppShell `emitDataChanged()`-ийг дуудна; BreakdownClient, MonthlyBarChart,
 * DashboardClient зэрэг нь `useDataRefresh(cb)`-аар
 * сонсож, өөрсдийн fetch-ээ дахин ажиллуулна.
 */
export const DATA_CHANGED_EVENT = "finmate:data-changed";

export function emitDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }
}

export function useDataRefresh(cb: () => void) {
  useEffect(() => {
    const handler = () => cb();
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, [cb]);
}
