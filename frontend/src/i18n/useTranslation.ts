import { useMemo } from "react";
import { ru } from "./ru";

type Locale = typeof ru;

export function useTranslation(): { t: Locale } {
  return useMemo(
    () => ({
      t: ru,
    }),
    []
  );
}
