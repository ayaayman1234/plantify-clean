"use client";

import {useEffect} from "react";
import {useLocale} from "next-intl";

const LOCALE_STORAGE_KEY = "plantify.locale";

function persistLocale(nextLocale: string) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleSync() {
  const locale = useLocale();

  useEffect(() => {
    // Keep client storage aligned with the locale already chosen by the server.
    // Reading an old locale from localStorage and switching on mount causes hydration mismatches.
    persistLocale(locale);
  }, [locale]);

  return null;
}
