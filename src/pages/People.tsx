import { useMemo, useState } from "react";
import { balancesWithMe, debtsOf, effectWith, expensesOnly, groupNet, myShare, openLoans, simplify, totals } from "../lib/balances";
import { nameOf, personOf, saveEntry, update, useData } from "../lib/store";
import { ME, type Transfer } from "../lib/types";
import { navigate, openSheet, showToast } from "../lib/ui";
import { dateLabelFull, inr, today, uid } from "../lib/utils";
import { EntryList } from "../components/EntryRow";
import { Icon } from "../components/Icon";
import { Avatar, BalanceText, Button, Card, cx, Empty, PageHeader, SectionTitle, Segmented } from "../components/ui";

export function People() {
  const data = useData();
  const [tab, setTab] = useState<"log" | "group">("log");
  const bal = useMemo(() => balancesWithMe(data.entries), [data.entries]);
  const { lena, dena, net } = totals(bal);
  const people = [...data.people].sort((a, b) => Math.abs(bal.get(b.id) ?? 0) - Math.abs(bal.get(a.id) ?? 0) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader title="Hisaab" subtitle="Kisko dena, kisse lena" action={<Button size="sm" icon="plus" onClick={() => openSheet(tab === "log" ? { type: "person" } : { type: "group" })}>{tab === "log" ? "Insaan" : "Group"}</Button>} />

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Lena hai</p>
          <p className="text-lg font-bold text-emerald-600 tabular dark:text-emerald-400">{inr(lena)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Dena hai</p>
          <p className="text-lg font-bold text-rose-600 tabular dark:text-rose-400">{inr(dena)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Kul</p>
          <p className={cx("text-lg font-bold tabular", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{inr(net)}</p>
        </Card>
      </div>

      <Segmented
        className="mt-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "log", label: `👤 Log (${data.people.length})` },
          { value: "group", label: `👥 Groups / Trips (${data.groups.length})` },
        ]}
      />

      {tab === "log" ? (
        people.length ? (
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {people.map((p) => {
              const b = bal.get(p.id) ?? 0;
              return (
                <button key={p.id} onClick={() => navigate(`/person/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Avatar who={p.id} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-sm">
                      <BalanceText amount={b} />
                    </p>
                  </div>
                  <Icon name="next" className="h-4 w-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        ) : (
          <Empty emoji="🤝" title="Abhi koi nahi" text="Dost, rishtedaar, doodhwala — jisse bhi lena-dena hota hai, unhe jodo." action={<Button icon="plus" onClick={() => openSheet({ type: "person" })}>Insaan jodo</Button>} />
        )
      ) : data.groups.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.groups.map((g) => {
            const entries = data.entries.filter((e) => e.groupId === g.id);
            const total = expensesOnly(entries).reduce((s, e) => s + e.amount, 0);
            const mine = groupNet(entries, g.members).get(ME) ?? 0;
            return (
              <Card key={g.id} onClick={() => navigate(`/group/${g.id}`)} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-950">{g.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{g.name}</p>
                    <p className="text-xs text-slate-500">
                      {g.members.length} log · kul {inr(total)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm">
                  <BalanceText amount={mine} />
                </p>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty emoji="🏖️" title="Koi group nahi" text="Trip, flat-mates, office lunch — group banao aur sabka hisaab ek jagah rakho." action={<Button icon="plus" onClick={() => openSheet({ type: "group" })}>Group banao</Button>} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ one person

export function PersonPage({ id }: { id: string }) {
  const data = useData();
  const person = personOf(id, data);
  const entries = useMemo(() => data.entries.filter((e) => Math.abs(effectWith(e, id)) > 0.009 || (e.kind === "transfer" && (e.from === id || e.to === id))), [data.entries, id]);
  const balance = balancesWithMe(data.entries).get(id) ?? 0;
  const loans = openLoans(data.entries).filter((l) => l.person === id);
  if (!person) return <Empty emoji="🤷" title="Yeh insaan nahi mila" action={<Button onClick={() => navigate("/hisaab")}>Hisaab pe jao</Button>} />;

  function removePerson() {
    if (entries.length && !confirm(`${person!.name} ki ${entries.length} entries bhi hat jayengi. Pakka?`)) return;
    if (!entries.length && !confirm(`${person!.name} ko hatana hai?`)) return;
    update((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== id),
      entries: d.entries.filter((e) => !(e.kind === "transfer" ? e.from === id || e.to === id : e.paidBy === id || e.shares.some((s) => s.who === id))),
      groups: d.groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== id) })),
    }));
    navigate("/hisaab");
    showToast(`${person!.name} hata diye gaye`);
  }

  return (
    <div>
      <PageHeader
        back="/hisaab"
        title={person.name}
        subtitle={person.phone ? `📞 ${person.phone}` : undefined}
        action={
          <button onClick={() => openSheet({ type: "person", person })} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800" aria-label="Badlo">
            <Icon name="edit" />
          </button>
        }
      />
      <Card className="p-5 text-center">
        <div className="flex justify-center">
          <Avatar who={id} size={64} />
        </div>
        <p className="mt-3 text-sm text-slate-500">{balance > 0.009 ? `${person.name.split(" ")[0]} aapko denge` : balance < -0.009 ? `Aapko ${person.name.split(" ")[0]} ko dena hai` : "Sab barabar"}</p>
        <p className={cx("text-4xl font-bold tabular", balance > 0.009 ? "text-emerald-600 dark:text-emerald-400" : balance < -0.009 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
          {Math.abs(balance) < 0.01 ? "✓" : inr(Math.abs(balance))}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            variant="success"
            icon="check"
            disabled={Math.abs(balance) < 0.01}
            onClick={() => openSheet({ type: "transfer", preset: { from: balance > 0 ? id : ME, to: balance > 0 ? ME : id, amount: Math.abs(balance), purpose: "settle" } })}
          >
            Chukta karo
          </Button>
          <Button variant="secondary" icon="bell" disabled={Math.abs(balance) < 0.01} onClick={() => openSheet({ type: "reminder", personId: id })}>
            {balance >= 0 ? "Yaad dilao" : "Message"}
          </Button>
          <Button variant="secondary" onClick={() => openSheet({ type: "transfer", preset: { from: ME, to: id, purpose: "udhaar" } })}>
            ↗ Diye
          </Button>
          <Button variant="secondary" onClick={() => openSheet({ type: "transfer", preset: { from: id, to: ME, purpose: "udhaar" } })}>
            ↙ Liye
          </Button>
        </div>
        <button onClick={() => openSheet({ type: "expense", preset: { shares: [{ who: ME, amount: 0 }, { who: id, amount: 0 }], splitType: "equal" } })} className="mt-3 text-sm font-medium text-brand-600 dark:text-brand-400">
          + {person.name.split(" ")[0]} ke saath kharcha baanto
        </button>
      </Card>

      {loans.length > 0 && (
        <>
          <SectionTitle>Khule udhaar</SectionTitle>
          <div className="space-y-2">
            {loans.map((l) => (
              <Card key={l.transfer.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="text-xl">{l.direction === "lena" ? "↗️" : "↙️"}</span>
                <div className="flex-1">
                  <p className="font-medium">
                    {inr(l.transfer.amount)} {l.direction === "lena" ? "diye the" : "liye the"} · {dateLabelFull(l.transfer.date)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {l.transfer.dueDate && (l.overdueDays > 0 ? <span className="font-semibold text-rose-600">{l.overdueDays} din late · </span> : `Lautana: ${dateLabelFull(l.transfer.dueDate)} · `)}
                    {l.interest > 0 && `Byaaj ab tak ${inr(l.interest)} (₹${l.transfer.interestRate} sankda) · byaaj milakar ${inr(l.transfer.amount + l.interest)}`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Poora hisaab</SectionTitle>
      {entries.length ? <EntryList entries={entries} person={id} /> : <Empty emoji="📒" title="Abhi koi entry nahi" />}
      <div className="mt-8 text-center">
        <button onClick={removePerson} className="text-sm text-slate-400 hover:text-rose-600">
          {person.name} ko hatao
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ one group

export function GroupPage({ id }: { id: string }) {
  const data = useData();
  const group = data.groups.find((g) => g.id === id);
  const entries = useMemo(() => data.entries.filter((e) => e.groupId === id), [data.entries, id]);
  if (!group) return <Empty emoji="🤷" title="Group nahi mila" action={<Button onClick={() => navigate("/hisaab")}>Hisaab pe jao</Button>} />;

  const exps = expensesOnly(entries);
  const total = exps.reduce((s, e) => s + e.amount, 0);
  const mine = exps.reduce((s, e) => s + myShare(e), 0);
  const net = groupNet(entries, group.members);
  const plan = simplify(net);
  const rawCount = new Set(entries.flatMap((e) => debtsOf(e).map((d) => `${d.from}>${d.to}`))).size;
  const spentBy = new Map<string, number>();
  for (const e of exps) for (const s of e.shares) spentBy.set(s.who, (spentBy.get(s.who) ?? 0) + s.amount);

  function settle(from: string, to: string, amount: number) {
    const t: Transfer = { kind: "transfer", id: uid(), from, to, amount, date: today(), purpose: "settle", mode: "upi", groupId: id, createdAt: new Date().toISOString() };
    saveEntry(t);
    showToast(`${nameOf(from, data)} → ${nameOf(to, data)} ${inr(amount)} chukta ✓`, () => update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== t.id) })));
  }

  async function shareSummary() {
    const lines = [
      `${group!.emoji} ${group!.name} — hisaab`,
      `Kul kharcha: ${inr(total)}`,
      "",
      ...group!.members.map((m) => `${nameOf(m, data)}: hissa ${inr(spentBy.get(m) ?? 0)}`),
      "",
      plan.length ? "Kaun kisko de:" : "Sab barabar ✓",
      ...plan.map((p) => `• ${nameOf(p.from, data)} → ${nameOf(p.to, data)}: ${inr(p.amount)}`),
      "",
      "— Kharcha app",
    ];
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Hisaab copy ho gaya — WhatsApp group me paste karo ✓");
    } catch {
      showToast("Copy nahi hua");
    }
  }

  function removeGroup() {
    if (!confirm(`"${group!.name}" group hatana hai? Iske ${entries.length} entries bhi hat jayengi.`)) return;
    update((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id), entries: d.entries.filter((e) => e.groupId !== id) }));
    navigate("/hisaab");
  }

  return (
    <div>
      <PageHeader
        back="/hisaab"
        title={`${group.emoji} ${group.name}`}
        subtitle={`${group.members.length} log`}
        action={
          <button onClick={() => openSheet({ type: "group", group })} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800" aria-label="Group badlo">
            <Icon name="edit" />
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Kul kharcha</p>
          <p className="text-lg font-bold tabular">{inr(total)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Aapka hissa</p>
          <p className="text-lg font-bold tabular">{inr(mine)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Aapka hisaab</p>
          <p className="text-lg font-bold">
            <BalanceText amount={net.get(ME) ?? 0} short />
          </p>
        </Card>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button icon="plus" onClick={() => openSheet({ type: "expense", preset: { groupId: id, splitType: "equal", shares: group.members.map((m) => ({ who: m, amount: 0 })) } })}>
          Group kharcha
        </Button>
        <Button variant="secondary" icon="share" onClick={shareSummary}>
          Hisaab share karo
        </Button>
      </div>

      <SectionTitle>Kaun kisko de? {plan.length > 0 && rawCount > plan.length && <span className="normal-case tracking-normal text-brand-600">({rawCount} ki jagah sirf {plan.length} payment)</span>}</SectionTitle>
      {plan.length ? (
        <div className="space-y-2">
          {plan.map((p) => (
            <Card key={`${p.from}-${p.to}`} className="flex items-center gap-3 p-3">
              <Avatar who={p.from} size={34} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate">
                  <b>{nameOf(p.from, data)}</b> → <b>{nameOf(p.to, data)}</b>
                </p>
                <p className="font-semibold tabular text-brand-700 dark:text-brand-300">{inr(p.amount)}</p>
              </div>
              <Button size="sm" variant="success" onClick={() => settle(p.from, p.to, p.amount)}>
                Ho gaya
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4 text-center text-sm text-slate-500">🎉 Sab ka hisaab barabar hai</Card>
      )}

      <SectionTitle>Har ek ki sthiti</SectionTitle>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {group.members.map((m) => (
          <div key={m} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar who={m} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{nameOf(m, data)}</p>
              <p className="text-xs text-slate-500">Hissa {inr(spentBy.get(m) ?? 0)}</p>
            </div>
            <span className="text-sm">
              <BalanceText amount={net.get(m) ?? 0} short />
            </span>
          </div>
        ))}
      </div>

      <SectionTitle>Group ki entries</SectionTitle>
      {entries.length ? <EntryList entries={entries} /> : <Empty emoji="🧾" title="Abhi koi kharcha nahi" />}
      <div className="mt-8 text-center">
        <button onClick={removeGroup} className="text-sm text-slate-400 hover:text-rose-600">
          Group hatao
        </button>
      </div>
    </div>
  );
}
