import { useRef, useState } from "react";
import { expensesOnly, myShare } from "../lib/balances";
import { demoData } from "../lib/demo";
import { emptyData, getData, nameOf, normalize, replaceAll, updateSettings, useData } from "../lib/store";
import type { AppData } from "../lib/types";
import { navigate, showToast } from "../lib/ui";
import { download, today } from "../lib/utils";
import { Icon } from "../components/Icon";
import { Button, Card, Field, NumberInput, PageHeader, SectionTitle, Segmented, TextInput, Toggle } from "../components/ui";

const LINKS = [
  { to: "/bills", emoji: "🧾", name: "Mahine ke bill", desc: "Kiraya, bijli, recharge" },
  { to: "/daily", emoji: "🥛", name: "Rozana khaata", desc: "Doodh, kaamwali, akhbaar" },
  { to: "/shopping", emoji: "📝", name: "Kya lena hai", desc: "Shopping list" },
  { to: "/budget", emoji: "🎯", name: "Budget", desc: "Mahine ki limit" },
  { to: "/reports", emoji: "📊", name: "Report", desc: "Charts aur kahani" },
  { to: "/tools", emoji: "🧮", name: "Calculator", desc: "14 kaam ke hisaab" },
  { to: "/settings", emoji: "⚙️", name: "Settings", desc: "Naam, UPI, backup" },
];

export function More() {
  return (
    <div>
      <PageHeader title="Aur bhi" subtitle="Kharcha ke saare features" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LINKS.map((l) => (
          <Card key={l.to} onClick={() => navigate(l.to)} className="p-4">
            <span className="text-3xl">{l.emoji}</span>
            <p className="mt-2 font-semibold">{l.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{l.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const data = useData();
  const s = data.settings;
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(s.name);
  const [upi, setUpi] = useState(s.upiId);

  function backup() {
    download(`kharcha-backup-${today()}.json`, JSON.stringify(getData(), null, 1));
    showToast("Backup file download ho gayi ✓ — ise sambhal ke rakho");
  }

  async function restore(f: File) {
    try {
      const parsed = JSON.parse(await f.text()) as Partial<AppData>;
      if (!parsed || !Array.isArray(parsed.entries)) throw new Error("bad");
      if (!confirm(`Backup me ${parsed.entries.length} entries hain. Abhi wala sara data isse badal jayega. Theek hai?`)) return;
      replaceAll(normalize(parsed));
      setName(parsed.settings?.name ?? "");
      setUpi(parsed.settings?.upiId ?? "");
      showToast("Backup wapas aa gaya ✓");
    } catch {
      showToast("Yeh Kharcha ki backup file nahi lagti");
    }
  }

  function exportAll() {
    const rows = [["Date", "Type", "Kya", "Category", "Kul amount", "Aapka hissa", "Kisne pay kiya", "Kisko/kisse", "Mode", "Note"]];
    for (const e of [...data.entries].sort((a, b) => a.date.localeCompare(b.date))) {
      if (e.kind === "expense") rows.push([e.date, "Kharcha", e.title, e.category, String(e.amount), String(myShare(e)), nameOf(e.paidBy, data), e.shares.map((x) => nameOf(x.who, data)).join(" + "), e.mode, e.note ?? ""]);
      else rows.push([e.date, e.purpose === "settle" ? "Chukta" : "Udhaar", "", "", String(e.amount), "", nameOf(e.from, data), nameOf(e.to, data), e.mode, e.note ?? ""]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`kharcha-sab-${today()}.csv`, "﻿" + csv, "text/csv");
  }

  const total = expensesOnly(data.entries).length;

  return (
    <div>
      <PageHeader back title="Settings" />
      <Card className="space-y-4 p-4">
        <Field label="Aapka naam" hint="Reminder message me aur UPI link pe dikhega">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} onBlur={() => updateSettings({ name: name.trim() })} placeholder="Naam" />
        </Field>
        <Field label="Aapki UPI ID" hint="Isse reminder me ek-tap pay link banega">
          <TextInput value={upi} onChange={(e) => setUpi(e.target.value)} onBlur={() => updateSettings({ upiId: upi.trim() })} placeholder="naam@okaxis" />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Theme</p>
          <p className="-mt-1 mb-2 text-xs text-slate-500">Black = poora kaala, AMOLED phone pe battery bachata hai. Auto = phone ki setting jaisa.</p>
          <Segmented
            value={s.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "light", label: "☀️ Light" },
              { value: "dark", label: "🌙 Dark" },
              { value: "black", label: "⚫ Black" },
              { value: "system", label: "📱 Auto" },
            ]}
          />
        </div>
      </Card>

      <SectionTitle>⏱️ Kharcha = kaam ke ghante</SectionTitle>
      <Card className="space-y-3 p-4">
        <Toggle checked={s.showWorkHours} onChange={(v) => updateSettings({ showWorkHours: v })} label="Har kharche ke saath dikhao ki yeh kitne ghante ki kamaai hai" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mahine ki kamaai">
            <NumberInput value={s.monthlyIncome || ""} onChange={(v) => updateSettings({ monthlyIncome: Number(v) || 0 })} suffix="₹" placeholder="30000" />
          </Field>
          <Field label="Mahine me kaam ke ghante">
            <NumberInput value={s.workHoursPerMonth || ""} onChange={(v) => updateSettings({ workHoursPerMonth: Number(v) || 208 })} suffix="ghante" />
          </Field>
        </div>
      </Card>

      <SectionTitle>🔒 Aapka data</SectionTitle>
      <Card className="space-y-3 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sab kuch sirf <b>isi phone/browser</b> me save hai — koi server nahi, koi login nahi. Phone badalne ya browser saaf karne se pehle backup le lo.
        </p>
        <p className="text-xs text-slate-500">
          {total} kharche · {data.entries.length - total} lena-dena · {data.people.length} log · {data.groups.length} group
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon="download" onClick={backup}>
            Backup lo
          </Button>
          <Button variant="secondary" icon="upload" onClick={() => file.current?.click()}>
            Backup lagao
          </Button>
        </div>
        <Button variant="secondary" icon="download" className="w-full" onClick={exportAll}>
          Sab Excel (CSV) me nikalo
        </Button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
            e.target.value = "";
          }}
        />
      </Card>

      <SectionTitle>Aur</SectionTitle>
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        <button
          className="flex w-full items-center gap-3 p-4 text-left text-sm"
          onClick={() => {
            if (data.entries.length && !confirm("Demo data abhi ke data ki jagah aa jayega. Pehle backup le lo! Aage badhe?")) return;
            replaceAll(demoData(s.name));
            navigate("/");
            showToast("Demo data aa gaya");
          }}
        >
          <span className="text-xl">🎪</span>
          <span className="flex-1">Demo data dekho</span>
          <Icon name="next" className="h-4 w-4 text-slate-400" />
        </button>
        <button
          className="flex w-full items-center gap-3 p-4 text-left text-sm text-rose-600"
          onClick={() => {
            if (!confirm("Sara data (kharche, log, bills, sab) hamesha ke liye mit jayega. Pakka?")) return;
            const keep = getData().settings;
            replaceAll({ ...emptyData(), settings: { ...keep } });
            navigate("/");
            showToast("Sab saaf ho gaya");
          }}
        >
          <span className="text-xl">🗑️</span>
          <span className="flex-1">Sara data mitao</span>
        </button>
      </Card>
      <p className="mt-6 text-center text-xs text-slate-400">Kharcha · aapka apna hisaab-kitaab · offline & private</p>
    </div>
  );
}
