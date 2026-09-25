export const VEHICLE_CATEGORIES = {
  passenger: { label: "Легковые машины", ratePercent: 2.2, basisPoints: 220 },
  truck: { label: "Грузовые", ratePercent: 0.65, basisPoints: 65 },
  trailer_special: { label: "Прицепы и спецтехника", ratePercent: 0.44, basisPoints: 44 },
  bus: { label: "Автобусы", ratePercent: 1.3, basisPoints: 130 },
} as const;

export type VehicleCategory = keyof typeof VEHICLE_CATEGORIES;
export interface VehicleClassification {
  category: VehicleCategory;
  needsReview: boolean;
  basis: string;
}

type Rule = { brand: string; model: RegExp; category: VehicleCategory; needsReview?: boolean };

// A model family may include passenger/cargo/body conversions. These defaults
// are editable teaching classifications, not VIN or registration categories.
const rules: Rule[] = [
  { brand: "LADA", model: /^LARGUS/u, category: "passenger", needsReview: true },
  { brand: "ГАЗ", model: /^A65/u, category: "bus" },
  { brand: "ГАЗ", model: /./u, category: "truck", needsReview: true },
  { brand: "GAZELLE", model: /./u, category: "truck", needsReview: true },
  {
    brand: "UAZ",
    model: /^(?:2905|2924|3622|3962)/u,
    category: "trailer_special",
    needsReview: true,
  },
  { brand: "UAZ", model: /^2206/u, category: "bus" },
  {
    brand: "UAZ",
    model: /^(?:2360|2363|3303|3741|3909|PROFI)/u,
    category: "truck",
    needsReview: true,
  },
  { brand: "BAW", model: /^6521MAB2$/u, category: "bus", needsReview: true },
  { brand: "LABO", model: /./u, category: "truck" },
  { brand: "FORLAND", model: /./u, category: "truck" },
  { brand: "FOTON", model: /./u, category: "truck" },
  { brand: "CHEVROLET", model: /^(?:LABO|DAMAS VAN)$/u, category: "truck" },
  {
    brand: "DONGFENG",
    model: /^(?:CAPTAIN|DFSK|Z55N|Z80N)/u,
    category: "truck",
    needsReview: true,
  },
  { brand: "FAW", model: /^(?:CA\s?1027|CA5027|T80)/u, category: "truck" },
  {
    brand: "CHANGAN",
    model: /^(?:HUNTER|KAICENE F70|LANTOP|EXPLORER|EM80)/u,
    category: "truck",
    needsReview: true,
  },
  {
    brand: "CHANGAN",
    model: /^(?:CHANA|CM8|CROSS STAR|KAICENE RUIXING|KAICHENG)/u,
    category: "passenger",
    needsReview: true,
  },
  { brand: "GEELY", model: /^FARIZON FX$/u, category: "truck" },
  { brand: "GREAT WALL", model: /^(?:DEER|KINGKONG POER|POER|SAILOR|WINGLE)/u, category: "truck" },
  {
    brand: "HYUNDAI",
    model: /^(?:PORTER|H[ -]?100|H[ -]?350|SANTA CRUZ)$/u,
    category: "truck",
    needsReview: true,
  },
  { brand: "HYUNDAI", model: /^GRACE$/u, category: "bus", needsReview: true },
  {
    brand: "HYUNDAI",
    model: /^(?:H[ -]?1|STAREX|STARIA)$/u,
    category: "passenger",
    needsReview: true,
  },
  {
    brand: "JAC",
    model: /^(?:N(?:35|56|90|120)|T[689](?: PRO)?|HFC 1027 PICKUP)$/u,
    category: "truck",
  },
  { brand: "JAC", model: /^SUNRAY$/u, category: "bus", needsReview: true },
  { brand: "JAC", model: /^M[1345]/u, category: "passenger", needsReview: true },
  { brand: "KIA", model: /^(?:BONGO|K[ -]?(?:2500|4000))/u, category: "truck" },
  { brand: "KIA", model: /^(?:BESTA|PREGIO|TOPIC)$/u, category: "bus", needsReview: true },
  { brand: "MERCEDES-BENZ", model: /^SPRINTER$/u, category: "truck", needsReview: true },
  { brand: "MERCEDES-BENZ", model: /^350$/u, category: "passenger", needsReview: true },
  { brand: "MITSUBISHI", model: /^L[ -]?200/u, category: "truck" },
  { brand: "RENAULT", model: /^(?:DOKKER VAN|MASTER)/u, category: "truck", needsReview: true },
  { brand: "TOYOTA", model: /^(?:HILUX|PICK-UP)$/u, category: "truck" },
  { brand: "TOYOTA", model: /^HIACE(?: REGIUS)?$/u, category: "bus", needsReview: true },
  { brand: "TOYOTA", model: /^LITE ACE$/u, category: "truck", needsReview: true },
  { brand: "VOLKSWAGEN", model: /^AMAROK$/u, category: "truck" },
  {
    brand: "VOLKSWAGEN",
    model: /^(?:CRAFTER|TRANSPORTER)$/u,
    category: "truck",
    needsReview: true,
  },
  {
    brand: "VOLKSWAGEN",
    model: /^(?:CADDY|CARAVELLE|TCG)$/u,
    category: "passenger",
    needsReview: true,
  },
  { brand: "FORD", model: /^TOURNEO$/u, category: "passenger", needsReview: true },
  { brand: "SAMAT", model: /./u, category: "passenger", needsReview: true },
  { brand: "LAND ROVER", model: /^NX 300$/u, category: "passenger", needsReview: true },
  { brand: "ZEEKR", model: /^LI L[79]/u, category: "passenger", needsReview: true },
];

