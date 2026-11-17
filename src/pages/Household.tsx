import { useState } from "react";
import { CATEGORIES, guessCategory } from "../lib/categories";
import { billStatus, dailyMonth, dailySummaryText } from "../lib/household";
import { deleteEntry, saveEntry, update, useData } from "../lib/store";
import { ME, type Bill, type DailyItem, type Expense, type ShopItem } from "../lib/types";
import { showToast } from "../lib/ui";
import { addMonths, evalAmount, inr, monthName, parseIso, round2, thisMonth, today, uid } from "../lib/utils";
import { Icon } from "../components/Icon";
import { AmountInput, Button, Card, cx, Empty, Field, NumberInput, PageHeader, Progress, SectionTitle, Select, Sheet, TextInput, Toggle } from "../components/ui";

function makeExpense(title: string, amount: number, cat: string, date = today()): Expense {
  return {
    kind: "expense",
    id: uid(),
    title,
    amount: round2(amount),
    category: cat,
    date,
    mode: "upi",
    paidBy: ME,
    splitType: "none",
    shares: [{ who: ME, amount: round2(amount) }],
    createdAt: new Date().toISOString(),
  };
}

// ================================================================ BILLS

const BILL_EMOJIS = ["🏠", "💡", "📱", "📶", "🔥", "💧", "📺", "🚗", "🏦", "🎓", "🏋️", "🧾"];

