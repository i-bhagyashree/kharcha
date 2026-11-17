import { useEffect } from "react";
import { ExpenseForm } from "./components/ExpenseForm";
import { Icon, type IconName } from "./components/Icon";
import { GroupForm, PersonForm } from "./components/PersonGroupForms";
import { QuickAddSheet } from "./components/QuickAdd";
import { ReminderSheet } from "./components/ReminderSheet";
import { TransferForm } from "./components/TransferForm";
import { cx } from "./components/ui";
import { loadData, updateSettings, useData, useLoaded } from "./lib/store";
import { nextTheme, THEME_LABEL, useAppliedTheme, type Effective } from "./lib/theme";
import { hideToast, navigate, openSheet, useRoute, useSheet, useToast } from "./lib/ui";
import { Expenses } from "./pages/Expenses";
import { Home } from "./pages/Home";
import { Bills, Daily, Shopping } from "./pages/Household";
import { Budget, Reports } from "./pages/Insights";
import { More, Settings } from "./pages/More";
import { GroupPage, People, PersonPage } from "./pages/People";
import { Tools } from "./pages/Tools";

const NAV: { path: string; label: string; icon: IconName; match: string[] }[] = [
  { path: "/", label: "Home", icon: "home", match: [""] },
  { path: "/kharche", label: "Kharche", icon: "list", match: ["kharche"] },
  { path: "/hisaab", label: "Hisaab", icon: "users", match: ["hisaab", "person", "group"] },
  { path: "/tools", label: "Calculator", icon: "calc", match: ["tools"] },
  { path: "/more", label: "Aur", icon: "grid", match: ["more", "bills", "daily", "shopping", "budget", "reports", "settings"] },
];

const SIDE_EXTRA: { path: string; label: string; emoji: string }[] = [
  { path: "/bills", label: "Mahine ke bill", emoji: "🧾" },
  { path: "/daily", label: "Rozana khaata", emoji: "🥛" },
  { path: "/shopping", label: "Kya lena hai", emoji: "📝" },
  { path: "/budget", label: "Budget", emoji: "🎯" },
  { path: "/reports", label: "Report", emoji: "📊" },
  { path: "/settings", label: "Settings", emoji: "⚙️" },
];

function Page({ route }: { route: string[] }) {
  const [page, id] = route;
  switch (page ?? "") {
    case "":
      return <Home />;
    case "kharche":
      return <Expenses />;
    case "hisaab":
      return <People />;
    case "person":
      return <PersonPage id={id} />;
    case "group":
      return <GroupPage id={id} />;
    case "tools":
      return <Tools id={id} />;
    case "bills":
      return <Bills />;
    case "daily":
      return <Daily />;
    case "shopping":
      return <Shopping />;
    case "budget":
      return <Budget />;
    case "reports":
      return <Reports />;
    case "settings":
      return <Settings />;
    case "more":
      return <More />;
    default:
      return <Home />;
  }
}

function SheetHost() {
  const sheet = useSheet();
  if (!sheet) return null;
  // `key` makes each opened sheet start fresh.
  switch (sheet.type) {
    case "quick":
      return <QuickAddSheet key="quick" text={sheet.text} />;
    case "expense":
      return <ExpenseForm key={sheet.expense?.id ?? JSON.stringify(sheet.preset ?? {})} expense={sheet.expense} preset={sheet.preset} />;
    case "transfer":
      return <TransferForm key={sheet.transfer?.id ?? JSON.stringify(sheet.preset ?? {})} transfer={sheet.transfer} preset={sheet.preset} />;
    case "reminder":
      return <ReminderSheet personId={sheet.personId} />;
    case "person":
      return <PersonForm person={sheet.person} />;
    case "group":
      return <GroupForm group={sheet.group} />;
  }
}

