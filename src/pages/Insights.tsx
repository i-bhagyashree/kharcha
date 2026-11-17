import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { byCategory, expensesOnly, myShare } from "../lib/balances";
import { CATEGORIES, category } from "../lib/categories";
import { updateSettings, useData } from "../lib/store";
import { addMonths, daysInMonth, inr, inrShort, monthName, parseIso, thisMonth, today } from "../lib/utils";
import { Icon } from "../components/Icon";
import { AmountInput, Card, CategoryIcon, cx, Empty, PageHeader, Progress, SectionTitle } from "../components/ui";

// ================================================================ BUDGET

export function Budget() {
  const data = useData();
  const { settings } = data;
  const month = thisMonth();
  const exps = expensesOnly(data.entries).filter((e) => e.date.startsWith(month));
  const spent = exps.reduce((s, e) => s + myShare(e), 0);
  const day = Number(today().slice(8));
  const dim = daysInMonth(month);
  const projected = (spent / day) * dim;
  const [text, setText] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : "");
  const cats = new Map(byCategory(exps).map((c) => [c.name, c.amount]));

  return (
    <div>
      <PageHeader back title="Budget" subtitle={`${monthName(month, true)} · ${dim - day + 1} din bache`} />
      <Card className="p-5">
        <p className="text-sm font-medium">Mahine ka kul budget</p>
        <div className="mt-2">
          <AmountInput
            text={text}
            onText={(t, v) => {
              setText(t);
              if (v !== null) updateSettings({ monthlyBudget: v });
              if (!t.trim()) updateSettings({ monthlyBudget: 0 });
            }}
          />
        </div>
        {settings.monthlyBudget > 0 && (
          <>
            <div className="mt-2 flex justify-between text-sm">
              <span>Kharch: {inr(spent)}</span>
              <span className={spent > settings.monthlyBudget ? "font-semibold text-rose-600" : "text-slate-500"}>{Math.round((spent / settings.monthlyBudget) * 100)}%</span>
            </div>
            <Progress value={spent} max={settings.monthlyBudget} className="mt-1.5 h-3" />
            {/* Where the month is heading at today's pace */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500">Roz kitna kharch kar sakte ho</p>
                <p className="text-lg font-bold tabular text-brand-600 dark:text-brand-400">{inr(Math.floor(Math.max(0, (settings.monthlyBudget - spent) / (dim - day + 1))))}</p>
              </div>
              <div className={cx("rounded-xl p-3", projected > settings.monthlyBudget ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40")}>
                <p className="text-xs text-slate-500">Isi raftaar se mahine ke ant tak</p>
                <p className={cx("text-lg font-bold tabular", projected > settings.monthlyBudget ? "text-rose-600" : "text-emerald-600")}>{inr(Math.round(projected))}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {projected > settings.monthlyBudget ? `⚠️ Aise hi chala toh ${inr(projected - settings.monthlyBudget)} zyada ho jayega.` : `👍 Sahi raaste pe ho — lagbhag ${inr(settings.monthlyBudget - projected)} bachenge.`}
            </p>
          </>
        )}
      </Card>

      <SectionTitle>Category ka budget</SectionTitle>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {CATEGORIES.map((c) => {
          const limit = settings.categoryBudgets[c.name] ?? 0;
          const s = cats.get(c.name) ?? 0;
          return (
            <div key={c.name} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <CategoryIcon name={c.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500 tabular">
                    {inr(s)}
                    {limit > 0 && ` / ${inr(limit)}`}
                  </p>
                </div>
                <input
                  inputMode="numeric"
                  defaultValue={limit || ""}
                  placeholder="Limit ₹"
                  aria-label={`${c.name} budget`}
                  onBlur={(e) => updateSettings({ categoryBudgets: { ...settings.categoryBudgets, [c.name]: Number(e.target.value.replace(/\D/g, "")) || 0 } })}
                  className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              {limit > 0 && <Progress value={s} max={limit} color={c.color} className="mt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================ REPORTS

const WEEKDAYS = ["Ravi", "Som", "Mangal", "Budh", "Guru", "Shukra", "Shani"];

export function Reports() {
  const data = useData();
  const [month, setMonth] = useState(thisMonth());
  const all = useMemo(() => expensesOnly(data.entries), [data.entries]);
  const exps = all.filter((e) => e.date.startsWith(month));
  const total = exps.reduce((s, e) => s + myShare(e), 0);
  const cats = byCategory(exps);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5);
    return { m, label: monthName(m).split(" ")[0], value: Math.round(all.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + myShare(e), 0)) };
  });

  const isCurrent = month === thisMonth();
  const daysCounted = isCurrent ? Number(today().slice(8)) : daysInMonth(month);
  const spendDays = new Set(exps.filter((e) => myShare(e) > 0).map((e) => e.date));
  const noSpend = daysCounted - [...spendDays].filter((d) => Number(d.slice(8)) <= daysCounted).length;

  const byWeekday = WEEKDAYS.map((name, i) => ({ name, value: Math.round(exps.filter((e) => parseIso(e.date).getDay() === i).reduce((s, e) => s + myShare(e), 0)) }));
  const topDay = [...byWeekday].sort((a, b) => b.value - a.value)[0];
  const modes = ["upi", "cash", "card", "other"].map((m) => ({ m, v: exps.filter((e) => e.mode === m).reduce((s, e) => s + myShare(e), 0) })).filter((x) => x.v > 0);
  const biggest = [...exps].sort((a, b) => myShare(b) - myShare(a))[0];
  const titles = new Map<string, { n: number; v: number }>();
  for (const e of exps) {
    const k = e.title.toLowerCase();
    const t = titles.get(k) ?? { n: 0, v: 0 };
    titles.set(k, { n: t.n + 1, v: t.v + myShare(e) });
  }
  const frequent = [...titles].filter(([, t]) => t.n >= 2).sort((a, b) => b[1].n - a[1].n).slice(0, 3);

  return (
    <div>
      <PageHeader back title="Report" subtitle="Paisa kahan gaya — tasveer me" />
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800" aria-label="Pichhla mahina">
          <Icon name="back" />
        </button>
        <p className="font-semibold">{monthName(month, true)}</p>
        <button onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Agla mahina">
          <Icon name="next" />
        </button>
      </div>

      {exps.length === 0 ? (
        <Empty emoji="📊" title="Is mahine ka data nahi" text="Kharche jodte raho, yahan sundar report banegi." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <p className="font-semibold">Category se</p>
              <div className="relative mx-auto h-52 max-w-xs">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cats} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                      {cats.map((c) => (
                        <Cell key={c.name} fill={category(c.name).color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => inr(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-xs text-slate-500">Kul</p>
                    <p className="text-xl font-bold tabular">{inrShort(total)}</p>
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {cats.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm">
                    <span>{category(c.name).emoji}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-slate-400">{Math.round((c.amount / total) * 100)}%</span>
                    <span className="w-20 text-right font-semibold tabular">{inr(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-4">
              <Card className="p-4">
                <p className="font-semibold">Pichhle 6 mahine</p>
                <div className="mt-2 h-44">
                  <ResponsiveContainer>
                    <BarChart data={trend} margin={{ left: -12, right: 4, top: 8 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                      <Tooltip formatter={(v) => inr(Number(v))} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                        {trend.map((t) => (
                          <Cell key={t.m} fill={t.m === month ? "#6526ef" : "#c4b5fd"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <p className="text-2xl">🧘</p>
                  <p className="mt-1 text-2xl font-bold">{noSpend}</p>
                  <p className="text-xs text-slate-500">Bina kharche wale din</p>
                </Card>
                <Card className="p-4">
                  <p className="text-2xl">📅</p>
                  <p className="mt-1 text-2xl font-bold tabular">{inr(Math.round(total / daysCounted))}</p>
                  <p className="text-xs text-slate-500">Roz ka average</p>
                </Card>
              </div>
            </div>
          </div>

          <Card className="p-4">
            <p className="font-semibold">Hafte ke kis din zyada kharcha?</p>
            <div className="mt-3 flex h-28 items-end gap-2">
              {byWeekday.map((d) => (
                <div key={d.name} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md" style={{ height: `${topDay.value ? Math.max(4, (d.value / topDay.value) * 88) : 4}px`, background: d === topDay && d.value > 0 ? "#f97316" : "#cbd5e1" }} title={inr(d.value)} />
                  <span className="text-[10px] text-slate-500">{d.name.slice(0, 3)}</span>
                </div>
              ))}
            </div>
            {topDay.value > 0 && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{topDay.name}vaar ko sabse zyada kharcha hota hai ({inr(topDay.value)}).</p>}
          </Card>

          <Card className="p-4">
            <p className="font-semibold">Kharcha kahani 📖</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {biggest && (
                <li>
                  💸 Sabse bada kharcha: <b>{biggest.title}</b> — {inr(myShare(biggest))}
                </li>
              )}
              {cats[0] && (
                <li>
                  {category(cats[0].name).emoji} Sabse zyada paisa <b>{cats[0].name}</b> pe gaya — har ₹100 me se ₹{Math.round((cats[0].amount / total) * 100)}
                </li>
              )}
              {frequent.map(([t, v]) => (
                <li key={t}>
                  🔁 <b className="capitalize">{t}</b> pe {v.n} baar, kul {inr(v.v)}
                </li>
              ))}
              {modes.length > 0 && <li>💳 {modes.map((m) => `${m.m.toUpperCase()} ${Math.round((m.v / total) * 100)}%`).join(" · ")}</li>}
              {trend[4].value > 0 && (
                <li>
                  {trend[5].value > trend[4].value ? "📈" : "📉"} Pichhle mahine se {inr(Math.abs(trend[5].value - trend[4].value))} {trend[5].value > trend[4].value ? "zyada" : "kam"}
                  {isCurrent && " (abhi mahina chal raha hai)"}
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
