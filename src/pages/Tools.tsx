import { useState, type ReactNode } from "react";
import { amountInWords, byaaj, emi, gst, lumpsum, monthsToGoal, rentSplit, sip } from "../lib/calc";
import { useData } from "../lib/store";
import { navigate, openSheet, showToast } from "../lib/ui";
import { addDays, daysBetween, evalAmount, inr, round2, today } from "../lib/utils";
import { formatHours } from "../components/ExpenseForm";
import { Icon } from "../components/Icon";
import { AmountInput, Button, Card, Chip, cx, Field, NumberInput, PageHeader, Segmented, Stat, TextInput, Toggle, useLocalState } from "../components/ui";

interface Tool {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  isNew?: boolean;
  render: () => ReactNode;
}

const TOOLS: Tool[] = [
  { id: "split", emoji: "🍕", name: "Bill baanto", desc: "Kitne log, tip, har ek ka hissa", render: () => <SplitCalc /> },
  { id: "notes", emoji: "💵", name: "Note ginti", desc: "Cash gino: 500, 200, 100 ke note", isNew: true, render: () => <NotesCalc /> },
  { id: "byaaj", emoji: "🤝", name: "Udhaar byaaj", desc: "Sankda / saalana byaaj, din se din", isNew: true, render: () => <ByaajCalc /> },
  { id: "unit", emoji: "⚖️", name: "Kaunsa sasta?", desc: "Alag pack size ka asli daam", isNew: true, render: () => <UnitCalc /> },
  { id: "hours", emoji: "⏱️", name: "Kitne ghante ki kamaai", desc: "Cheez ka daam aapke kaam ke ghanton me", isNew: true, render: () => <HoursCalc /> },
  { id: "gst", emoji: "🧾", name: "GST", desc: "GST jodo ya nikalo, CGST/SGST", render: () => <GstCalc /> },
  { id: "discount", emoji: "🏷️", name: "Discount / Sale", desc: "50% + 20% off ka asli daam", render: () => <DiscountCalc /> },
  { id: "emi", emoji: "🏦", name: "EMI / Loan", desc: "Mahine ki kist aur kul byaaj", render: () => <EmiCalc /> },
  { id: "sip", emoji: "📈", name: "SIP / Bachat", desc: "Har mahine thoda, saalon me kitna", render: () => <SipCalc /> },
  { id: "goal", emoji: "🎯", name: "Sapna / Goal", desc: "Bike, phone, trip — kab tak?", isNew: true, render: () => <GoalCalc /> },
  { id: "rent", emoji: "🏠", name: "Kiraya baanto", desc: "Kamre ke size ke hisaab se rent", isNew: true, render: () => <RentCalc /> },
  { id: "fuel", emoji: "⛽", name: "Trip petrol", desc: "Doori, mileage, kitne log", render: () => <FuelCalc /> },
  { id: "percent", emoji: "➗", name: "Percentage", desc: "X ka Y%, badhat-ghatat", render: () => <PercentCalc /> },
  { id: "cheque", emoji: "✍️", name: "Cheque likho", desc: "Amount ko shabdon me (Lakh, Crore)", isNew: true, render: () => <ChequeCalc /> },
];

