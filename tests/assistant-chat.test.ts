import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { respond } from "../src/lib/assistant-engine.ts";
import { ToolSession } from "../src/lib/assistant-tools.ts";
import { ApplicationStore } from "../src/lib/applications.ts";
import { getCatalog, getTerms } from "../src/lib/colvir.ts";
import { extractDraftFields } from "../src/lib/draft-extract.ts";
import {
  applyPatch,
  initialDraft,
  missingFields,
  parseDraftState,
  setFields,
  validateField,
} from "../src/lib/draft.ts";

// Modules read the environment at call time: fixed tariffs, no real model calls.
process.env.COLVIR_MODE = "snapshot";
delete process.env.OPENAI_API_KEY;

const deps = { getCatalog, getTerms };
type Complete = NonNullable<Parameters<typeof respond>[0]["complete"]>;

/** Scripted model: returns queued tool calls, then a text reply. */
function scriptedModel(steps: Array<{ tool: string; args: object } | { text: string }>): Complete {
  let index = 0;
  return async () => {
    const step = steps[index++] ?? { text: "Готово." };
    const message =
      "tool" in step
        ? {
            role: "assistant" as const,
            content: null,
            refusal: null,
            tool_calls: [
              {
                id: `call_${index}`,
                type: "function" as const,
                function: { name: step.tool, arguments: JSON.stringify(step.args) },
              },
            ],
          }
        : { role: "assistant" as const, content: step.text, refusal: null };
    return {
      id: "x",
      object: "chat.completion",
      created: 0,
      model: "test",
      choices: [{ index: 0, finish_reason: "stop", logprobs: null, message }],
    } as Awaited<ReturnType<Complete>>;
  };
}

const updateArgs = (overrides: object) => ({
  subject: null,
  client_type: null,
  price_kzt: null,
  currency: null,
  advance_percent: null,
  advance_amount_kzt: null,
  months: null,
  vehicle_model_id: null,
  contact_name: null,
  contact_phone: null,
  ...overrides,
});

test("extracts several parameters from one message without guessing", () => {
  assert.deepEqual(
    extractDraftFields("Хочу автомобиль за 20 млн тенге, аванс 20%, на 3 года").fields,
    {
      subject: "car",
      price: 20_000_000,
      advancePercent: 20,
      months: 36,
    },
  );
  assert.deepEqual(extractDraftFields("тогда аванс 30%").fields, { advancePercent: 30 });
  const foreign = extractDraftFields("авто за 50 тысяч долларов");
  assert.equal(foreign.fields.price, undefined);
  assert.match(foreign.questions[0], /тенге/);
  const unclear = extractDraftFields("платеж 350");
  assert.deepEqual(unclear.fields, {});
  assert.match(unclear.questions[0], /единицы/);
});

test("model tool calls fill the draft; the reply text itself changes nothing", async () => {
  const result = await respond({
    history: [],
    message: "Хочу автомобиль за 20 млн тенге, аванс 20%, на 4 года",
    draft: initialDraft(),
    deps,
    complete: scriptedModel([
      { tool: "get_draft", args: {} },
      {
        tool: "update_draft",
        args: updateArgs({
          subject: "car",
          price_kzt: 20_000_000,
          currency: "KZT",
          advance_percent: 20,
          months: 48,
        }),
      },
      { tool: "calculate", args: {} },
      { text: "Записал. Стоимость ставлю 999 999 999 ₸." },
    ]),
  });
  assert.equal(result.mode, "llm");
  assert.deepEqual(result.patch, {
    subject: "car",
    price: 20_000_000,
    advancePercent: 20,
    months: 48,
  });
  // Text claiming another value does not become data.
  assert.equal(Object.values(result.patch).includes(999_999_999), false);
  const quote = result.cards.find((card) => card.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.quote.months, 48);
  assert.ok(quote.quote.monthlyPayment > 0);
});

