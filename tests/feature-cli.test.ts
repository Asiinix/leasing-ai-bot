import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseEnv } from "node:util";
import {
  FEATURE_KEYS,
  applyFeatureProfile,
  featureStatus,
  runFeatureCommand,
  updateFeatureEnv,
} from "../scripts/features.mjs";

const catalogKey = FEATURE_KEYS["fixed-price-catalog"];
const chatKey = FEATURE_KEYS["chat-vehicle-cards"];
const script = fileURLToPath(new URL("../scripts/features.mjs", import.meta.url));

test("preserves unrelated secrets, comments, exports, CRLF and multiline flag-like text", () => {
  const untouched = [
    "# Header",
    'SECRET="private-value # quoted"',
    'CERTIFICATE="first line',
    `${catalogKey}=inside-a-multiline-value`,
    'last line"',
    "API_URL=https://example.test/?a=1",
  ].join("\r\n");
  const before = `${untouched}\r\n export ${catalogKey} = 'false' # catalog note\r\n${chatKey}=false\r\n`;
  const after = updateFeatureEnv(before, "enable", "chat-vehicle-cards");
  assert.equal(
    after,
    `${untouched}\r\n export ${catalogKey} = true # catalog note\r\n${chatKey}=true\r\n`,
  );
  assert.equal(parseEnv(after).SECRET, parseEnv(before).SECRET);
  assert.equal(parseEnv(after).CERTIFICATE, parseEnv(before).CERTIFICATE);
  assert.equal(featureStatus(after)["chat-vehicle-cards"], true);
});

test("chat enables its catalog dependency and disabling catalog disables both", () => {
  const both = updateFeatureEnv("COLVIR_MODE=live\n", "enable", "chat-vehicle-cards");
  assert.deepEqual(featureStatus(both), {
    "fixed-price-catalog": true,
    "chat-vehicle-cards": true,
    chatMissingCatalog: false,
  });
  const catalogOnly = updateFeatureEnv(both, "disable", "chat-vehicle-cards");
  assert.equal(featureStatus(catalogOnly)["fixed-price-catalog"], true);
  assert.equal(featureStatus(catalogOnly)["chat-vehicle-cards"], false);
  const off = updateFeatureEnv(both, "disable", "fixed-price-catalog");
  assert.equal(parseEnv(off)[catalogKey], "false");
  assert.equal(parseEnv(off)[chatKey], "false");
  assert.equal(parseEnv(off).COLVIR_MODE, "live");
});

test("catalog alone does not enable chat; an invalid manual dependency is reported inactive", () => {
  const catalogOnly = updateFeatureEnv("", "enable", "fixed-price-catalog");
  assert.equal(featureStatus(catalogOnly)["fixed-price-catalog"], true);
  assert.equal(featureStatus(catalogOnly)["chat-vehicle-cards"], false);
  assert.deepEqual(featureStatus(`${chatKey}=true\n`), {
    "fixed-price-catalog": false,
    "chat-vehicle-cards": false,
    chatMissingCatalog: true,
  });
});

test("exact profiles converge from every previous flag combination without carrying chat into catalog", () => {
  for (const catalog of [undefined, "false", "true"]) {
    for (const chat of [undefined, "false", "true"]) {
      const previous = [
        "COLVIR_MODE=snapshot",
        ...(catalog ? [`${catalogKey}=${catalog}`] : []),
        ...(chat ? [`${chatKey}=${chat}`] : []),
      ].join("\n");
      for (const [profile, expectedCatalog, expectedChat] of [
        ["none", false, false],
        ["fixed-price-catalog", true, false],
        ["chat-vehicle-cards", true, true],
      ] as const) {
        const next = applyFeatureProfile(previous, profile);
        assert.deepEqual(featureStatus(next), {
          "fixed-price-catalog": expectedCatalog,
          "chat-vehicle-cards": expectedChat,
          chatMissingCatalog: false,
        });
        assert.equal(parseEnv(next).COLVIR_MODE, "snapshot");
        assert.equal(applyFeatureProfile(next, profile), next);
      }
    }
  }
  const both = applyFeatureProfile("", "chat-vehicle-cards");
  assert.equal(
    featureStatus(updateFeatureEnv(both, "enable", "fixed-price-catalog"))["chat-vehicle-cards"],
    true,
  );
});

