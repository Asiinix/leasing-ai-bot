export type BusinessPeriod = "year" | "quarter" | "month";

/** Reporting amounts default to a year; this must never change lease term parsing. */
export function businessPeriods(text: string): BusinessPeriod[] | null {
  const clauses = text
    .split(/[,;!?\n]|\.(?!\d)/u)
    .filter((clause) =>
      /(?<!\p{L})(?:налог[а-я]*|кпн|ипн|ндс|выручк[а-я]*|прибыл[а-я]*|оборот[а-я]*|доход[а-я]*|расход[а-я]*)(?!\p{L})/u.test(
        clause,
      ),
    );
  if (!clauses.length) return null;
  const periods = clauses.flatMap((clause): BusinessPeriod[] => {
    const explicit: BusinessPeriod[] = [];
    if (
      /ежегодн|годов|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один)\s+)?год|за\s+\d{4}(?!\d)/u.test(
        clause,
      )
    )
      explicit.push("year");
    if (
      /ежеквартальн|квартальн|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один|\d+)\s+)?квартал/u.test(
        clause,
      )
    )
      explicit.push("quarter");
    if (/ежемесячн|месячн|(?:за|в)\s+(?:(?:прошлый|текущий|этот|один)\s+)?месяц/u.test(clause))
      explicit.push("month");
    return explicit.length ? explicit : ["year"];
  });
  return [...new Set(periods)];
}
