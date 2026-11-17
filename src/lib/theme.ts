// Light, Dark (deep navy), Black (pure black, saves battery on AMOLED phones) or System.

import { useEffect, useSyncExternalStore } from "react";
import type { Settings } from "./types";

export type ThemeChoice = Settings["theme"];
export type Effective = "light" | "dark" | "black";

const query = () => window.matchMedia("(prefers-color-scheme: dark)");
const subscribe = (cb: () => void) => {
  const mq = query();
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useSystemDark = () => useSyncExternalStore(subscribe, () => query().matches);

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): Effective {
  if (choice === "system") return systemDark ? "dark" : "light";
  return choice;
}

const META: Record<Effective, string> = { light: "#f8fafc", dark: "#020617", black: "#000000" };

/** Applies the theme to <html> and returns which one is showing. */
export function useAppliedTheme(choice: ThemeChoice): Effective {
  const effective = resolveTheme(choice, useSystemDark());
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", effective !== "light");
    root.classList.toggle("black", effective === "black");
    root.style.colorScheme = effective === "light" ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META[effective]);
  }, [effective]);
  return effective;
}

/** Header button: Light → Dark → Black → Light */
export const nextTheme = (current: Effective): ThemeChoice => (current === "light" ? "dark" : current === "dark" ? "black" : "light");

export const THEME_LABEL: Record<Effective, string> = { light: "Light", dark: "Dark", black: "Black" };