function ToastHost() {
  const toast = useToast();
  const sheet = useSheet();
  if (!toast) return null;
  return (
    // While a sheet is open the toast moves to the top, so it never covers the form.
    <div className={cx("pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4", sheet ? "top-4" : "bottom-24 lg:bottom-6")} role="status">
      <div key={toast.id} className="animate-sheet pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 py-3 pl-4 pr-2 text-sm text-white shadow-2xl dark:bg-white dark:text-slate-900">
        <span className="flex-1">{toast.text}</span>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo!();
              hideToast();
            }}
            className="rounded-lg px-3 py-1.5 font-semibold text-brand-300 hover:bg-white/10 dark:text-brand-700 dark:hover:bg-slate-100"
          >
            Wapas lo
          </button>
        )}
        <button onClick={hideToast} className="grid h-8 w-8 place-items-center rounded-lg opacity-60 hover:opacity-100" aria-label="Band karo">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ThemeButton({ theme, small }: { theme: Effective; small?: boolean }) {
  const next = nextTheme(theme) as Effective;
  return (
    <button
      onClick={() => updateSettings({ theme: next })}
      title={`Theme: ${THEME_LABEL[theme]} (badal ke ${THEME_LABEL[next]} karo)`}
      aria-label={`Theme abhi ${THEME_LABEL[theme]} hai, ${THEME_LABEL[next]} karo`}
      className={cx("flex items-center gap-1.5 rounded-full text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800", small ? "h-8 px-2 text-xs" : "h-9 px-2.5 text-xs font-medium")}
    >
      <Icon name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "circle"} className={small ? "h-4 w-4" : "h-5 w-5"} />
      {THEME_LABEL[theme]}
    </button>
  );
}

export default function App() {
  const data = useData();
  const loaded = useLoaded();
  const route = useRoute();
  const sheet = useSheet();
  const theme = useAppliedTheme(data.settings.theme);

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard: "n" or "/" opens quick add (when not typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (sheet || e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "n" || e.key === "/") {
        e.preventDefault();
        openSheet({ type: "quick" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const current = route[0] ?? "";
  const isActive = (match: string[]) => match.includes(current);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 px-2 text-left">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xl font-black text-white shadow-lg shadow-brand-500/30">₹</span>
          <span>
            <span className="block text-xl font-extrabold tracking-tight">Kharcha</span>
            <span className="block text-xs text-slate-500">Apna hisaab, apne paas</span>
          </span>
        </button>
        <button onClick={() => openSheet({ type: "quick" })} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98]">
          <Icon name="plus" /> Naya kharcha
          <kbd className="ml-1 rounded bg-white/20 px-1.5 text-xs">N</kbd>
        </button>
        <nav className="mt-6 space-y-1">
          {NAV.slice(0, 4).map((n) => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              className={cx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(n.match) ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon name={n.icon} /> {n.label}
            </button>
          ))}
        </nav>
        <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ghar ka hisaab</p>
        <nav className="space-y-1">
          {SIDE_EXTRA.map((n) => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              className={cx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                current === n.path.slice(1) ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <span className="w-5 text-center">{n.emoji}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60">
          <span>🔒 Sirf aapke device me</span>
          <ThemeButton theme={theme} small />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/85 px-4 py-2.5 backdrop-blur lg:hidden dark:border-slate-800/70 dark:bg-slate-950/85">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500 font-black text-white">₹</span>
          <span className="text-lg font-extrabold tracking-tight">Kharcha</span>
        </button>
        <span className="flex-1" />
        <ThemeButton theme={theme} />
        <button onClick={() => navigate("/settings")} className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Settings">
          <Icon name="settings" className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4 lg:ml-64 lg:max-w-none lg:px-10 lg:pb-16 lg:pt-8">
        <div className="mx-auto max-w-3xl">{loaded ? <Page route={route} /> : <div className="py-20 text-center text-slate-400">Khul raha hai...</div>}</div>
      </main>

      {/* Mobile bottom nav with the big + in the middle */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {[NAV[0], NAV[1], null, NAV[2], NAV[4]].map((n, i) =>
            n ? (
              <button key={n.path} onClick={() => navigate(n.path)} className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive(n.match) ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400")} aria-current={isActive(n.match) ? "page" : undefined}>
                <Icon name={n.icon} className="h-6 w-6" strokeWidth={isActive(n.match) ? 2.4 : 1.8} />
                {n.label}
              </button>
            ) : (
              <div key={i} className="flex justify-center">
                <button onClick={() => openSheet({ type: "quick" })} className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-xl shadow-brand-600/40 ring-4 ring-slate-50 transition active:scale-95 dark:ring-slate-950" aria-label="Naya kharcha">
                  <Icon name="plus" className="h-7 w-7" strokeWidth={2.5} />
                </button>
              </div>
            ),
          )}
        </div>
      </nav>

      <SheetHost />
      <ToastHost />
    </div>
  );
}
