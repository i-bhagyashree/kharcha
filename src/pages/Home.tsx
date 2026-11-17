import { useMemo, useState } from "react";
import { balancesWithMe, expensesOnly, myShare, totals } from "../lib/balances";
import { demoData } from "../lib/demo";
import { alerts } from "../lib/household";
import { replaceAll, updateSettings, useData } from "../lib/store";
import { navigate, openSheet, showToast } from "../lib/ui";
import { addDays, addMonths, daysInMonth, greeting, inr, monthName, thisMonth, today } from "../lib/utils";
import { EntryRow } from "../components/EntryRow";
import { Icon } from "../components/Icon";
import { Button, Card, cx, SectionTitle, TextInput } from "../components/ui";

export function Home() {
  const data = useData();
  const month = thisMonth();
  const t = today();
  const dayOfMonth = Number(t.slice(8));

  const stats = useMemo(() => {
    const exps = expensesOnly(data.entries);
    const sumWhere = (f: (date: string) => boolean) => exps.filter((e) => f(e.date)).reduce((s, e) => s + myShare(e), 0);
    const weekStart = addDays(t, -6);
    const prevMonth = addMonths(month, -1);
    const prevSameDay = `${prevMonth}-${String(Math.min(dayOfMonth, daysInMonth(prevMonth))).padStart(2, "0")}`;
    return {
      month: sumWhere((d) => d.startsWith(month)),
      today: sumWhere((d) => d === t),
      week: sumWhere((d) => d >= weekStart && d <= t),
      // Fair comparison: this month so far vs the same number of days last month.
      prevSoFar: sumWhere((d) => d.startsWith(prevMonth) && d <= prevSameDay),
    };
  }, [data.entries, month, t, dayOfMonth]);

  const bal = useMemo(() => balancesWithMe(data.entries), [data.entries]);
  const { lena, dena } = totals(bal);
  const lenaCount = [...bal.values()].filter((v) => v > 0.009).length;
  const denaCount = [...bal.values()].filter((v) => v < -0.009).length;
  const notes = useMemo(() => alerts(data), [data]);
  const recent = useMemo(() => [...data.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [data.entries]);

  const budget = data.settings.monthlyBudget;
  const daysLeft = daysInMonth(month) - dayOfMonth + 1;
  const perDay = budget > 0 ? Math.max(0, (budget - stats.month) / daysLeft) : 0;
  const change = stats.prevSoFar > 0 ? Math.round(((stats.month - stats.prevSoFar) / stats.prevSoFar) * 100) : null;
  const isNew = data.entries.length === 0 && data.people.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}
            {data.settings.name ? `, ${data.settings.name.split(" ")[0]}` : ""} 👋
          </h1>
        </div>
      </div>

      {isNew && <Welcome />}

      {/* Quick add */}
      <button
        onClick={() => openSheet({ type: "quick" })}
        className="group flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-white p-3 text-left transition hover:border-brand-500 hover:bg-brand-50/50 dark:border-brand-800 dark:bg-slate-900 dark:hover:bg-brand-950/30"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lg shadow-brand-500/30">
          <Icon name="sparkle" className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Bolo ya likho...</span>
          <span className="block truncate text-sm text-slate-500 dark:text-slate-400">"chai 20" · "Rahul ko 500 diye" · "dinner 1200 Amit ke saath"</span>
        </span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300">
          <Icon name="mic" />
        </span>
      </button>

      {!isNew && (
        <>
          {/* Month hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-fuchsia-700 p-5 text-white shadow-xl shadow-brand-700/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/5" />
            <div className="relative">
              <p className="text-sm text-white/75">{monthName(month, true)} ka kharcha</p>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="text-4xl font-bold tracking-tight tabular">{inr(stats.month)}</p>
                {change !== null && (
                  <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", change > 0 ? "bg-rose-400/25 text-rose-50" : "bg-emerald-400/25 text-emerald-50")}>
                    {change > 0 ? "▲" : "▼"} {Math.abs(change)}% pichhle mahine se
                  </span>
                )}
              </div>
              {budget > 0 ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>Budget {inr(budget)}</span>
                    <span>{stats.month > budget ? `${inr(stats.month - budget)} zyada!` : `${inr(budget - stats.month)} bacha`}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={cx("h-full rounded-full", stats.month > budget ? "bg-rose-300" : "bg-white")}
                      style={{ width: `${Math.min(100, (stats.month / budget) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/90">
                    {stats.month > budget ? (
                      "Budget paar ho gaya, thoda sambhal ke 🙏"
                    ) : (
                      <>
                        Roz <b>{inr(Math.floor(perDay))}</b> tak kharch kar sakte ho ({daysLeft} din bache)
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <button onClick={() => navigate("/budget")} className="mt-3 rounded-full bg-white/15 px-3 py-1 text-sm font-medium hover:bg-white/25">
                  + Mahine ka budget set karo
                </button>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
                {[
                  ["Aaj", stats.today],
                  ["7 din", stats.week],
                  ["Roz ka avg", Math.round(stats.month / dayOfMonth)],
                ].map(([label, v]) => (
                  <div key={label as string}>
                    <p className="text-xs text-white/70">{label}</p>
                    <p className="font-semibold tabular">{inr(v as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lena / dena */}
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => navigate("/hisaab")} className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Icon name="arrowDown" className="h-4 w-4" /> Lena hai
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 tabular dark:text-emerald-400">{inr(lena)}</p>
              <p className="text-xs text-slate-500">{lenaCount ? `${lenaCount} log aapko denge` : "Kisi se kuch nahi"}</p>
            </Card>
            <Card onClick={() => navigate("/hisaab")} className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-rose-700 dark:text-rose-400">
                <Icon name="arrowUp" className="h-4 w-4" /> Dena hai
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-600 tabular dark:text-rose-400">{inr(dena)}</p>
              <p className="text-xs text-slate-500">{denaCount ? `${denaCount} logon ko dena` : "Koi karz nahi 🎉"}</p>
            </Card>
          </div>

          {notes.length > 0 && (
            <div>
              <SectionTitle>Dhyan dein</SectionTitle>
              <div className="space-y-2">
                {notes.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(a.link)}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition hover:brightness-[0.98]",
                      a.tone === "red" && "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
                      a.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
                      a.tone === "blue" && "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
                    )}
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <span className="flex-1">{a.text}</span>
                    <Icon name="next" className="h-4 w-4 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <SectionTitle
            action={
              recent.length > 0 && (
                <button onClick={() => navigate("/kharche")} className="text-sm font-medium text-brand-600 dark:text-brand-400">
                  Sab dekho →
                </button>
              )
            }
          >
            Haal ke entries
          </SectionTitle>
          {recent.length ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {recent.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-sm text-slate-500">Abhi koi entry nahi. Upar "Bolo ya likho" se shuru karo!</Card>
          )}
        </>
      )}
    </div>
  );
}

function Welcome() {
  const [name, setName] = useState("");
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-amber-50 to-rose-50 p-5 dark:from-amber-950/30 dark:to-rose-950/30">
        <p className="text-3xl">🙏</p>
        <h2 className="mt-2 text-xl font-bold">Kharcha me aapka swagat hai!</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Apna har kharcha, udhaar aur hisaab ek jagah. Sab kuch sirf aapke phone me save hota hai — koi login nahi, koi server nahi.
        </p>
        <div className="mt-4 flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Aapka naam" aria-label="Aapka naam" />
          <Button
            onClick={() => {
              updateSettings({ name: name.trim() });
              openSheet({ type: "quick" });
            }}
          >
            Shuru karo
          </Button>
        </div>
        <button
          onClick={() => {
            replaceAll(demoData(name.trim()));
            showToast("Demo data aa gaya — ghoom ke dekho! Settings se hata sakte ho.");
          }}
          className="mt-3 text-sm font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
        >
          Ya pehle demo data ke saath dekho →
        </button>
      </div>
    </Card>
  );
}