export function Bills() {
  const data = useData();
  const [month, setMonth] = useState(thisMonth());
  const [editing, setEditing] = useState<Bill | "new" | null>(null);
  const statuses = data.bills.map((b) => billStatus(b, month)).sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueDate.localeCompare(b.dueDate));
  const total = data.bills.reduce((s, b) => s + b.amount, 0);
  const paid = statuses.filter((s) => s.paid).reduce((s, x) => s + x.bill.amount, 0);

  function markPaid(b: Bill) {
    const e = makeExpense(b.name, b.amount, b.category, month === thisMonth() ? today() : billStatus(b, month).dueDate);
    saveEntry(e);
    update((d) => ({ ...d, bills: d.bills.map((x) => (x.id === b.id ? { ...x, paid: { ...x.paid, [month]: e.id } } : x)) }));
    showToast(`${b.name} bhar diya ✓ — kharche me jud gaya`);
  }
  function unmark(b: Bill) {
    const id = b.paid[month];
    update((d) => ({ ...d, bills: d.bills.map((x) => (x.id === b.id ? { ...x, paid: Object.fromEntries(Object.entries(x.paid).filter(([m]) => m !== month)) } : x)) }));
    if (id && data.entries.some((e) => e.id === id)) deleteEntry(id);
  }

  return (
    <div>
      <PageHeader back title="Mahine ke bill" subtitle="Kiraya, bijli, recharge — kuch bhoolo mat" action={<Button size="sm" icon="plus" onClick={() => setEditing("new")}>Bill</Button>} />
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Pichhla mahina">
            <Icon name="back" />
          </button>
          <p className="font-semibold">{monthName(month, true)}</p>
          <button onClick={() => setMonth(addMonths(month, 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Agla mahina">
            <Icon name="next" />
          </button>
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-emerald-600 dark:text-emerald-400">Bhar diye {inr(paid)}</span>
          <span className="text-rose-600 dark:text-rose-400">Baaki {inr(total - paid)}</span>
        </div>
        <Progress value={paid} max={total} color="#10b981" className="mt-1.5" />
      </Card>

      {statuses.length ? (
        <div className="mt-4 space-y-2">
          {statuses.map((s) => (
            <Card key={s.bill.id} className="flex items-center gap-3 p-3">
              <button onClick={() => setEditing(s.bill)} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800" aria-label={`${s.bill.name} badlo`}>
                {s.bill.emoji}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.bill.name}</p>
                <p className={cx("text-xs", s.paid ? "text-emerald-600" : s.daysLeft < 0 ? "font-semibold text-rose-600" : s.daysLeft <= 5 ? "text-amber-600" : "text-slate-500")}>
                  {s.paid ? "✓ Bhar diya" : s.daysLeft < 0 ? `${-s.daysLeft} din se due!` : s.daysLeft === 0 ? "Aaj last date" : `${parseIso(s.dueDate).getDate()} tarikh · ${s.daysLeft} din bache`}
                </p>
              </div>
              <p className="font-semibold tabular">{inr(s.bill.amount)}</p>
              {s.paid ? (
                <button onClick={() => unmark(s.bill)} className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" aria-label="Paid hatao">
                  <Icon name="check" />
                </button>
              ) : (
                <Button size="sm" variant="success" onClick={() => markPaid(s.bill)}>
                  Bhara
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty emoji="🧾" title="Koi bill nahi joda" text="Har mahine aane wale bill jodo. Due date se pehle Home pe yaad dilayenge." action={<Button icon="plus" onClick={() => setEditing("new")}>Pehla bill jodo</Button>} />
      )}
      {editing && <BillForm bill={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BillForm({ bill, onClose }: { bill?: Bill; onClose: () => void }) {
  const [name, setName] = useState(bill?.name ?? "");
  const [emoji, setEmoji] = useState(bill?.emoji ?? "💡");
  const [amountText, setAmountText] = useState(bill ? String(bill.amount) : "");
  const [dueDay, setDueDay] = useState<number | "">(bill?.dueDay ?? 5);
  const [cat, setCat] = useState(bill?.category ?? "Bills");
  const amount = evalAmount(amountText) ?? 0;
  const ok = name.trim() && amount > 0 && dueDay && dueDay >= 1 && dueDay <= 31;

  function save() {
    if (!ok) return;
    const b: Bill = { id: bill?.id ?? uid(), name: name.trim(), emoji, amount, dueDay: Number(dueDay), category: cat, paid: bill?.paid ?? {} };
    update((d) => ({ ...d, bills: bill ? d.bills.map((x) => (x.id === b.id ? b : x)) : [...d.bills, b] }));
    onClose();
  }
  function remove() {
    if (!bill) return;
    update((d) => ({ ...d, bills: d.bills.filter((x) => x.id !== bill.id) }));
    onClose();
  }

  return (
    <Sheet
      title={bill ? "Bill badlo" : "Naya bill"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {bill && <Button variant="danger" icon="trash" onClick={remove} className="w-12 px-0" />}
          <Button className="flex-1" size="lg" disabled={!ok} onClick={save}>
            Save karo
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {BILL_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} className={cx("grid h-10 w-10 place-items-center rounded-xl text-xl", emoji === e ? "bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-950" : "bg-slate-100 dark:bg-slate-800")}>
              {e}
            </button>
          ))}
        </div>
        <Field label="Bill ka naam">
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              const g = guessCategory(e.target.value);
              if (g !== "Other") setCat(g);
            }}
            placeholder="Kiraya, Bijli, Jio recharge..."
          />
        </Field>
        <Field label="Har mahine kitna?">
          <AmountInput text={amountText} onText={(t) => setAmountText(t)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kis tarikh tak?">
            <NumberInput value={dueDay} onChange={setDueDay} min={1} placeholder="5" suffix="tarikh" />
          </Field>
          <Field label="Category">
            <Select value={cat} onChange={setCat}>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

// ================================================================ DAILY KHAATA

const DAILY_PRESETS = [
  { name: "Doodh", emoji: "🥛", unit: "litre", rate: 64, defaultQty: 1 },
  { name: "Kaamwali", emoji: "🧹", unit: "din", rate: 100, defaultQty: 1 },
  { name: "Akhbaar", emoji: "📰", unit: "copy", rate: 6, defaultQty: 1 },
  { name: "Paani ki can", emoji: "💧", unit: "can", rate: 40, defaultQty: 1 },
  { name: "Khana wali / Tiffin", emoji: "🍱", unit: "tiffin", rate: 80, defaultQty: 2 },
  { name: "Driver", emoji: "🚗", unit: "din", rate: 500, defaultQty: 1 },
];

export function Daily() {
  const data = useData();
  const [month, setMonth] = useState(thisMonth());
  const [editing, setEditing] = useState<DailyItem | "new" | null>(null);
  const [dayEdit, setDayEdit] = useState<{ item: DailyItem; date: string } | null>(null);

  function setQty(item: DailyItem, date: string, qty: number | null) {
    update((d) => ({
      ...d,
      daily: d.daily.map((x) => {
        if (x.id !== item.id) return x;
        const log = { ...x.log };
        if (qty === null) delete log[date];
        else log[date] = qty;
        return { ...x, log };
      }),
    }));
  }

  function pay(item: DailyItem) {
    const m = dailyMonth(item, month);
    const e = makeExpense(`${item.name} — ${monthName(month)}`, m.amount, guessCategory(item.name) === "Other" ? "Ghar" : guessCategory(item.name));
    saveEntry(e);
    update((d) => ({ ...d, daily: d.daily.map((x) => (x.id === item.id ? { ...x, paid: { ...x.paid, [month]: e.id } } : x)) }));
    showToast(`${inr(m.amount)} chukaya ✓ — kharche me jud gaya`);
  }

  async function shareText(item: DailyItem) {
    const text = dailySummaryText(item, month, monthName(month, true));
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("Hisaab copy ho gaya ✓");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div>
      <PageHeader back title="Rozana khaata" subtitle="Doodh, kaamwali, akhbaar — tick karo, bill khud banega" action={<Button size="sm" icon="plus" onClick={() => setEditing("new")}>Jodo</Button>} />
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMonth(addMonths(month, -1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800" aria-label="Pichhla mahina">
          <Icon name="back" />
        </button>
        <p className="font-semibold">{monthName(month, true)}</p>
        <button onClick={() => setMonth(addMonths(month, 1))} disabled={month >= thisMonth()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-200/60 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Agla mahina">
          <Icon name="next" />
        </button>
      </div>

      {data.daily.length === 0 ? (
        <Empty emoji="🥛" title="Rozana ka hisaab rakho" text="Doodhwale ya kaamwali ke saath mahine ke ant me jhagda nahi! Har din tick karo, bill khud ban jayega." action={<Button icon="plus" onClick={() => setEditing("new")}>Shuru karo</Button>} />
      ) : (
        <div className="space-y-4">
          {data.daily.map((item) => {
            const m = dailyMonth(item, month);
            const firstWeekday = parseIso(`${month}-01`).getDay();
            const paidId = item.paid[month];
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditing(item)} className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800" aria-label={`${item.name} badlo`}>
                    {item.emoji}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Roz {item.defaultQty} {item.unit} · {inr(item.rate)}/{item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular">{inr(m.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {m.qty} {item.unit} · {m.offDays} chhutti
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
                  {["Ra", "So", "Ma", "Bu", "Gu", "Sh", "Sh"].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                  {Array.from({ length: firstWeekday }, (_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {m.days.map((d) => {
                    const off = !d.future && d.qty === 0;
                    const special = !d.future && d.qty > 0 && d.qty !== item.defaultQty;
                    return (
                      <button
                        key={d.date}
                        disabled={d.future}
                        onClick={() => setQty(item, d.date, d.qty > 0 ? 0 : item.defaultQty)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setDayEdit({ item, date: d.date });
                        }}
                        onDoubleClick={() => setDayEdit({ item, date: d.date })}
                        aria-label={`${Number(d.date.slice(8))} tarikh: ${d.future ? "aage" : off ? "nahi aaya" : `${d.qty} ${item.unit}`}`}
                        className={cx(
                          "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold transition",
                          d.future && "text-slate-300 dark:text-slate-700",
                          !d.future && off && "bg-rose-100 text-rose-700 line-through dark:bg-rose-950/60 dark:text-rose-300",
                          !d.future && !off && !special && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                          special && "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
                          d.date === today() && "ring-2 ring-brand-500",
                        )}
                      >
                        {Number(d.date.slice(8))}
                        {special && <span className="text-[9px] leading-none">{d.qty}</span>}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Tap = aaya/nahi aaya · Double-tap = quantity badlo</p>
                <div className="mt-3 flex gap-2">
                  {paidId ? (
                    <Button variant="secondary" size="sm" icon="check" className="flex-1" onClick={() => {
                      update((d) => ({ ...d, daily: d.daily.map((x) => (x.id === item.id ? { ...x, paid: Object.fromEntries(Object.entries(x.paid).filter(([k]) => k !== month)) } : x)) }));
                      if (data.entries.some((e) => e.id === paidId)) deleteEntry(paidId);
                    }}>
                      Chukaya ✓ (wapas lo)
                    </Button>
                  ) : (
                    <Button variant="success" size="sm" className="flex-1" disabled={m.amount <= 0} onClick={() => pay(item)}>
                      {inr(m.amount)} chukaya
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon="share" onClick={() => shareText(item)}>
                    Hisaab bhejo
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <DailyForm item={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {dayEdit && <DayQtySheet item={dayEdit.item} date={dayEdit.date} onPick={(q) => { setQty(dayEdit.item, dayEdit.date, q); setDayEdit(null); }} onClose={() => setDayEdit(null)} />}
    </div>
  );
}

function DayQtySheet({ item, date, onPick, onClose }: { item: DailyItem; date: string; onPick: (q: number | null) => void; onClose: () => void }) {
  const [custom, setCustom] = useState<number | "">("");
  const opts = [0, item.defaultQty / 2, item.defaultQty, item.defaultQty * 1.5, item.defaultQty * 2];
  return (
    <Sheet title={`${item.emoji} ${parseIso(date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`} onClose={onClose}>
      <div className="grid grid-cols-5 gap-2">
        {opts.map((q) => (
          <button key={q} onClick={() => onPick(q)} className="rounded-xl bg-slate-100 py-3 text-sm font-semibold hover:bg-brand-100 dark:bg-slate-800">
            {q === 0 ? "Nahi" : q}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <NumberInput value={custom} onChange={setCustom} placeholder="Apni quantity" suffix={item.unit} />
        </div>
        <Button disabled={custom === ""} onClick={() => onPick(Number(custom))}>
          Set
        </Button>
      </div>
      <button onClick={() => onPick(null)} className="mt-3 text-sm text-slate-500 underline">
        Default pe wapas ({item.defaultQty})
      </button>
    </Sheet>
  );
}

function DailyForm({ item, onClose }: { item?: DailyItem; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "🥛");
  const [unit, setUnit] = useState(item?.unit ?? "litre");
  const [rate, setRate] = useState<number | "">(item?.rate ?? "");
  const [qty, setQty] = useState<number | "">(item?.defaultQty ?? 1);
  const [auto, setAuto] = useState(item?.auto ?? true);
  const ok = name.trim() && Number(rate) > 0 && Number(qty) > 0;

  function save() {
    if (!ok) return;
    const x: DailyItem = { id: item?.id ?? uid(), name: name.trim(), emoji, unit: unit.trim() || "unit", rate: Number(rate), defaultQty: Number(qty), auto, startDate: item?.startDate ?? `${thisMonth()}-01`, log: item?.log ?? {}, paid: item?.paid ?? {} };
    update((d) => ({ ...d, daily: item ? d.daily.map((y) => (y.id === x.id ? x : y)) : [...d.daily, x] }));
    onClose();
  }
  return (
    <Sheet
      title={item ? `${item.name} badlo` : "Rozana ka kya?"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button
              variant="danger"
              icon="trash"
              className="w-12 px-0"
              onClick={() => {
                if (!confirm(`${item.name} ka poora khaata hatana hai?`)) return;
                update((d) => ({ ...d, daily: d.daily.filter((y) => y.id !== item.id) }));
                onClose();
              }}
            />
          )}
          <Button className="flex-1" size="lg" disabled={!ok} onClick={save}>
            Save karo
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!item && (
          <div className="flex flex-wrap gap-2">
            {DAILY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setName(p.name);
                  setEmoji(p.emoji);
                  setUnit(p.unit);
                  setRate(p.rate);
                  setQty(p.defaultQty);
                }}
                className={cx("rounded-full px-3 py-1.5 text-sm", name === p.name ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800")}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Field label="Icon">
            <TextInput value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16 text-center text-xl" maxLength={4} />
          </Field>
          <Field label="Naam">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Doodh" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Roz kitna">
            <NumberInput value={qty} onChange={setQty} />
          </Field>
          <Field label="Unit">
            <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="litre" />
          </Field>
          <Field label="Rate ₹">
            <NumberInput value={rate} onChange={setRate} placeholder="64" />
          </Field>
        </div>
        <Toggle checked={auto} onChange={setAuto} label="Har din aata hai maan lo (sirf chhutti mark karni padegi)" />
        {Number(rate) > 0 && Number(qty) > 0 && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">Poore mahine ka lagbhag {inr(Number(rate) * Number(qty) * 30)}</p>}
      </div>
    </Sheet>
  );
}

// ================================================================ SHOPPING LIST

export function Shopping() {
  const data = useData();
  const [text, setText] = useState("");
  const [buying, setBuying] = useState(false);
  const items = data.shopping;
  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const estTotal = items.reduce((s, i) => s + i.price, 0);
  const doneTotal = done.reduce((s, i) => s + i.price, 0);

  function add() {
    // "aloo 2kg 60" -> name aloo, qty 2kg, price 60
    const raw = text.trim();
    if (!raw) return;
    const priceMatch = /(?:₹\s*)?(\d+(?:\.\d+)?)\s*$/.exec(raw);
    let rest = raw;
    let price = 0;
    if (priceMatch && /\s/.test(raw)) {
      price = Number(priceMatch[1]);
      rest = raw.slice(0, priceMatch.index).trim();
    }
    const qtyMatch = /\b(\d+(?:\.\d+)?\s*(?:kg|g|gm|gram|l|litre|liter|ml|pcs|pc|packet|pkt|dozen|darjan|pack|box)?)\s*$/i.exec(rest);
    let qty = "";
    if (qtyMatch && qtyMatch.index > 0) {
      qty = qtyMatch[1];
      rest = rest.slice(0, qtyMatch.index).trim();
    }
    const item: ShopItem = { id: uid(), name: rest.charAt(0).toUpperCase() + rest.slice(1), qty, price, done: false, createdAt: today() };
    update((d) => ({ ...d, shopping: [...d.shopping, item] }));
    setText("");
  }
  const toggle = (id: string) => update((d) => ({ ...d, shopping: d.shopping.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) }));
  const remove = (id: string) => update((d) => ({ ...d, shopping: d.shopping.filter((i) => i.id !== id) }));
  const setPrice = (id: string, price: number) => update((d) => ({ ...d, shopping: d.shopping.map((i) => (i.id === id ? { ...i, price } : i)) }));

  async function share() {
    const t = ["🛒 Kya lena hai:", ...pending.map((i) => `☐ ${i.name}${i.qty ? ` — ${i.qty}` : ""}`), "", "— Kharcha app"].join("\n");
    try {
      if (navigator.share) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        showToast("List copy ho gayi ✓");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div>
      <PageHeader back title="Kya lena hai" subtitle="Shopping list + andaza kitna lagega" action={pending.length > 0 && <Button size="sm" variant="secondary" icon="share" onClick={share}>Bhejo</Button>} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="aloo 2kg 60 · detergent 220" aria-label="Item jodo" />
        <Button type="submit" icon="plus" disabled={!text.trim()} className="shrink-0">
          Jodo
        </Button>
      </form>
      <p className="mt-1.5 px-1 text-xs text-slate-500">Naam, quantity aur andaze ka daam ek saath likh do.</p>

      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Kul andaza</p>
            <p className="font-bold tabular">{inr(estTotal)}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Le liya</p>
            <p className="font-bold tabular text-emerald-600">{done.length}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Baaki</p>
            <p className="font-bold tabular text-rose-600">{pending.length}</p>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <Empty emoji="📝" title="List khaali hai" text="Bazaar jaane se pehle likh lo. Kharidne ke baad ek tap me kharche me jud jayega." />
      ) : (
        <>
          <SectionTitle>Lena hai ({pending.length})</SectionTitle>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {pending.map((i) => (
              <ShopRow key={i.id} item={i} onToggle={toggle} onRemove={remove} onPrice={setPrice} />
            ))}
            {pending.length === 0 && <p className="p-4 text-center text-sm text-slate-500">Sab le liya! 🎉</p>}
          </div>
          {done.length > 0 && (
            <>
              <SectionTitle>Tokri me ({done.length})</SectionTitle>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white opacity-80 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {done.map((i) => (
                  <ShopRow key={i.id} item={i} onToggle={toggle} onRemove={remove} onPrice={setPrice} />
                ))}
              </div>
              <Button className="mt-4 w-full" size="lg" variant="success" icon="check" onClick={() => setBuying(true)}>
                Kharid liya — kharche me jodo ({inr(doneTotal)})
              </Button>
            </>
          )}
        </>
      )}
      {buying && <BuySheet items={done} onClose={() => setBuying(false)} />}
    </div>
  );
}

function ShopRow({ item, onToggle, onRemove, onPrice }: { item: ShopItem; onToggle: (id: string) => void; onRemove: (id: string) => void; onPrice: (id: string, p: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button onClick={() => onToggle(item.id)} className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-md border-2", item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600")} aria-label={item.done ? "Wapas list me" : "Le liya"}>
        {item.done && <Icon name="check" className="h-4 w-4" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("truncate font-medium", item.done && "text-slate-400 line-through")}>{item.name}</p>
        {item.qty && <p className="text-xs text-slate-500">{item.qty}</p>}
      </div>
      <input
        inputMode="decimal"
        value={item.price || ""}
        onChange={(e) => onPrice(item.id, Number(e.target.value) || 0)}
        placeholder="₹"
        aria-label={`${item.name} ka daam`}
        className="h-8 w-20 rounded-lg border border-transparent bg-slate-50 px-2 text-right text-sm outline-none focus:border-brand-500 dark:bg-slate-800"
      />
      <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-rose-500" aria-label="Hatao">
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

function BuySheet({ items, onClose }: { items: ShopItem[]; onClose: () => void }) {
  const est = items.reduce((s, i) => s + i.price, 0);
  const [amountText, setAmountText] = useState(est ? String(est) : "");
  const [cat, setCat] = useState("Ration");
  const actual = evalAmount(amountText) ?? 0;
  const diff = est - actual;

  function save() {
    if (actual <= 0) return;
    const names = items.map((i) => i.name);
    const title = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
    saveEntry({ ...makeExpense(title, actual, cat), note: items.map((i) => `${i.name}${i.qty ? ` (${i.qty})` : ""}`).join(", ") });
    const ids = new Set(items.map((i) => i.id));
    update((d) => ({ ...d, shopping: d.shopping.filter((i) => !ids.has(i.id)) }));
    onClose();
    showToast(diff > 0 ? `Jud gaya ✓ Andaze se ${inr(diff)} bachaye! 🎉` : "Kharche me jud gaya ✓");
  }

  return (
    <Sheet title="Kitna laga?" onClose={onClose} footer={<Button className="w-full" size="lg" disabled={actual <= 0} onClick={save}>Kharche me jodo</Button>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{items.map((i) => i.name).join(", ")}</p>
        <AmountInput big text={amountText} onText={(t) => setAmountText(t)} autoFocus />
        {est > 0 && actual > 0 && (
          <p className={cx("rounded-xl p-3 text-sm", diff >= 0 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200")}>
            Andaza tha {inr(est)} → {diff >= 0 ? `${inr(diff)} ki bachat 🎉` : `${inr(-diff)} zyada laga`}
          </p>
        )}
        <Field label="Category">
          <Select value={cat} onChange={setCat}>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}
