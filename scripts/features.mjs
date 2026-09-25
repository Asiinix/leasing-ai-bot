import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export const FEATURE_KEYS = Object.freeze({
  "fixed-price-catalog": "NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG",
  "chat-vehicle-cards": "NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS",
});

/** Exact profiles replace both feature flags, regardless of a previous demo. */
export const FEATURE_PROFILES = Object.freeze({
  none: Object.freeze({ "fixed-price-catalog": false, "chat-vehicle-cards": false }),
  "fixed-price-catalog": Object.freeze({
    "fixed-price-catalog": true,
    "chat-vehicle-cards": false,
  }),
  "chat-vehicle-cards": Object.freeze({
    "fixed-price-catalog": true,
    "chat-vehicle-cards": true,
  }),
});

const usage = [
  "npm run feature -- list",
  "npm run feature -- use fixed-price-catalog",
  "npm run feature -- use chat-vehicle-cards",
  "npm run feature -- use none",
  "npm run feature -- enable fixed-price-catalog",
  "npm run feature -- enable chat-vehicle-cards",
  "npm run feature -- disable fixed-price-catalog",
  "npm run feature -- disable chat-vehicle-cards",
].join("\n");

/**
 * Find value spans without reserializing unrelated settings. Quoted multiline
 * values are consumed together, so flag-like text inside a secret is untouched.
 * @param {string} text
 */
function assignments(text) {
  const values = [];
  let cursor = 0;
  while (cursor < text.length) {
    const endMatch = /\r\n|\n|\r/g;
    endMatch.lastIndex = cursor;
    const newline = endMatch.exec(text);
    const lineEnd = newline?.index ?? text.length;
    const line = text.slice(cursor, lineEnd);
    const match = /^([\uFEFF\t ]*(?:export[\t ]+)?)([A-Za-z_][A-Za-z0-9_]*)([\t ]*=[\t ]*)/.exec(
      line,
    );
    if (!match) {
      cursor = lineEnd + (newline?.[0].length ?? 0);
      continue;
    }
    const start = cursor + match[0].length;
    let end = lineEnd;
    const quote = text[start];
    if (quote === '"' || quote === "'" || quote === "`") {
      end = start + 1;
      let closed = false;
      while (end < text.length) {
        if (text[end] === "\\" && text[end + 1] === quote) {
          end += 2;
          continue;
        }
        if (text[end++] === quote) {
          closed = true;
          break;
        }
      }
      if (!closed) throw new Error("Unterminated quoted environment value");
      // Do not interpret anything in the remainder of this value as a new key.
      endMatch.lastIndex = end;
      const afterValue = endMatch.exec(text);
      cursor = afterValue ? afterValue.index + afterValue[0].length : text.length;
    } else {
      const comment = text.indexOf("#", start);
      if (comment >= start && comment < end) end = comment;
      while (end > start && /[\t ]/.test(text[end - 1])) end--;
      cursor = lineEnd + (newline?.[0].length ?? 0);
    }
    values.push({ key: match[2], start, end });
  }
  return values;
}

/** @param {string} text */
export function featureStatus(text) {
  const env = parseEnv(text);
  const catalog = env[FEATURE_KEYS["fixed-price-catalog"]] === "true";
  const requestedChat = env[FEATURE_KEYS["chat-vehicle-cards"]] === "true";
  return {
    "fixed-price-catalog": catalog,
    "chat-vehicle-cards": catalog && requestedChat,
    chatMissingCatalog: requestedChat && !catalog,
  };
}

/**
 * @param {string} text
 * @param {"enable" | "disable"} action
 * @param {keyof typeof FEATURE_KEYS} feature
 */
export function updateFeatureEnv(text, action, feature) {
  const enabled = action === "enable";
  const changes = new Map([[FEATURE_KEYS[feature], String(enabled)]]);
  if (enabled && feature === "chat-vehicle-cards") {
    changes.set(FEATURE_KEYS["fixed-price-catalog"], "true");
  }
  if (!enabled && feature === "fixed-price-catalog") {
    changes.set(FEATURE_KEYS["chat-vehicle-cards"], "false");
  }
  return replaceFeatureValues(text, changes);
}

/**
 * @param {string} text
 * @param {keyof typeof FEATURE_PROFILES} profile
 */
export function applyFeatureProfile(text, profile) {
  const changes = new Map(
    Object.entries(FEATURE_PROFILES[profile]).map(([feature, enabled]) => [
      FEATURE_KEYS[feature],
      String(enabled),
    ]),
  );
  return replaceFeatureValues(text, changes);
}

/** @param {string} text @param {Map<string, string>} changes */
function replaceFeatureValues(text, changes) {
  const found = new Set();
  const replacements = assignments(text).filter(({ key }) => changes.has(key));
  let result = text;
  // Update every duplicate assignment; preserve comments, order and all other bytes.
  for (const entry of replacements.reverse()) {
    found.add(entry.key);
    result = result.slice(0, entry.start) + changes.get(entry.key) + result.slice(entry.end);
  }
  const newline = text.match(/\r\n|\n|\r/)?.[0] ?? "\n";
  for (const [key, value] of changes) {
    if (found.has(key)) continue;
    if (result && !/[\r\n]$/.test(result)) result += newline;
    result += `${key}=${value}${newline}`;
  }
  return result;
}

/** @param {string} text */
function statusLines(text) {
  const status = featureStatus(text);
  return [
    "Локальные фичи (.env.local):",
    ...Object.keys(FEATURE_KEYS).map(
      (name) => `${name}: ${status[name] ? "включена" : "выключена"}`,
    ),
    ...(status.chatMissingCatalog
      ? ["Карточки заблокированы: сначала включите fixed-price-catalog."]
      : []),
    "Это настройки .env.local, не состояние уже запущенного приложения.",
  ];
}

/**
 * @param {string[]} args
 * @param {string} directory
 */
export function runFeatureCommand(args, directory = process.cwd()) {
  const [action = "list", feature] = args;
  if (
    (action === "list" && args.length > 1) ||
    (action !== "list" &&
      (args.length !== 2 ||
        !["enable", "disable", "use"].includes(action) ||
        !Object.hasOwn(action === "use" ? FEATURE_PROFILES : FEATURE_KEYS, feature)))
  ) {
    return { code: 1, output: `Использование:\n${usage}` };
  }
  const path = resolve(directory, ".env.local");
  try {
    const previous = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (action === "list") return { code: 0, output: statusLines(previous).join("\n") };
    const next =
      action === "use"
        ? applyFeatureProfile(previous, feature)
        : updateFeatureEnv(previous, action, feature);
    if (next !== previous) writeFileSync(path, next, { encoding: "utf8", mode: 0o600 });
    return {
      code: 0,
      output: [
        next === previous ? "Настройки уже применены." : "Обновлена .env.local.",
        ...(action === "use" ? [`Профиль: ${feature}. Установлены оба флага.`] : []),
        ...statusLines(next),
        "Перезапустите npm run dev. Для production пересоберите npm run build.",
      ].join("\n"),
    };
  } catch {
    // Neither dotenv content nor arbitrary exception text may reach the console.
    return { code: 1, output: "Не удалось прочитать или обновить .env.local. Проверьте доступ." };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runFeatureCommand(process.argv.slice(2));
  (result.code ? console.error : console.log)(result.output);
  process.exitCode = result.code;
}