export function Tools({ id }: { id?: string }) {
  const tool = TOOLS.find((t) => t.id === id);
  if (tool)
    return (
      <div>
        <PageHeader back="/tools" title={`${tool.emoji} ${tool.name}`} subtitle={tool.desc} />
        <Card className="p-4 sm:p-5">{tool.render()}</Card>
      </div>
    );
  return (
    <div>
      <PageHeader title="Calculator" subtitle="Rozmarra ke hisaab, ek jagah" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Card key={t.id} onClick={() => navigate(`/tools/${t.id}`)} className="relative p-4">
            {t.isNew && <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900 dark:text-amber-200">Khaas</span>}
            <span className="text-3xl">{t.emoji}</span>
            <p className="mt-2 font-semibold">{t.name}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ helpers

function useAmount(initial = "") {
  const [text, setText] = useState(initial);
  return { text, set: (t: string) => setText(t), value: evalAmount(text) ?? 0 };
}
const n = (v: number | "") => (v === "" ? 0 : v);

function Stepper({ value, onChange, min = 1, label }: { value: number; onChange: (v: number) => void; min?: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl font-bold dark:bg-slate-800" aria-label={`${label} kam`}>
        −
      </button>
      <span className="min-w-12 text-center text-2xl font-bold tabular">{value}</span>
      <button onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-xl font-bold dark:bg-slate-800" aria-label={`${label} zyada`}>
        +
      </button>
    </div>
  );
}

// ------------------------------------------------------------ calculators

function SplitCalc() {
  const a = useAmount();
  const [people, setPeople] = useState(4);
  const [tip, setTip] = useState(0);
  const [roundUp, setRoundUp] = useState(false);
  const total = a.value * (1 + tip / 100);
  const each = people > 0 ? total / people : 0;
  const shown = roundUp ? Math.ceil(each / 10) * 10 : each;
  return (
    <div className="space-y-4">
      <Field label="Bill kitna aaya?">
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      <Field group label="Kitne log?">
        <Stepper value={people} onChange={setPeople} label="Log" />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">Tip</p>
        <div className="flex flex-wrap gap-2">
          {[0, 5, 10, 15].map((t) => (
            <Chip key={t} active={tip === t} onClick={() => setTip(t)}>
              {t ? `${t}%` : "Nahi"}
            </Chip>
          ))}
        </div>
      </div>
      <Toggle checked={roundUp} onChange={setRoundUp} label="₹10 me round karo (chutta ka jhanjhat nahi)" />
      <div className="grid grid-cols-2 gap-2">
        <Stat big tone="brand" label="Har ek ka" value={inr(shown)} />
        <Stat big label="Kul (tip ke saath)" value={inr(total)} />
      </div>
      {roundUp && shown * people - total > 0.5 && <p className="text-sm text-slate-500">Round karne se {inr(shown * people - total)} extra jama hoga — next chai uss se! ☕</p>}
      {a.value > 0 && (
        <Button className="w-full" variant="secondary" icon="users" onClick={() => openSheet({ type: "expense", preset: { amount: round2(total), splitType: "equal", title: "Bill" } })}>
          Doston ke naam ke saath save karo
        </Button>
      )}
    </div>
  );
}

const DENOMS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
function NotesCalc() {
  const [counts, setCounts] = useLocalState<Record<number, number>>("kh-notes", {});
  const total = DENOMS.reduce((s, d) => s + d * (counts[d] ?? 0), 0);
  const pieces = DENOMS.reduce((s, d) => s + (counts[d] ?? 0), 0);
  const set = (d: number, v: number) => setCounts({ ...counts, [d]: Math.max(0, v) });
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white sm:-mx-5 sm:-mt-5">
        <p className="text-sm text-white/80">Kul cash · {pieces} note/sikke</p>
        <p className="text-3xl font-bold tabular">{inr(total)}</p>
        <p className="mt-1 text-xs text-white/80">{amountInWords(total)}</p>
      </div>
      {DENOMS.map((d) => (
        <div key={d} className="flex items-center gap-3">
          <span className={cx("w-16 rounded-lg py-1.5 text-center text-sm font-bold", d >= 10 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200")}>₹{d}</span>
          <span className="text-slate-400">×</span>
          <button onClick={() => set(d, (counts[d] ?? 0) - 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 font-bold dark:bg-slate-800" aria-label={`₹${d} kam`}>
            −
          </button>
          <input
            inputMode="numeric"
            value={counts[d] || ""}
            placeholder="0"
            onChange={(e) => set(d, Number(e.target.value.replace(/\D/g, "")) || 0)}
            aria-label={`₹${d} ke kitne`}
            className="h-9 w-16 rounded-lg border border-slate-200 bg-white text-center font-semibold outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <button onClick={() => set(d, (counts[d] ?? 0) + 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 font-bold dark:bg-slate-800" aria-label={`₹${d} zyada`}>
            +
          </button>
          <span className="flex-1 text-right font-semibold tabular">{inr(d * (counts[d] ?? 0))}</span>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setCounts({})}>
        Sab saaf karo
      </Button>
    </div>
  );
}

function ByaajCalc() {
  const a = useAmount();
  const [rateType, setRateType] = useState<"sankda" | "saal">("sankda");
  const [rate, setRate] = useState<number | "">(2);
  const [kind, setKind] = useState<"simple" | "compound">("simple");
  const [from, setFrom] = useState(addDays(today(), -180));
  const [to, setTo] = useState(today());
  const days = Math.max(0, daysBetween(from, to));
  const months = days / 30;
  const perMonth = rateType === "sankda" ? n(rate) : n(rate) / 12;
  const r = byaaj(a.value, perMonth, months, kind === "compound");
  return (
    <div className="space-y-4">
      <Field label="Kitna udhaar (mool)?">
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      <Segmented
        value={rateType}
        onChange={setRateType}
        options={[
          { value: "sankda", label: "₹ sankda / mahina" },
          { value: "saal", label: "% saalana" },
        ]}
      />
      <Field label={rateType === "sankda" ? "Har ₹100 pe har mahine kitne ₹?" : "Saal ka kitna %?"} hint={rateType === "sankda" ? `= ${n(rate) * 12}% saalana` : `= ₹${+(n(rate) / 12).toFixed(2)} sankda`}>
        <NumberInput value={rate} onChange={setRate} suffix={rateType === "sankda" ? "₹/100" : "%"} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kab diya?">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
        </Field>
        <Field label="Kab tak?">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" />
        </Field>
      </div>
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "simple", label: "Saadharan (simple)" },
          { value: "compound", label: "Chakravriddhi (compound)" },
        ]}
      />
      <p className="text-sm text-slate-500">
        {days} din ≈ {+months.toFixed(1)} mahine
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Byaaj" tone="bad" value={inr(r.interest)} big />
        <Stat label="Kul lautana" tone="brand" value={inr(r.total)} big />
      </div>
      {a.value > 0 && <p className="text-sm text-slate-500">Har mahine ka byaaj: {inr((a.value * perMonth) / 100)}</p>}
    </div>
  );
}

const UNITS: Record<string, { base: string; mult: number }> = { g: { base: "kg", mult: 0.001 }, kg: { base: "kg", mult: 1 }, ml: { base: "L", mult: 0.001 }, L: { base: "L", mult: 1 }, pcs: { base: "pc", mult: 1 } };
function UnitCalc() {
  const [rows, setRows] = useState([
    { price: "", qty: "", unit: "g" },
    { price: "", qty: "", unit: "g" },
  ]);
  const per = rows.map((r) => {
    const p = evalAmount(r.price) ?? 0;
    const q = Number(r.qty) * UNITS[r.unit].mult;
    return p > 0 && q > 0 ? p / q : null;
  });
  const valid = per.filter((x): x is number => x !== null);
  const best = valid.length ? Math.min(...valid) : null;
  const worst = valid.length ? Math.max(...valid) : null;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const isBest = per[i] !== null && per[i] === best && valid.length > 1;
        return (
          <div key={i} className={cx("rounded-2xl border-2 p-3 transition", isBest ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700")}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Pack {String.fromCharCode(65 + i)}</p>
              {isBest && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">✓ Sabse sasta</span>}
            </div>
            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <TextInput inputMode="decimal" placeholder="Daam ₹" value={r.price} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, price: e.target.value } : x)))} aria-label="Daam" />
              <TextInput inputMode="decimal" placeholder="Quantity" value={r.qty} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} aria-label="Quantity" />
              <select value={r.unit} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)))} className="rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-950" aria-label="Unit">
                {Object.keys(UNITS).map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            {per[i] !== null && (
              <p className="mt-2 text-sm">
                <b className="tabular">{inr(per[i]!)}</b> per {UNITS[r.unit].base}
                {!isBest && best && per[i]! > best && <span className="text-rose-600"> · {Math.round(((per[i]! - best) / best) * 100)}% mehenga</span>}
              </p>
            )}
          </div>
        );
      })}
      {rows.length < 4 && (
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setRows([...rows, { price: "", qty: "", unit: rows[0].unit }])}>
          Aur pack
        </Button>
      )}
      {best && worst && worst > best && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">💡 Sasta wala lene se har {UNITS[rows[0].unit].base} pe {inr(worst - best)} bachenge.</p>}
    </div>
  );
}

