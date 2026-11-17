import { useMemo, useState } from "react";
import { byCategory, expensesOnly, myShare } from "../lib/balances";
import { category } from "../lib/categories";
import { nameOf, useData } from "../lib/store";
import { openSheet } from "../lib/ui";
import { addMonths, download, inr, monthName, thisMonth } from "../lib/utils";
import { EntryList } from "../components/EntryRow";
import { Icon } from "../components/Icon";
import { Button, Card, Chip, Empty, PageHeader, Segmented } from "../components/ui";

export function Expenses() {
  const data = useData();
  const [month, setMonth] = useState(thisMonth());
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"kharche" | "sab">("kharche");

  const inMonth = useMemo(() => data.entries.filter((e) => e.date.startsWith(month)), [data.entries, month]);
  const exps = expensesOnly(inMonth);
  const cats = byCategory(exps);
  const total = exps.reduce((s, e) => s + myShare(e), 0);

  const list = inMonth.filter((e) => {
    if (show === "kharche" && e.kind !== "expense") return false;
    if (cat && (e.kind !== "expense" || e.category !== cat)) return false;
    if (q) {
      const text = e.kind === "expense" ? `${e.title} ${e.note ?? ""} ${e.category} ${e.shares.map((s) => nameOf(s.who, data)).join(" ")}` : `${nameOf(e.from, data)} ${nameOf(e.to, data)} ${e.note ?? ""}`;
      if (!text.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  });

  function exportCsv() {
    const rows = [["Date", "Kya", "Category", "Kul amount", "Aapka hissa", "Kisne pay kiya", "Mode", "Note"]];
    for (const e of expensesOnly(inMonth).sort((a, b) => a.date.localeCompare(b.date))) {
      rows.push([e.date, e.title, e.category, String(e.amount), String(myShare(e)), nameOf(e.paidBy, data), e.mode, e.note ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`kharcha-${month}.csv`, "﻿" + csv, "text/csv");
  }

  return (
    <div>
      <PageHeader
        title="Kharche"
        subtitle="Aapka har kharcha"
        action={
          <Button size="sm" variant="secondary" icon="download" onClick={exportCsv} className="hidden sm:inline-flex">
            Excel/CSV
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Pichhla mahina">
            <Icon name="back" />
          </button>
          <div className="text-center">
            <p className="text-sm text-slate-500">{monthName(month, true)}</p>
            <p className="text-3xl font-bold tabular">{inr(total)}</p>
            <p className="text-xs text-slate-500">{exps.length} kharche · sirf aapka hissa</p>
          </div>
          <button onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Agla mahina">
            <Icon name="next" />
          </button>
        </div>
        {cats.length > 0 && (
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {cats.map((c) => (
              <div key={c.name} title={`${c.name} ${inr(c.amount)}`} style={{ width: `${(c.amount / total) * 100}%`, background: category(c.name).color }} />
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondo: chai, Rahul, petrol..." aria-label="Dhoondo" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" />
        </div>
        <Segmented
          value={show}
          onChange={setShow}
          className="w-44 shrink-0"
          options={[
            { value: "kharche", label: "Kharche" },
            { value: "sab", label: "Sab" },
          ]}
        />
      </div>

      {cats.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip active={!cat} onClick={() => setCat("")}>
            Sab
          </Chip>
          {cats.map((c) => (
            <Chip key={c.name} active={cat === c.name} onClick={() => setCat(cat === c.name ? "" : c.name)} color={category(c.name).color}>
              {category(c.name).emoji} {c.name} <span className="opacity-70">{inr(c.amount)}</span>
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4">
        {list.length ? (
          <EntryList entries={list} />
        ) : (
          <Empty
            emoji={q || cat ? "🔍" : "🪙"}
            title={q || cat ? "Kuch nahi mila" : "Is mahine koi kharcha nahi"}
            text={q || cat ? "Kuch aur dhoondo" : "Pehla kharcha jodo — bas likho \"chai 20\""}
            action={!q && !cat && <Button icon="plus" onClick={() => openSheet({ type: "quick" })}>Kharcha jodo</Button>}
          />
        )}
      </div>
      <div className="mt-6 text-center sm:hidden">
        <Button size="sm" variant="ghost" icon="download" onClick={exportCsv}>
          Is mahine ka CSV (Excel) download karo
        </Button>
      </div>
    </div>
  );
}
