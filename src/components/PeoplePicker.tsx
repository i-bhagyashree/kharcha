import { useState } from "react";
import { addPerson, useData } from "../lib/store";
import { ME, type Who } from "../lib/types";
import { Icon } from "./Icon";
import { Avatar, cx } from "./ui";

/** Choose people (chips). New names can be typed in and are added on the spot. */
export function PeoplePicker({ selected, onChange, includeMe = true, only }: { selected: Who[]; onChange: (v: Who[]) => void; includeMe?: boolean; only?: Who[] }) {
  const data = useData();
  const [adding, setAdding] = useState("");
  const people = data.people.filter((p) => !only || only.includes(p.id));
  const all: { id: Who; name: string }[] = [...(includeMe ? [{ id: ME, name: "Aap" }] : []), ...people.map((p) => ({ id: p.id, name: p.name }))];
  const toggle = (id: Who) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  function add() {
    const names = adding.split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    const ids = names.map((n) => addPerson(n).id);
    onChange([...new Set([...selected, ...ids])]);
    setAdding("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={cx(
                "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition",
                on ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-500 dark:bg-brand-950/60 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              <Avatar who={p.id} size={26} />
              {p.name}
              {on && <Icon name="check" className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
      {!only && (
        <div className="mt-2 flex gap-2">
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Naya naam likho (Rahul, Priya...)"
            className="h-10 min-w-0 flex-1 rounded-xl border border-dashed border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
          />
          <button type="button" onClick={add} disabled={!adding.trim()} className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-semibold disabled:opacity-40 dark:bg-slate-800">
            + Jodo
          </button>
        </div>
      )}
    </div>
  );
}

/** Pick one person (not me). New names can be added. */
export function PersonSelect({ value, onChange }: { value: Who | ""; onChange: (v: Who) => void }) {
  return <PeoplePicker includeMe={false} selected={value ? [value] : []} onChange={(v) => v.length && onChange(v[v.length - 1])} />;
}