function HoursCalc() {
  const { settings } = useData();
  const a = useAmount();
  const [salary, setSalary] = useState<number | "">(settings.monthlyIncome || "");
  const [hours, setHours] = useState<number | "">(8);
  const [days, setDays] = useState<number | "">(26);
  const perHour = n(salary) / Math.max(1, n(hours) * n(days));
  const h = perHour > 0 ? a.value / perHour : 0;
  return (
    <div className="space-y-4">
      <Field label="Cheez ka daam">
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      <Field label="Mahine ki kamaai (in-hand)">
        <NumberInput value={salary} onChange={setSalary} placeholder="30000" suffix="₹" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Roz kitne ghante">
          <NumberInput value={hours} onChange={setHours} suffix="ghante" />
        </Field>
        <Field label="Mahine me kitne din">
          <NumberInput value={days} onChange={setDays} suffix="din" />
        </Field>
      </div>
      {perHour > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
          <p className="text-sm text-white/85">Iske liye aapko kaam karna padega</p>
          <p className="text-3xl font-bold">{a.value > 0 ? formatHours(h) : "—"}</p>
          <p className="mt-1 text-sm text-white/85">Aapki 1 ghante ki kamaai: {inr(perHour)}</p>
        </div>
      )}
      <p className="text-xs text-slate-500">Settings me kamaai daalo, toh har kharcha jodte waqt bhi ghante dikhenge.</p>
    </div>
  );
}

