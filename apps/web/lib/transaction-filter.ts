// Транзакцын дэвшилтэт шүүлтийн query parser.
// Дэмжих syntax:
//   word                  — бүх textual талбараас substring (AND)
//   -word                 — энэ үг агуулсан мөрийг хасна
//   "phrase here"         — яг хэллэг (case-insensitive)
//   cat:хоол              — category-д "хоол" агуулна (case-insensitive)
//   -cat:хоол             — category-д агуулахгүй
//   bank:хас              — банкны нэрэнд "хас" агуулна
//   note:такси            — note талбараас хайна
//   desc:atm              — description / counterparty-аас хайна
//   t:income | t:expense  — type шүүлт ( t:in / t:exp ч хүлээн авна)
//   >50000                — amount > 50000
//   <10000                — amount < 10000
//   >=1000  <=99999       — inclusive
//   >=2024-03-01          — date >= 2024-03-01
//   <=2024-06             — date <= 2024-06-30 (хязгаар тооцоолно)
//   2024-03-15            — яг тэр өдөр
//
// Бусад UI-аар орох шүүлтүүд (категори multi-select, бүх банк, type chip)
// query-ээс үл хамаарч AND-аар нэгдэнэ.

export interface FilterTx {
  date: string; // ISO
  description: string;
  counterparty?: string | null;
  amount: number;
  type: string;
  category: string;
  note?: string | null;
  statement?: { fileName?: string | null; bankName?: string | null } | null;
}

export interface ParsedQuery {
  includeTokens: string[];        // bare words / phrases (AND)
  excludeTokens: string[];        // -word
  fieldFilters: Array<{ field: "cat" | "bank" | "note" | "desc" | "t"; value: string; negate: boolean }>;
  amountMin?: number;             // >n, >=n
  amountMax?: number;             // <n, <=n
  dateMin?: Date;                 // >=YYYY-MM-DD or YYYY-MM (start)
  dateMax?: Date;                 // <=YYYY-MM-DD or YYYY-MM (end)
  invalid: string[];              // алдаатай хэсгүүд (UI-д сэргээж болно)
}

// Жижигхэн tokenizer: space-аар хуваана, гэхдээ "..." бүлгийг хадгална.
function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /-?(?:[a-zа-яёүөһ]+:)?"([^"]*)"|\S+/giu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    out.push(m[0]);
  }
  return out;
}

const FIELD_KEYS = new Set(["cat", "bank", "note", "desc", "t"]);

function parseDate(s: string): Date | null {
  // YYYY-MM-DD, YYYY-MM, эсвэл YYYY
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) - 1 : 0;
  const d = m[3] ? Number(m[3]) : 1;
  const dt = new Date(Date.UTC(y, mo, d));
  return isNaN(dt.getTime()) ? null : dt;
}

function endOfRangeFromPartial(s: string): Date | null {
  // ">=" / "<=" -ийн дараа inclusive boundary: YYYY → 12-31, YYYY-MM → сарын сүүлийн өдөр
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  if (!m[2]) return new Date(Date.UTC(y, 11, 31, 23, 59, 59));
  const mo = Number(m[2]) - 1;
  if (!m[3]) {
    // сарын сүүлийн өдөр
    return new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59));
  }
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 23, 59, 59));
}

export function parseQuery(input: string): ParsedQuery {
  const q: ParsedQuery = {
    includeTokens: [],
    excludeTokens: [],
    fieldFilters: [],
    invalid: [],
  };
  if (!input || !input.trim()) return q;

  for (const raw of tokenize(input)) {
    let tok = raw;
    let negate = false;
    if (tok.startsWith("-") && tok.length > 1) {
      negate = true;
      tok = tok.slice(1);
    }

    // Comparison operators: >n, <n, >=n, <=n
    const cmp = /^(>=|<=|>|<)(.+)$/.exec(tok);
    if (cmp) {
      const [, op, restRaw] = cmp;
      const rest = restRaw.replace(/^"|"$/g, "");
      // Огноо мөн үү?
      const d = parseDate(rest);
      if (d) {
        if (op === ">" || op === ">=") {
          q.dateMin = d;
        } else {
          q.dateMax = (op === "<=" ? endOfRangeFromPartial(rest) ?? d : d);
        }
        continue;
      }
      // Тоо мөн үү? (зайлшгүй цэвэр тоо)
      const n = Number(rest.replace(/[, _]/g, ""));
      if (Number.isFinite(n)) {
        if (op === ">") q.amountMin = (q.amountMin == null ? n + 0.0001 : Math.max(q.amountMin, n + 0.0001));
        else if (op === ">=") q.amountMin = (q.amountMin == null ? n : Math.max(q.amountMin, n));
        else if (op === "<") q.amountMax = (q.amountMax == null ? n - 0.0001 : Math.min(q.amountMax, n - 0.0001));
        else q.amountMax = (q.amountMax == null ? n : Math.min(q.amountMax, n));
        continue;
      }
      q.invalid.push(raw);
      continue;
    }

    // field:value
    const fm = /^([a-zа-яёүөһ]+):(.+)$/iu.exec(tok);
    if (fm) {
      const field = fm[1].toLowerCase();
      let value = fm[2];
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (FIELD_KEYS.has(field)) {
        q.fieldFilters.push({
          field: field as ParsedQuery["fieldFilters"][number]["field"],
          value: value.toLowerCase(),
          negate,
        });
        continue;
      }
      q.invalid.push(raw);
      continue;
    }

    // Bare token / phrase: "..."
    let value = tok;
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!value) continue;

    // Bare date → date filter (exact day)
    const d = parseDate(value);
    if (d && /^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      const end = endOfRangeFromPartial(value);
      // exact-day → both min and max
      if (negate) {
        // 'NOT a single day' гэдэг ховор хэрэглээ — phrase шиг үлдээе
        q.excludeTokens.push(value.toLowerCase());
      } else {
        q.dateMin = q.dateMin && q.dateMin > d ? q.dateMin : d;
        q.dateMax = q.dateMax && end && q.dateMax < end ? q.dateMax : (end ?? d);
      }
      continue;
    }

    if (negate) q.excludeTokens.push(value.toLowerCase());
    else q.includeTokens.push(value.toLowerCase());
  }
  return q;
}