test("profile CLI preserves multiline settings and duplicate formatting, and repeated use skips writes", () => {
  const directory = mkdtempSync(join(tmpdir(), "leasing-feature-profile-"));
  try {
    const envFile = join(directory, ".env.local");
    const unrelated = `# Keep settings\r\nCERT="line one\r\n${chatKey}=secret-inside-value\r\nlast line"\r\n`;
    writeFileSync(envFile, `${unrelated}${chatKey}=true # first\r\n${chatKey}='true' # second\r\n`);
    const output = execFileSync(process.execPath, [script, "use", "fixed-price-catalog"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(output.includes("Профиль: fixed-price-catalog"));
    assert.ok(!output.includes("secret-inside-value"));
    const applied = readFileSync(envFile, "utf8");
    assert.equal(
      applied,
      `${unrelated}${chatKey}=false # first\r\n${chatKey}=false # second\r\n${catalogKey}=true\r\n`,
    );
    utimesSync(envFile, 1_000, 1_000);
    assert.equal(runFeatureCommand(["use", "fixed-price-catalog"], directory).code, 0);
    assert.equal(statSync(envFile).mtimeMs, 1_000_000);
    assert.equal(runFeatureCommand(["use", "chat-vehicle-cards"], directory).code, 0);
    assert.equal(featureStatus(readFileSync(envFile, "utf8"))["chat-vehicle-cards"], true);
    assert.equal(runFeatureCommand(["use", "none"], directory).code, 0);
    assert.equal(featureStatus(readFileSync(envFile, "utf8"))["fixed-price-catalog"], false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("updates every duplicate flag, retains inline comments and is idempotent", () => {
  const before = `# keep\n${catalogKey}=false # earlier\nOTHER=keep\nexport ${catalogKey}="true" # later`;
  const after = updateFeatureEnv(before, "disable", "fixed-price-catalog");
  assert.ok(after.includes(`${catalogKey}=false # earlier`));
  assert.ok(after.includes(`export ${catalogKey}=false # later`));
  assert.ok(after.includes("OTHER=keep\n"));
  assert.equal(updateFeatureEnv(after, "disable", "fixed-price-catalog"), after);
  const on = updateFeatureEnv(after, "enable", "chat-vehicle-cards");
  assert.equal(updateFeatureEnv(on, "enable", "chat-vehicle-cards"), on);
});

test("rewrites retain a missing final newline; appended flags get a proper separator", () => {
  assert.equal(
    updateFeatureEnv(`${catalogKey}=false`, "enable", "fixed-price-catalog"),
    `${catalogKey}=true`,
  );
  assert.equal(
    updateFeatureEnv("OTHER=untouched", "enable", "fixed-price-catalog"),
    `OTHER=untouched\n${catalogKey}=true\n`,
  );
});

test("CLI list is read-only, writes only .env.local, does not disclose values, and skips unchanged writes", () => {
  const directory = mkdtempSync(join(tmpdir(), "leasing-feature-cli-"));
  try {
    const envFile = join(directory, ".env.local");
    const list = runFeatureCommand(["list"], directory);
    assert.equal(list.code, 0);
    assert.throws(() => statSync(envFile), { code: "ENOENT" });
    writeFileSync(envFile, "SECRET=private-marker-for-fixture\nCOLVIR_MODE=snapshot\n", {
      mode: 0o600,
    });
    const output = execFileSync(process.execPath, [script, "enable", "chat-vehicle-cards"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(output.includes("chat-vehicle-cards: включена"));
    assert.ok(!output.includes("private-marker-for-fixture"));
    assert.ok(!output.includes("SECRET"));
    const file = readFileSync(envFile, "utf8");
    assert.equal(parseEnv(file).SECRET, "private-marker-for-fixture");
    assert.equal(parseEnv(file).COLVIR_MODE, "snapshot");
    assert.equal(statSync(envFile).mode & 0o777, 0o600);
    utimesSync(envFile, 1_000, 1_000);
    const repeated = runFeatureCommand(["enable", "chat-vehicle-cards"], directory);
    assert.equal(repeated.code, 0);
    assert.ok(repeated.output.includes("Настройки уже применены"));
    assert.equal(statSync(envFile).mtimeMs, 1_000_000);
    assert.equal(readFileSync(envFile, "utf8"), file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("invalid CLI commands return nonzero without mutation or reflecting arbitrary input", () => {
  const directory = mkdtempSync(join(tmpdir(), "leasing-feature-invalid-"));
  try {
    const envFile = join(directory, ".env.local");
    const before = "UNRELATED=keep-me\n";
    writeFileSync(envFile, before);
    for (const args of [
      ["enable", "private-marker"],
      ["remove", "fixed-price-catalog"],
      ["disable"],
      ["list", "extra"],
      ["use"],
      ["use", "private-marker"],
      ["enable", "none"],
      ["use", "fixed-price-catalog", "extra"],
    ]) {
      const result = spawnSync(process.execPath, [script, ...args], {
        cwd: directory,
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.ok(!result.stderr.includes("private-marker"));
      assert.equal(readFileSync(envFile, "utf8"), before);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an unterminated quoted value is left intact and cannot swallow newly appended flags", () => {
  const directory = mkdtempSync(join(tmpdir(), "leasing-feature-malformed-"));
  try {
    const envFile = join(directory, ".env.local");
    const before = 'SECRET="private-marker\n';
    writeFileSync(envFile, before);
    for (const action of ["enable", "use"]) {
      const result = runFeatureCommand([action, "chat-vehicle-cards"], directory);
      assert.equal(result.code, 1);
      assert.ok(!result.output.includes("private-marker"));
      assert.equal(readFileSync(envFile, "utf8"), before);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