function GstCalc() {
  const a = useAmount();
  const [rate, setRate] = useState(18);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const r = gst(a.value, rate, mode);
  return (
    <div className="space-y-4">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "GST jodo (+)" },
          { value: "remove", label: "GST nikalo (−)" },
        ]}
      />
      <Field label={mode === "add" ? "Bina GST ka daam" : "GST ke saath daam"}>
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      <div className="flex flex-wrap gap-2">
        {[3, 5, 12, 18, 28, 40].map((g) => (
          <Chip key={g} active={rate === g} onClick={() => setRate(g)}>
            {g}%
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Mool daam" value={inr(r.base)} />
        <Stat label={`GST ${rate}%`} tone="bad" value={inr(r.tax)} />
        <Stat label="Kul" tone="brand" value={inr(r.total)} />
      </div>
      <p className="text-sm text-slate-500">
        CGST {rate / 2}% = {inr(r.tax / 2)} · SGST {rate / 2}% = {inr(r.tax / 2)}
      </p>
    </div>
  );
}

function DiscountCalc() {
  const a = useAmount();
  const [d1, setD1] = useState<number | "">(50);
  const [d2, setD2] = useState<number | "">("");
  const [flat, setFlat] = useState<number | "">("");
  const after1 = a.value * (1 - n(d1) / 100);
  const after2 = after1 * (1 - n(d2) / 100);
  const final = Math.max(0, after2 - n(flat));
  const saved = a.value - final;
  const eff = a.value > 0 ? (saved / a.value) * 100 : 0;
  return (
    <div className="space-y-4">
      <Field label="MRP / asli daam">
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Discount %">
          <NumberInput value={d1} onChange={setD1} suffix="%" />
        </Field>
        <Field label="Extra %">
          <NumberInput value={d2} onChange={setD2} suffix="%" placeholder="0" />
        </Field>
        <Field label="Flat off ₹">
          <NumberInput value={flat} onChange={setFlat} placeholder="0" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat big tone="brand" label="Aapko dena hai" value={inr(final)} />
        <Stat big tone="good" label="Bachat" value={inr(saved)} />
      </div>
      {n(d2) > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          🧐 {n(d1)}% + {n(d2)}% ka matlab {n(d1) + n(d2)}% nahi, asli discount sirf <b>{+eff.toFixed(1)}%</b> hai.
        </p>
      )}
    </div>
  );
}