test("server rejects unavailable, foreign-currency and out-of-range values", async () => {
  const session = new ToolSession(setFields(initialDraft(), { modelId: 2875 }, "form"), deps);
  const result = await session.updateDraft(
    updateArgs({ months: 36, advance_percent: 45, currency: "OTHER", price_kzt: 5 }),
  );
  assert.deepEqual(session.patch, {});
  assert.ok(result.errors.some((e) => /36 мес\. недоступен/.test(e)));
  assert.ok(result.errors.some((e) => /45%.*недоступен/.test(e)));
  assert.ok(result.errors.some((e) => /тенге/.test(e)));
  assert.equal(validateField("price", -1).ok, false);
  assert.equal(validateField("contactPhone", "123").ok, false);
  assert.equal(validateField("contactPhone", "+7 (12)").ok, false);
  assert.equal(validateField("contactPhone", "8 701 123 45 67").ok, true);
  assert.equal(validateField("contactName", "Айгуль").ok, false);
  assert.equal(validateField("contactName", "Айгуль Серикова").ok, true);
});

test("advance given as an amount converts only to an available percent", async () => {
  const draft = setFields(initialDraft(), { modelId: 2875, price: 15_000_000 }, "form");
  const ok = new ToolSession(draft, deps);
  await ok.updateDraft(updateArgs({ advance_amount_kzt: 3_000_000 }));
  assert.equal(ok.patch.advancePercent, 20);
  const bad = new ToolSession(draft, deps);
  const result = await bad.updateDraft(updateArgs({ advance_amount_kzt: 2_000_000 }));
  assert.equal(bad.patch.advancePercent, undefined);
  assert.match(result.errors[0], /13,33%/);
});

test("changing one parameter keeps the others", async () => {
  let draft = initialDraft();
  const first = await respond({
    history: [],
    message: "Хочу автомобиль за 20 млн тенге, аванс 20%, на 4 года",
    draft,
    deps,
  });
  draft = applyPatch(draft, first.patch, first.baseRevs).state;
  const second = await respond({ history: [], message: "тогда аванс 30%", draft, deps });
  assert.deepEqual(second.patch, { advancePercent: 30 });
  draft = applyPatch(draft, second.patch, second.baseRevs).state;
  assert.equal(draft.values.price, 20_000_000);
  assert.equal(draft.values.months, 48);
  assert.equal(draft.values.advancePercent, 30);
});

test("the assistant changes the car when the client names another one", async () => {
  const cobalt = await respond({
    history: [],
    message: "поменяй машину на Chevrolet Cobalt",
    draft: initialDraft(),
    deps,
  });
  assert.equal(cobalt.patch.modelId, 2637);
  const tucson = await respond({
    history: [],
    message: "давай хендай туксон",
    draft: setFields(initialDraft(), { modelId: 2637 }, "form"),
    deps,
  });
  // Two catalog records (different partners): ask, do not pick.
  assert.equal(tucson.patch.modelId, undefined);
  const card = tucson.cards.find((c) => c.type === "vehicles");
  assert.ok(card && card.type === "vehicles" && card.options.length === 2);
});

test("a late assistant answer does not overwrite a newer manual edit", () => {
  const sent = initialDraft();
  // The user edits the price in the form while the request is in flight.
  const edited = setFields(sent, { price: 18_000_000 }, "form");
  const { state, applied, skipped } = applyPatch(
    edited,
    { price: 20_000_000, months: 60 },
    sent.revs,
  );
  assert.equal(state.values.price, 18_000_000);
  assert.equal(state.values.months, 60);
  assert.deepEqual(applied, ["months"]);
  assert.deepEqual(skipped, ["price"]);
});

test("unknown conditions are not invented", async () => {
  for (const question of ["Какие документы нужны?", "Какие условия выкупа?", "Есть ли комиссия?"]) {
    const result = await respond({ history: [], message: question, draft: initialDraft(), deps });
    assert.match(result.reply, /нет|не входят/);
    assert.match(result.reply, /менеджер/);
    assert.deepEqual(result.patch, {});
  }
});

test("model failure falls back without losing the draft or leaking partial changes", async () => {
  const draft = setFields(initialDraft(), { price: 17_000_000 }, "form");
  const result = await respond({
    history: [],
    message: "Какие условия?",
    draft,
    deps,
    complete: async () => {
      throw new Error("network");
    },
  });
  assert.equal(result.mode, "fallback");
  assert.match(result.notice ?? "", /недоступна/);
  assert.deepEqual(result.patch, {});
  assert.match(result.reply, /сроки 37, 48, 60/);
});

