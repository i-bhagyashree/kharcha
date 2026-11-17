export interface Category {
  name: string;
  emoji: string;
  color: string;
  /** Words that suggest this category in quick-add ("chai 20" -> Khana-Peena). */
  words: string[];
}

export const CATEGORIES: Category[] = [
  { name: "Khana-Peena", emoji: "🍛", color: "#f97316", words: ["chai", "tea", "coffee", "nashta", "breakfast", "lunch", "dinner", "khana", "swiggy", "zomato", "pizza", "burger", "samosa", "momos", "biryani", "restaurant", "hotel", "dhaba", "cafe", "snacks", "juice", "thali", "party", "ice cream", "maggi", "canteen", "mess", "tiffin"] },
  { name: "Ration", emoji: "🛒", color: "#84cc16", words: ["ration", "grocery", "kirana", "sabzi", "sabji", "vegetables", "fruits", "phal", "atta", "chawal", "rice", "dal", "oil", "tel", "masala", "blinkit", "zepto", "bigbasket", "dmart", "instamart", "anda", "eggs", "bread", "doodh", "milk", "paneer", "dahi"] },
  { name: "Safar", emoji: "🛺", color: "#0ea5e9", words: ["auto", "rickshaw", "cab", "uber", "ola", "rapido", "bus", "train", "ticket", "metro", "flight", "irctc", "taxi", "toll", "parking", "travel", "trip", "safar"] },
  { name: "Petrol", emoji: "⛽", color: "#64748b", words: ["petrol", "diesel", "fuel", "cng", "pump"] },
  { name: "Shopping", emoji: "🛍️", color: "#ec4899", words: ["kapde", "clothes", "shirt", "jeans", "saree", "kurta", "shoes", "joote", "amazon", "flipkart", "myntra", "meesho", "shopping", "gift", "watch", "bag"] },
  { name: "Bills", emoji: "💡", color: "#8b5cf6", words: ["bijli", "electricity", "light bill", "recharge", "mobile", "wifi", "internet", "broadband", "dth", "gas", "cylinder", "paani", "water", "bill"] },
  { name: "Ghar", emoji: "🏠", color: "#a16207", words: ["rent", "kiraya", "maintenance", "society", "repair", "plumber", "electrician", "furniture", "bartan", "safai", "kaamwali", "maid", "pg"] },
  { name: "Sehat", emoji: "💊", color: "#ef4444", words: ["dawai", "dawa", "medicine", "doctor", "hospital", "clinic", "test", "pharmacy", "chemist", "gym", "yoga", "checkup"] },
  { name: "Padhai", emoji: "📚", color: "#14b8a6", words: ["fees", "fee", "school", "college", "tuition", "coaching", "books", "kitab", "copy", "pen", "course", "exam", "stationery"] },
  { name: "Manoranjan", emoji: "🎬", color: "#f43f5e", words: ["movie", "film", "cinema", "netflix", "hotstar", "prime", "spotify", "game", "outing", "ghumna", "picnic"] },
  { name: "Personal", emoji: "💇", color: "#d946ef", words: ["haircut", "salon", "parlour", "cosmetics", "makeup", "shampoo", "soap", "cream"] },
  { name: "Daan-Puja", emoji: "🪔", color: "#eab308", words: ["daan", "donation", "mandir", "temple", "puja", "prasad", "shagun", "dakshina", "gurudwara", "church", "masjid"] },
  { name: "EMI-Loan", emoji: "🏦", color: "#b91c1c", words: ["emi", "loan", "credit card", "installment", "kist"] },
  { name: "Bachat", emoji: "🐷", color: "#10b981", words: ["sip", "mutual fund", "fd", "rd", "ppf", "gold", "sona", "stocks", "investment", "bachat", "saving", "lic", "insurance"] },
  { name: "Other", emoji: "📦", color: "#94a3b8", words: [] },
];

const byName = new Map(CATEGORIES.map((c) => [c.name, c]));
export const category = (name: string): Category => byName.get(name) ?? CATEGORIES[CATEGORIES.length - 1];

/** Guesses a category from what was written. */
export function guessCategory(text: string): string {
  const t = ` ${text.toLowerCase()} `;
  let best: { name: string; len: number } | null = null;
  for (const c of CATEGORIES) {
    for (const w of c.words) {
      if (new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z]`).test(t) && (!best || w.length > best.len)) {
        best = { name: c.name, len: w.length };
      }
    }
  }
  return best?.name ?? "Other";
}