function EmiCalc() {
  const a = useAmount("500000");
  const [rate, setRate] = useState<number | "">(10.5);
  const [years, setYears] = useState<number | "">(5);
  const r = emi(a.value, n(rate), Math.round(n(years) * 12));
  const pct = r.total > 0 ? (a.value / r.total) * 100 : 100;
  return (
    <div className="space-y-4">
      <Field label="Loan kitna?">
        <AmountInput big text={a.text} onText={a.set} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Byaaj (saalana)">
          <NumberInput value={rate} onChange={setRate} suffix="%" />
        </Field>
        <Field label="Kitne saal">
          <NumberInput value={years} onChange={setYears} suffix="saal" />
        </Field>
      </div>
      <div className="rounded-2xl bg-brand-600 p-5 text-white">
        <p className="text-sm text-white/80">Har mahine EMI</p>
        <p className="text-3xl font-bold tabular">{inr(r.emi)}</p>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-brand-500" style={{ width: `${pct}%` }} />
        <div className="flex-1 bg-rose-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="🟣 Mool" value={inr(a.value)} />
        <Stat label="🔴 Kul byaaj" tone="bad" value={inr(r.interest)} />
      </div>
      <p className="text-sm text-slate-500">Kul lautana: {inr(r.total)}. Har ₹100 ke loan pe {inr((r.interest / Math.max(1, a.value)) * 100)} byaaj.</p>
    </div>
  );
}

function SipCalc() {
  const a = useAmount("2000");
  const [mode, setMode] = useState<"sip" | "lump">("sip");
  const [ret, setRet] = useState<number | "">(12);
  const [years, setYears] = useState<number | "">(10);
  const [step, setStep] = useState<number | "">(0);
  const r = mode === "sip" ? sip(a.value, n(ret), n(years), n(step)) : lumpsum(a.value, n(ret), n(years));
  return (
    <div className="space-y-4">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "sip", label: "Har mahine (SIP)" },
          { value: "lump", label: "Ek baar (Lumpsum)" },
        ]}
      />
      <Field label={mode === "sip" ? "Har mahine kitna?" : "Kitna lagana hai?"}>
        <AmountInput big text={a.text} onText={a.set} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Return">
          <NumberInput value={ret} onChange={setRet} suffix="%" />
        </Field>
        <Field label="Saal">
          <NumberInput value={years} onChange={setYears} />
        </Field>
        {mode === "sip" && (
          <Field label="Har saal badhao">
            <NumberInput value={step} onChange={setStep} suffix="%" placeholder="0" />
          </Field>
        )}
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
        <p className="text-sm text-white/85">{n(years)} saal baad</p>
        <p className="text-3xl font-bold tabular">{inr(r.value)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Aapne lagaya" value={inr(r.invested)} />
        <Stat label="Kamaai" tone="good" value={inr(r.gain)} />
      </div>
      <p className="text-xs text-slate-500">Return pakka nahi hota, yeh sirf andaza hai.</p>
    </div>
  );
}