const knownBrands = new Set(
  "ACURA|AITO|AUDI|AVATR|BAIC|BAW|BENTLEY|BMW|BYD|CADILLAC|CHANGAN|CHERY|CHEVROLET|DAEWOO|DEEPAL|DONGFENG|EXEED|FAW|FAW BESTUNE|FORD|FOTON|FORLAND|GAC|GAZELLE|GEELY|GENESIS|GREAT WALL|HAVAL|HONDA|HONGQI|HYUNDAI|IM|INFINITI|JAC|JAECOO|JAGUAR|JETOUR|JETTA|KAIYI|KIA|LABO|LADA|LAND ROVER|LEXUS|LIFAN|LI|MAZDA|MERCEDES-BENZ|MG|MINI|MITSUBISHI|NISSAN|OMODA|PEUGEOT|PORSCHE|RANGE|RAVON|RENAULT|ROX|SKODA|SSANGYONG|SUBARU|SUZUKI|SAMAT|TANK|TESLA|TOYOTA|UAZ|VOLKSWAGEN|VOYAH|ZEEKR|ГАЗ".split(
    "|",
  ),
);
const normalize = (value: string) =>
  value.normalize("NFKC").trim().toUpperCase().replace(/\s+/gu, " ");

export function isVehicleCategory(value: unknown): value is VehicleCategory {
  return typeof value === "string" && Object.hasOwn(VEHICLE_CATEGORIES, value);
}

export function classifyVehicle(vehicle: { brand: string; name: string }): VehicleClassification {
  const brand = normalize(vehicle.brand);
  const raw = normalize(vehicle.name);
  const model = (raw.startsWith(`${brand} `) ? raw.slice(brand.length + 1) : raw).replace(
    /^А(?=\d)/u,
    "A",
  );
  if (
    /TRAILER|ПРИЦЕП|ЭКСКАВАТОР|ПОГРУЗЧИК|EXCAVATOR|FORKLIFT|БУЛЬДОЗЕР|АВТОКРАН|ТРАКТОР/u.test(model)
  )
    return {
      category: "trailer_special",
      needsReview: false,
      basis: "Тип техники указан в названии",
    };
  if (/\b(?:BUS|MINIBUS|COACH)\b|АВТОБУС/u.test(model))
    return { category: "bus", needsReview: false, basis: "Автобус указан в названии" };
  const rule = rules.find((rule) => rule.brand === brand && rule.model.test(model));
  if (rule)
    return {
      category: rule.category,
      needsReview: rule.needsReview ?? false,
      basis: rule.needsReview
        ? "Есть разные типы кузова или неполное название: категория для демо, уточняется по документам"
        : "Категория модельного семейства",
    };
  if (/\b(?:TRUCK|PICK[ -]?UP|CARGO|VAN)\b|ГРУЗОВ|ФУРГОН/u.test(model))
    return {
      category: "truck",
      needsReview: true,
      basis: "Грузовая версия по названию; требуется уточнить исполнение",
    };
  return {
    category: "passenger",
    needsReview: !knownBrands.has(brand) || !model,
    basis:
      knownBrands.has(brand) && model
        ? "Легковая модель, кроссовер, внедорожник или пассажирский минивэн из демо-каталога"
        : "Новая или неполная запись: предварительная категория для демо",
  };
}
