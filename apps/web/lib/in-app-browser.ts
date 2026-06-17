"use client";

import { useEffect, useState } from "react";

/**
 * Embedded webview (in-app browser) илрүүлэх.
 *
 * Google OAuth нь Messenger, Facebook, Instagram, TikTok зэрэг апп-уудын
 * дотоод browser (embedded webview)-ээс нэвтрэхийг хориглодог
 * (Error 403: disallowed_useragent). Тийм орчинд Google товчийг идэвхгүй
 * болгож, хэрэглэгчийг жинхэнэ browser-аар нээхийг сануулна.
 */
export function isInAppBrowser(ua: string): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();

  // Facebook / Messenger
  if (/\bfban\b|\bfbav\b|\bfb_iab\b|\bfbios\b|messenger/.test(s)) return true;
  // Instagram
  if (/instagram/.test(s)) return true;
  // TikTok / ByteDance
  if (/bytedance|musical_ly|tiktok|trill\b/.test(s)) return true;
  // Бусад нийтлэг in-app browser-ууд
  if (/\bline\b|micromessenger|\bkakaotalk\b|\bsnapchat\b|\btwitter\b|\bwv\b/.test(s)) {
    return true;
  }

  return false;
}

/** Client-side hook — одоогийн browser нь in-app webview эсэхийг буцаана. */
export function useIsInAppBrowser(): boolean {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setInApp(isInAppBrowser(navigator.userAgent));
    }
  }, []);

  return inApp;
}