function GoalCalc() {
  const [name, setName] = useState("Nayi bike");
  const target = useAmount("90000");
  const saved = useAmount("10000");
  const monthly = useAmount("5000");
  const [ret, setRet] = useState<number | "">(0);
  const m = monthsToGoal(target.value, saved.value, monthly.value, n(ret));
  const date = m !== null ? new Date(new Date().getFullYear(), new Date().getMonth() + m, 1).toLocaleDateString("hi-IN", { month: "long", year: "numeric" }) : null;
  const pct = target.value > 0 ? Math.min(100, (saved.value / target.value) * 100) : 0;
  return (
    <div className="space-y-4">
      <Field label="Sapna kya hai?">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Kitne ka?">
        <AmountInput text={target.text} onText={target.set} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Abhi kitna jama hai">
          <AmountInput text={saved.text} onText={saved.set} />
        </Field>
        <Field label="Har mahine bachat">
          <AmountInput text={monthly.text} onText={monthly.set} />
        </Field>
      </div>
      <Field label="Bachat pe return (optional)">
        <NumberInput value={ret} onChange={setRet} suffix="% saal" />
      </Field>
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-brand-600 p-5 text-white">
        <p className="text-sm text-white/85">🎯 {name || "Aapka sapna"}</p>
        <p className="text-2xl font-bold">{m === null ? "Bachat badhao 🙂" : m === 0 ? "Ho gaya! 🎉" : `${m} mahine me`}</p>
        {date && m! > 0 && <p className="text-sm text-white/85">Lagbhag {date} tak</p>}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-white/80">{Math.round(pct)}% jama</p>
      </div>
      {m !== null && m > 12 && monthly.value > 0 && (
        <p className="text-sm text-slate-500">💡 Har mahine {inr(monthly.value * 0.2)} aur bachao toh {(() => {
          const faster = monthsToGoal(target.value, saved.value, monthly.value * 1.2, n(ret));
          return faster !== null ? `${m - faster} mahine pehle` : "jaldi";
        })()} pahunch jaoge.</p>
      )}
    </div>
  );
}

