# Kharcha — apna hisaab, apne paas

**Live demo:** https://i-bhagyashree.github.io/kharcha/ (open it and tap "demo data ke saath dekho")

Kharcha is a personal expense and *lena-dena* (who owes whom) app for India. Write down what you spent, keep track of udhaar, split bills with friends, keep the daily milk/maid khaata, and use 14 everyday calculators. It runs fully in the browser: no login, no server, and the data stays on the device.

## Features

**Writing things down**
- **Bolo ya likho (quick add):** type or say in Hinglish — `chai 20`, `Rahul ko 500 udhaar diye`, `Amit se 300 liye`, `Rahul ne 1000 wapas diye`, `dinner 1800 Rahul Amit ke saath`, `sabzi 120+80 upi kal`. It works out the amount, category, people, split, payment mode and date. Voice uses the browser's speech recognition.
- **Every amount box is a calculator:** `120+80*2`, `500 + 18%`, `1,200/3`.
- Full expense form: 15 Indian categories, cash/UPI/card, who paid, notes.

**Lena-dena (hisaab)**
- Balance with every person: *lena hai* / *dena hai*, a full history, and one-tap *chukta* (settle).
- Udhaar with a due date and **interest in "₹ sankda"** (₹ per ₹100 per month), with interest so far and overdue alerts.
- **WhatsApp reminder** in 3 tones (pyaar se / seedha / sakht) and 3 languages (Hinglish / हिंदी / English), with the hisaab breakdown and a **UPI pay link**.

**Splitting**
- Equal, exact ₹, %, shares, and **item-wise** (who ate what; tax/tip/discount shared in proportion).
- Groups/trips with **simplified settle-up** (fewest payments) and a summary to share in the WhatsApp group.

**Ghar ka hisaab**
- **Rozana khaata:** a calendar for doodh, kaamwali, akhbaar, paani. Tap for days off, double-tap for a different quantity, the month's bill is worked out, and a summary can be sent to the doodhwala.
- **Mahine ke bill:** rent, bijli, recharge with due dates; marking one paid adds it to expenses.
- **Kya lena hai:** shopping list (`aloo 2kg 60`) with an estimate; when bought, it becomes one expense and shows how much was saved against the estimate.

**Samajh**
- Home: this month's spend vs the same days last month, budget with "roz kitna kharch kar sakte ho", alerts.
- Budget per month and per category, with a month-end projection at the current pace.
- Report: category donut, 6-month trend, spending by weekday, no-spend days, *kharcha kahani*.
- Optional: show each expense as **hours of work** ("yeh 2.5 ghante ki kamaai hai").

**Calculators (14):** bill split, note counter (cash), udhaar byaaj, which pack is cheaper, hours of work, GST, discount (50%+20% ≠ 70%), EMI, SIP with yearly step-up, goal planner, rent split by room size, trip petrol, percentage, cheque amount in words (Lakh/Crore).

**Themes:** Light, Dark (navy), Black (pure black, saves battery on AMOLED phones) and Auto (follows the phone). Change in Settings, or tap the theme button at the top to go Light → Dark → Black.

**Other:** desktop sidebar and mobile bottom bar, press `N` to add, JSON backup/restore, CSV (Excel) export, demo data, installable (web manifest).

## Privacy

All data is kept in the browser's IndexedDB on this device. The production build adds a Content Security Policy (`connect-src 'self'`) so the page cannot send data to other servers. WhatsApp links only open WhatsApp with the text; nothing is sent automatically. Voice input uses the browser's own speech service (in Chrome this may go through Google).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 39 tests: quick-add parser, splits, balances, calculators
npm run build    # production build in dist/
```

## Code map

| What | File |
|---|---|
| Data types | `src/lib/types.ts` |
| Storage (IndexedDB), actions | `src/lib/store.ts` |
| Who owes whom, group settle-up, interest | `src/lib/balances.ts` |
| Split maths (equal / % / shares / item-wise) | `src/lib/split.ts` |
| Hinglish quick-add parser | `src/lib/quickAdd.ts` |
| Bills, daily khaata, home alerts | `src/lib/household.ts` |
| Calculator maths | `src/lib/calc.ts` |
| WhatsApp reminder text, UPI link | `src/lib/reminder.ts` |
| Pages | `src/pages/` |