test("example values are not treated as client data", () => {
  const missing = missingFields(initialDraft());
  for (const field of ["price", "modelId", "months", "advancePercent", "contactPhone"] as const)
    assert.ok(missing.includes(field));
});

test("browser draft is validated before use", () => {
  assert.equal(parseDraftState({ values: {}, sources: {}, revs: {} }), null);
  const tampered = structuredClone(initialDraft()) as unknown as {
    values: Record<string, unknown>;
  };
  tampered.values.price = "15000000; drop";
  assert.equal(parseDraftState(tampered), null);
  assert.ok(parseDraftState(JSON.parse(JSON.stringify(initialDraft()))));
});

test("repeated submission and concurrent double click create one application", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "apps-"));
  const store = new ApplicationStore(path.join(dir, "applications.json"));
  const values = {
    ...initialDraft().values,
    contactName: "Айгуль Серикова",
    contactPhone: "+77011234567",
  };
  const quote = { modelLabel: "Hyundai Tucson" } as never;
  const contact = { email: "a@example.kz", iin: "012345678901" };
  const sessionA = "11111111-1111-4111-8111-111111111111";
  const key = "22222222-2222-4222-8222-222222222222";
  const [first, second] = await Promise.all([
    store.submit({ sessionId: sessionA, idempotencyKey: key, values, contact, quote }),
    store.submit({ sessionId: sessionA, idempotencyKey: key, values, contact, quote }),
  ]);
  assert.equal(first.application.id, second.application.id);
  assert.equal(second.duplicate, true);
  // Same content with a new key in the same session: still no duplicate.
  const again = await store.submit({
    sessionId: sessionA,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    values,
    contact,
    quote,
  });
  assert.equal(again.application.id, first.application.id);
  // Another session with identical content is a different client: separate record.
  const other = await store.submit({
    sessionId: "44444444-4444-4444-8444-444444444444",
    idempotencyKey: key,
    values,
    contact,
    quote,
  });
  assert.notEqual(other.application.id, first.application.id);
  const saved = JSON.parse(await readFile(path.join(dir, "applications.json"), "utf8"));
  assert.equal(saved.length, 2);
  // Raw session ids are not stored.
  assert.equal(JSON.stringify(saved).includes(sessionA), false);
});

test("ordinary Russian words are not mistaken for car names", async () => {
  const catalog = await getCatalog();
  const { findVehiclesInText } = await import("../src/lib/vehicle.ts");
  for (const text of [
    "Какие документы нужны и есть ли комиссия?",
    "Хочу автомобиль за 20 млн тенге, аванс 20%, на 3 года",
    "тогда аванс 30%",
  ])
    assert.deepEqual(findVehiclesInText(catalog.models, text), [], text);
  assert.equal(findVehiclesInText(catalog.models, "поменяй на Chevrolet Cobalt").length, 1);
});

test("an unavailable term from the chat is refused with the available options", async () => {
  const result = await respond({
    history: [],
    message: "а лучше на 3 года",
    draft: initialDraft(),
    deps,
  });
  assert.equal(result.patch.months, undefined);
  assert.match(result.reply, /36 мес\. недоступен.*37, 48, 60/);
});

test("colloquial amounts and answers to clarifying questions are understood", async () => {
  assert.equal(extractDraftFields("кобальт за 8 лямов").fields.price, 8_000_000);
  assert.equal(extractDraftFields("машина за 15кк").fields.price, 15_000_000);
  assert.equal(extractDraftFields("аванс 500к тенге").fields.advanceAmount, 500_000);
  // «за ляям 200» is ambiguous: nothing is guessed, the number is asked about.
  const unclear = extractDraftFields("Хочу купить кобальт за ляям 200");
  assert.equal(unclear.fields.price, undefined);

  let draft = initialDraft();
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const message of ["Хочу купить кобальт за ляям 200", "200к тенге"]) {
    const result = await respond({ history, message, draft, deps });
    draft = applyPatch(draft, result.patch, result.baseRevs).state;
    history.push({ role: "user", content: message }, { role: "assistant", content: result.reply });
  }
  assert.equal(draft.values.modelId, 2637); // Chevrolet Cobalt from the first message
  assert.equal(draft.values.price, 200_000); // the answer fills the field that was asked about
});