function RentCalc() {
  const rent = useAmount("30000");
  const [common, setCommon] = useState<number | "">(30);
  const [rooms, setRooms] = useState([
    { name: "Bada kamra (balcony)", size: 180, people: 1 },
    { name: "Chhota kamra", size: 120, people: 1 },
    { name: "Hall wala", size: 140, people: 2 },
  ]);
  const shares = rentSplit(rent.value, n(common), rooms);
  const setRoom = (i: number, patch: Partial<(typeof rooms)[number]>) => setRooms(rooms.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-4">
      <Field label="Kul kiraya">
        <AmountInput text={rent.text} onText={rent.set} />
      </Field>
      <Field label="Common hissa (hall, kitchen) — sab me barabar" hint="Baaki kiraya kamre ke size ke hisaab se baantega">
        <NumberInput value={common} onChange={setCommon} suffix="%" />
      </Field>
      {rooms.map((r, i) => (
        <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <div className="flex gap-2">
            <TextInput value={r.name} onChange={(e) => setRoom(i, { name: e.target.value })} aria-label="Kamre ka naam" className="py-2 text-sm" />
            <button onClick={() => setRooms(rooms.filter((_, k) => k !== i))} className="px-2 text-slate-400 hover:text-rose-500" aria-label="Kamra hatao">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 items-end gap-2 text-sm">
            <label className="text-xs text-slate-500">
              Size (sq ft)
              <NumberInput value={r.size} onChange={(v) => setRoom(i, { size: n(v) })} className="mt-1 py-1.5" />
            </label>
            <label className="text-xs text-slate-500">
              Kitne log
              <NumberInput value={r.people} onChange={(v) => setRoom(i, { people: n(v) })} className="mt-1 py-1.5" />
            </label>
            <div className="text-right">
              <p className="font-bold tabular text-brand-700 dark:text-brand-300">{inr(shares[i])}</p>
              {r.people > 1 && <p className="text-xs text-slate-500">{inr(shares[i] / r.people)}/insaan</p>}
            </div>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon="plus" onClick={() => setRooms([...rooms, { name: `Kamra ${rooms.length + 1}`, size: 120, people: 1 }])}>
        Kamra jodo
      </Button>
    </div>
  );
}

function FuelCalc() {
  const [km, setKm] = useState<number | "">(300);
  const [mileage, setMileage] = useState<number | "">(15);
  const [price, setPrice] = useState<number | "">(105);
  const [people, setPeople] = useState(2);
  const [both, setBoth] = useState(true);
  const [toll, setToll] = useState<number | "">("");
  const dist = n(km) * (both ? 2 : 1);
  const litres = n(mileage) > 0 ? dist / n(mileage) : 0;
  const cost = litres * n(price) + n(toll);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Doori">
          <NumberInput value={km} onChange={setKm} suffix="km" />
        </Field>
        <Field label="Mileage">
          <NumberInput value={mileage} onChange={setMileage} suffix="km/L" />
        </Field>
        <Field label="Petrol rate">
          <NumberInput value={price} onChange={setPrice} suffix="₹/L" />
        </Field>
      </div>
      <Toggle checked={both} onChange={setBoth} label="Aana-jaana dono (2×)" />
      <Field label="Toll / parking ₹ (optional)">
        <NumberInput value={toll} onChange={setToll} placeholder="0" />
      </Field>
      <Field group label="Kitne log baantenge?">
        <Stepper value={people} onChange={setPeople} label="Log" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Petrol" value={`${litres.toFixed(1)} L`} />
        <Stat label="Kul kharcha" value={inr(cost)} />
        <Stat label="Har ek" tone="brand" value={inr(cost / people)} />
      </div>
    </div>
  );
}

function PercentCalc() {
  const [a1, setA1] = useState<number | "">(18);
  const [b1, setB1] = useState<number | "">(2500);
  const [a2, setA2] = useState<number | "">(450);
  const [b2, setB2] = useState<number | "">(1500);
  const [a3, setA3] = useState<number | "">(40000);
  const [b3, setB3] = useState<number | "">(46000);
  const change = n(a3) ? ((n(b3) - n(a3)) / n(a3)) * 100 : 0;
  const row = "flex flex-wrap items-center gap-2 text-sm";
  const box = "w-24";
  return (
    <div className="space-y-5">
      <div className={row}>
        <div className={box}>
          <NumberInput value={a1} onChange={setA1} ariaLabel="Percent" />
        </div>
        <span>% of</span>
        <div className={box}>
          <NumberInput value={b1} onChange={setB1} ariaLabel="Amount" />
        </div>
        <span>=</span>
        <b className="text-lg tabular">{round2((n(a1) * n(b1)) / 100).toLocaleString("en-IN")}</b>
      </div>
      <div className={row}>
        <div className={box}>
          <NumberInput value={a2} onChange={setA2} ariaLabel="Hissa" />
        </div>
        <span>kitna % hai</span>
        <div className={box}>
          <NumberInput value={b2} onChange={setB2} ariaLabel="Kul" />
        </div>
        <span>ka?</span>
        <b className="text-lg tabular">{n(b2) ? `${round2((n(a2) / n(b2)) * 100)}%` : "—"}</b>
      </div>
      <div className={row}>
        <div className={box}>
          <NumberInput value={a3} onChange={setA3} ariaLabel="Pehle" />
        </div>
        <span>se</span>
        <div className={box}>
          <NumberInput value={b3} onChange={setB3} ariaLabel="Baad me" />
        </div>
        <span>=</span>
        <b className={cx("text-lg tabular", change >= 0 ? "text-emerald-600" : "text-rose-600")}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(round2(change))}%
        </b>
      </div>
      <p className="text-xs text-slate-500">Teesri line: salary hike ya daam badhne ka %.</p>
    </div>
  );
}

function ChequeCalc() {
  const a = useAmount();
  const words = a.value > 0 ? amountInWords(a.value) : "";
  return (
    <div className="space-y-4">
      <Field label="Amount">
        <AmountInput big text={a.text} onText={a.set} autoFocus />
      </Field>
      {words && (
        <>
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-amber-50/50 p-4 font-serif text-lg leading-relaxed dark:border-slate-700 dark:bg-amber-950/20">{words}</div>
          <p className="text-sm text-slate-500">Ankon me: {inr(a.value)}/-</p>
          <Button
            variant="secondary"
            icon="copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(words);
                showToast("Copy ho gaya ✓");
              } catch {
                showToast("Copy nahi hua");
              }
            }}
          >
            Copy karo
          </Button>
        </>
      )}
    </div>
  );
}