function haystackFor(t: FilterTx): string {
  return [
    new Date(t.date).toISOString().slice(0, 10),
    new Date(t.date).toLocaleDateString("mn-MN"),
    t.description,
    t.counterparty ?? "",
    t.category,
    t.type === "income" ? "орлого income" : "зарлага expense",
    String(t.amount),
    t.note ?? "",
    t.statement?.fileName ?? "",
    t.statement?.bankName ?? "",
  ].join(" ").toLowerCase();
}

function fieldValue(t: FilterTx, field: ParsedQuery["fieldFilters"][number]["field"]): string {
  switch (field) {
    case "cat": return t.category.toLowerCase();
    case "bank": return (t.statement?.bankName ?? "").toLowerCase();
    case "note": return (t.note ?? "").toLowerCase();
    case "desc": return (t.description + " " + (t.counterparty ?? "")).toLowerCase();
    case "t":   return t.type.toLowerCase();
  }
}

export function matchesQuery(t: FilterTx, q: ParsedQuery): boolean {
  const hay = haystackFor(t);

  for (const tok of q.includeTokens) if (!hay.includes(tok)) return false;
  for (const tok of q.excludeTokens) if (hay.includes(tok)) return false;

  for (const f of q.fieldFilters) {
    const v = fieldValue(t, f.field);
    // Type-д хуучирсан богино forms-ийг ч хүлээн авна
    const target = f.field === "t"
      ? (f.value.startsWith("in") ? "income" : f.value.startsWith("ex") ? "expense" : f.value)
      : f.value;
    const hit = v.includes(target);
    if (f.negate ? hit : !hit) return false;
  }

  if (q.amountMin != null && t.amount < q.amountMin) return false;
  if (q.amountMax != null && t.amount > q.amountMax) return false;

  if (q.dateMin || q.dateMax) {
    const td = new Date(t.date).getTime();
    if (q.dateMin && td < q.dateMin.getTime()) return false;
    if (q.dateMax && td > q.dateMax.getTime()) return false;
  }
  return true;
}

export interface ExtraFilters {
  typeFilter: "all" | "income" | "expense";
  bankFilter: string; // shortName lowercase or "all"
  categories: Set<string>; // empty = бүгд
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export type SortKey = "date" | "amount" | "description" | "category";
export type SortDir = "asc" | "desc";

export function applyAll<T extends FilterTx>(
  transactions: T[],
  query: ParsedQuery,
  extra: ExtraFilters,
  sortKey: SortKey,
  sortDir: SortDir
): T[] {
  const from = extra.dateFrom ? new Date(extra.dateFrom + "T00:00:00").getTime() : null;
  const to = extra.dateTo ? new Date(extra.dateTo + "T23:59:59").getTime() : null;

  const out = transactions.filter(t => {
    if (extra.typeFilter !== "all" && t.type !== extra.typeFilter) return false;
    if (extra.bankFilter !== "all") {
      const bn = t.statement?.bankName?.toLowerCase() ?? "unknown";
      if (bn !== extra.bankFilter) return false;
    }
    if (extra.categories.size > 0 && !extra.categories.has(t.category)) return false;
    if (from || to) {
      const td = new Date(t.date).getTime();
      if (from && td < from) return false;
      if (to && td > to) return false;
    }
    if (extra.amountMin != null && t.amount < extra.amountMin) return false;
    if (extra.amountMax != null && t.amount > extra.amountMax) return false;
    if (!matchesQuery(t, query)) return false;
    return true;
  });

  out.sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortKey === "amount") cmp = a.amount - b.amount;
    else if (sortKey === "description") cmp = a.description.localeCompare(b.description, "mn");
    else if (sortKey === "category") cmp = a.category.localeCompare(b.category, "mn");
    return sortDir === "asc" ? cmp : -cmp;
  });
  return out;
}
