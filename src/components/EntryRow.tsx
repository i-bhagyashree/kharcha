import { effectWith, myShare } from "../lib/balances";
import { category } from "../lib/categories";
import { nameOf, useData } from "../lib/store";
import { ME, type Entry, type Who } from "../lib/types";
import { openSheet } from "../lib/ui";
import { inr, relativeDay } from "../lib/utils";
import { CategoryIcon, cx } from "./ui";

/** One line in any list. `person` shows the entry from that person's point of view (their hisaab page). */
export function EntryRow({ entry, person, showDate = true }: { entry: Entry; person?: Who; showDate?: boolean }) {
  const data = useData();
  const open = () => (entry.kind === "expense" ? openSheet({ type: "expense", expense: entry }) : openSheet({ type: "transfer", transfer: entry }));

  let icon: React.ReactNode;
  let title: string;
  let sub: string;
  let amount: React.ReactNode;

  if (entry.kind === "expense") {
    icon = <CategoryIcon name={entry.category} />;
    title = entry.title;
    const n = entry.shares.length;
    const mine = myShare(entry);
    const payer = entry.paidBy === ME ? "Aapne" : nameOf(entry.paidBy, data);
    sub = n > 1 || entry.paidBy !== ME ? `${payer} pay kiya · ${n} log` : category(entry.category).name;
    if (person) {
      const eff = effectWith(entry, person);
      amount = <Effect value={eff} total={entry.amount} />;
    } else {
      amount = (
        <div className="text-right">
          <p className="font-semibold tabular">{inr(mine)}</p>
          {mine !== entry.amount && <p className="text-xs text-slate-400 tabular">kul {inr(entry.amount)}</p>}
        </div>
      );
    }
  } else {
    const iGave = entry.from === ME;
    const other = iGave ? entry.to : entry.from;
    const otherName = nameOf(other, data);
    icon = (
      <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg", iGave ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-rose-50 dark:bg-rose-950/50")} aria-hidden="true">
        {entry.purpose === "settle" ? "✅" : iGave ? "↗️" : "↙️"}
      </span>
    );
    if (entry.from !== ME && entry.to !== ME) {
      title = `${nameOf(entry.from, data)} → ${nameOf(entry.to, data)}`;
      sub = entry.purpose === "settle" ? "Chukta kiya" : "Udhaar";
    } else if (entry.purpose === "settle") {
      title = iGave ? `${otherName} ko wapas diye` : `${otherName} ne wapas diye`;
      sub = entry.note ?? "Hisaab chukta";
    } else {
      title = iGave ? `${otherName} ko udhaar diya` : `${otherName} se udhaar liya`;
      sub = entry.note ?? (entry.dueDate ? `Lautana: ${relativeDay(entry.dueDate)}` : "Udhaar");
    }
    const eff = person ? effectWith(entry, person) : iGave ? entry.amount : -entry.amount;
    amount = person ? <Effect value={eff} total={entry.amount} /> : <p className={cx("font-semibold tabular", iGave ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{inr(entry.amount)}</p>;
  }

  return (
    <button onClick={open} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {showDate && `${relativeDay(entry.date)} · `}
          {sub}
        </p>
      </div>
      {amount}
    </button>
  );
}

function Effect({ value, total }: { value: number; total: number }) {
  if (Math.abs(value) < 0.01) return <p className="text-sm text-slate-400 tabular">{inr(total)}</p>;
  return (
    <div className="text-right">
      <p className={cx("font-semibold tabular", value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
        {value > 0 ? "+" : "−"}
        {inr(Math.abs(value))}
      </p>
      <p className="text-[11px] text-slate-400">{value > 0 ? "aapko milega" : "aapko dena"}</p>
    </div>
  );
}

/** Rows grouped under date headings, with the day's own spend. */
export function EntryList({ entries, person }: { entries: Entry[]; person?: Who }) {
  const days = new Map<string, Entry[]>();
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
    days.set(e.date, [...(days.get(e.date) ?? []), e]);
  }
  return (
    <div className="space-y-3">
      {[...days].map(([day, list]) => {
        const spent = list.reduce((s, e) => s + (e.kind === "expense" ? myShare(e) : 0), 0);
        return (
          <div key={day}>
            <div className="flex items-baseline justify-between px-1 pb-1.5">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{relativeDay(day)}</p>
              {!person && spent > 0 && <p className="text-xs text-slate-500 tabular">{inr(spent)}</p>}
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {list.map((e) => (
                <EntryRow key={e.id} entry={e} person={person} showDate={false} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
