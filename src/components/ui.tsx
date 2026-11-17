import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { category } from "../lib/categories";
import { nameOf, personOf, useData } from "../lib/store";
import { ME, type Who } from "../lib/types";
import { navigate } from "../lib/ui";
import { evalAmount, initials, inr, isExpression } from "../lib/utils";
import { Icon, type IconName } from "./Icon";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ------------------------------------------------------------ layout

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const base = "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";
  if (onClick)
    return (
      <button onClick={onClick} className={cx(base, "block w-full text-left transition hover:border-brand-300 hover:shadow-md active:scale-[0.99] dark:hover:border-brand-700", className)}>
        {children}
      </button>
    );
  return <div className={cx(base, className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: string | boolean; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {back && (
        <button
          onClick={() => (typeof back === "string" ? navigate(back) : history.back())}
          className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Peeche"
        >
          <Icon name="back" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="text-5xl">{emoji}</div>
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ------------------------------------------------------------ buttons

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  danger: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  className,
  type = "button",
  disabled,
  size = "md",
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  icon?: IconName;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-11 px-4 text-sm gap-2", lg: "h-12 px-5 text-base gap-2" };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {icon && <Icon name={icon} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />}
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, color }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      )}
      style={active && color ? { background: color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx("flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium transition",
            value === o.value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ inputs

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500";

/**
 * A labelled form field. Use `group` when the content is several buttons (like a
 * people picker): a <label> around buttons would make any tap on it press the first one.
 */
export function Field({ label, hint, children, className, group }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cx("block", className)} role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </Tag>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

/** A number box. Plain number only (for rates, years, quantities). */
export function NumberInput({ value, onChange, placeholder, suffix, min, step, className, ariaLabel }: { value: number | ""; onChange: (v: number | "") => void; placeholder?: string; suffix?: string; min?: number; step?: number; className?: string; ariaLabel?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        step={step ?? "any"}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={cx(inputClass, suffix && "pr-14", className)}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-slate-400">{suffix}</span>}
    </div>
  );
}

/**
 * Amount box that is also a calculator: type "120+80*2" and it shows "= ₹280".
 * `onValue` receives the worked-out number (or null while it is not valid).
 */
export function AmountInput({ text, onText, big, placeholder = "0", autoFocus, ariaLabel = "Amount" }: { text: string; onText: (t: string, value: number | null) => void; big?: boolean; placeholder?: string; autoFocus?: boolean; ariaLabel?: string }) {
  const value = evalAmount(text);
  const showResult = isExpression(text) && value !== null;
  return (
    <div>
      <div className={cx("flex items-center rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-950", big ? "py-2" : "py-1.5")}>
        <span className={cx("mr-1 font-semibold text-slate-400", big ? "text-3xl" : "text-lg")}>₹</span>
        <input
          inputMode="decimal"
          autoFocus={autoFocus}
          value={text}
          aria-label={ariaLabel}
          placeholder={placeholder}
          onChange={(e) => onText(e.target.value, evalAmount(e.target.value))}
          onBlur={() => showResult && onText(String(value), value)}
          className={cx("w-full min-w-0 bg-transparent font-bold outline-none tabular placeholder:text-slate-300 dark:placeholder:text-slate-600", big ? "text-4xl" : "text-xl")}
        />
      </div>
      <div className="mt-1 flex h-5 items-center justify-between px-1 text-xs">
        {showResult ? <span className="font-semibold text-brand-600 dark:text-brand-400">= {inr(value!)}</span> : <span className="text-slate-400">Jod-ghata bhi chalega: 120+80*2</span>}
      </div>
    </div>
  );
}

export function Select({ value, onChange, children, ariaLabel, className }: { value: string; onChange: (v: string) => void; children: ReactNode; ariaLabel?: string; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className={cx(inputClass, "appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <span className="relative">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/30 dark:bg-slate-700" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

// ------------------------------------------------------------ people

export function Avatar({ who, size = 40 }: { who: Who; size?: number }) {
  const data = useData();
  const p = personOf(who, data);
  const name = nameOf(who, data);
  const bg = who === ME ? "#6526ef" : p?.color ?? "#94a3b8";
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }} aria-hidden="true">
      {who === ME ? "Me" : initials(name)}
    </span>
  );
}

export function CategoryIcon({ name, size = 40 }: { name: string; size?: number }) {
  const c = category(name);
  return (
    <span className="grid shrink-0 place-items-center rounded-xl" style={{ width: size, height: size, background: `${c.color}1f`, fontSize: size * 0.5 }} aria-hidden="true">
      {c.emoji}
    </span>
  );
}

export function Progress({ value, max, color, className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "#f43f5e" : color ?? "#6526ef" }} />
    </div>
  );
}

/** Shows "aapko ₹500 milenge" style text for a balance. */
export function BalanceText({ amount, short }: { amount: number; short?: boolean }) {
  if (Math.abs(amount) < 0.01) return <span className="text-slate-500 dark:text-slate-400">Hisaab barabar ✓</span>;
  if (amount > 0)
    return (
      <span className="text-emerald-600 dark:text-emerald-400">
        {short ? "" : "Lena hai "}
        <b className="tabular">{inr(amount)}</b>
      </span>
    );
  return (
    <span className="text-rose-600 dark:text-rose-400">
      {short ? "" : "Dena hai "}
      <b className="tabular">{inr(-amount)}</b>
    </span>
  );
}

// ------------------------------------------------------------ sheet (modal)

export function Sheet({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cx("animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white outline-none sm:rounded-3xl dark:bg-slate-900", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />
        <div className="flex items-center gap-3 px-5 pb-2 pt-3 sm:pt-5">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Band karo">
            <Icon name="x" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/** Small "result" display used by calculators. */
export function Stat({ label, value, tone, big }: { label: string; value: ReactNode; tone?: "good" | "bad" | "brand"; big?: boolean }) {
  const tones = { good: "text-emerald-600 dark:text-emerald-400", bad: "text-rose-600 dark:text-rose-400", brand: "text-brand-600 dark:text-brand-400" };
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cx("tabular font-bold", big ? "text-2xl" : "text-lg", tone && tones[tone])}>{value}</p>
    </div>
  );
}

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (next: T) => {
    setV(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}
