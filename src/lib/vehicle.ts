import type { LeaseModel } from "./types";

export function modelLabel(model?: LeaseModel) {
  if (!model) return "Выберите автомобиль";
  const brand = model.brand.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const name = model.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
}

/** Word search over brand, model and partner, as in the calculator's model picker. */
export function searchModels(models: LeaseModel[], query: string, limit = 8): LeaseModel[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return models
    .filter((model) =>
      words.every((word) =>
        `${model.brand} ${model.name} ${model.partnerName}`.toLocaleLowerCase().includes(word),
      ),
    )
    .slice(0, limit);
}

// Common Cyrillic spellings of Latin brand/model names in client messages.
const TRANSLIT: Array<[RegExp, string]> = [
  [/шч|щ/g, "sch"],
  [/ж/g, "zh"],
  [/ч/g, "ch"],
  [/ш/g, "sh"],
  [/ю/g, "yu"],
  [/я/g, "ya"],
  [/х/g, "h"],
  [/ц/g, "ts"],
  [/кс/g, "x"],
  [/а/g, "a"],
  [/б/g, "b"],
  [/в/g, "v"],
  [/г/g, "g"],
  [/д/g, "d"],
  [/[её]/g, "e"],
  [/з/g, "z"],
  [/[иы]/g, "i"],
  [/й/g, "y"],
  [/к/g, "k"],
  [/л/g, "l"],
  [/м/g, "m"],
  [/н/g, "n"],
  [/о/g, "o"],
  [/п/g, "p"],
  [/р/g, "r"],
  [/с/g, "s"],
  [/т/g, "t"],
  [/у/g, "u"],
  [/ф/g, "f"],
  [/[ьъ]/g, ""],
  [/э/g, "e"],
];
const ALIASES: Record<string, string> = {
  туксон: "tucson",
  тусон: "tucson",
  хендай: "hyundai",
  хундай: "hyundai",
  хёндэ: "hyundai",
  камри: "camry",
  тойота: "toyota",
  киа: "kia",
  шкода: "skoda",
  фольксваген: "volkswagen",
  шевроле: "chevrolet",
  кобальт: "cobalt",
  лада: "lada",
  джили: "geely",
  чери: "chery",
  хавал: "haval",
  мерседес: "mercedes",
  бмв: "bmw",
  ауди: "audi",
  ниссан: "nissan",
  мицубиси: "mitsubishi",
  рено: "renault",
  соната: "sonata",
  элантра: "elantra",
  спортейдж: "sportage",
  рио: "rio",
  октавия: "octavia",
  поло: "polo",
  нексия: "nexia",
};
const STOP = new Set([
  "хочу",
  "лизинг",
  "машину",
  "машина",
  "автомобиль",
  "авто",
  "взять",
  "купить",
  "модель",
  "марку",
  "поменяй",
  "замени",
  "тогда",
  "давай",
  "вместо",
  "другую",
  "стоимость",
  "аванс",
  "срок",
  "платеж",
  "месяцев",
  "года",
  "лет",
  "тенге",
  "миллионов",
  "млн",
  "тысяч",
]);

function toLatin(word: string): string {
  if (ALIASES[word]) return ALIASES[word];
  let out = word;
  for (const [pattern, replacement] of TRANSLIT) out = out.replace(pattern, replacement);
  return out;
}

/**
 * Find vehicles named in free text: brand and/or model words (Latin or common Cyrillic
 * spellings). Returns models matching the most specific words; empty if nothing is named.
 */
export function findVehiclesInText(models: LeaseModel[], text: string): LeaseModel[] {
  const words = text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\d-]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w))
    // Cyrillic words become brand/model names only via known spellings or when long enough:
    // short particles («ли», «на», «до») must not match brands like «Li».
    .filter((w) => !/[а-я]/.test(w) || ALIASES[w] !== undefined || w.length >= 4)
    .map((w) => (/[а-я]/.test(w) ? toLatin(w) : w));
  if (!words.length) return [];
  const known = (w: string) =>
    models.some(
      (m) => m.brand.toLowerCase() === w || m.name.toLowerCase().split(/\s+/).includes(w),
    );
  const named = words.filter(known);
  if (!named.length) return [];
  return models.filter((m) => {
    const hay = `${m.brand} ${m.name}`.toLowerCase().split(/\s+/);
    return named.every((w) => hay.includes(w) || m.brand.toLowerCase() === w);
  });
}
