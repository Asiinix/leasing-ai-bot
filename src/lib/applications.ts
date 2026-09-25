/**
 * Application store for this service. Applications are saved here with a request number;
 * they are NOT transmitted to BCC systems (no confirmed BCC application API exists).
 * Idempotent per session: the same idempotency key or the same content returns the
 * existing application instead of creating a duplicate.
 */
import { createHash, randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { applicationFingerprint, type LeaseDraft } from "./draft";
import type { QuoteView } from "./assistant-contract";

export interface StoredApplication {
  id: string;
  createdAt: string;
  /** Hash of the browser session id: isolates clients without storing the raw id. */
  session: string;
  idempotencyKey: string;
  fingerprint: string;
  values: LeaseDraft;
  quote: QuoteView;
  status: "saved";
}

const hashSession = (sessionId: string) =>
  createHash("sha256").update(sessionId).digest("hex").slice(0, 32);

export class ApplicationStore {
  private loaded: Promise<StoredApplication[]> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string | null) {}

  private async load(): Promise<StoredApplication[]> {
    this.loaded ??= (async () => {
      if (!this.file) return [];
      try {
        return JSON.parse(await readFile(this.file, "utf8")) as StoredApplication[];
      } catch {
        return [];
      }
    })();
    return this.loaded;
  }

  private async persist(items: StoredApplication[]) {
    if (!this.file) return;
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(items, null, 2), { mode: 0o600 });
    await rename(tmp, this.file);
  }

  /** Serialized so two concurrent submits of the same draft cannot both create a record. */
  submit(input: {
    sessionId: string;
    idempotencyKey: string;
    values: LeaseDraft;
    quote: QuoteView;
  }): Promise<{ application: StoredApplication; duplicate: boolean }> {
    const run = this.queue.then(async () => {
      const items = await this.load();
      const session = hashSession(input.sessionId);
      const fingerprint = applicationFingerprint(input.values);
      const existing = items.find(
        (item) =>
          item.session === session &&
          (item.idempotencyKey === input.idempotencyKey || item.fingerprint === fingerprint),
      );
      if (existing) return { application: existing, duplicate: true };
      let id: string;
      do id = `BL-${randomInt(100_000, 999_999)}`;
      while (items.some((item) => item.id === id));
      const application: StoredApplication = {
        id,
        createdAt: new Date().toISOString(),
        session,
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        values: input.values,
        quote: input.quote,
        status: "saved",
      };
      items.push(application);
      await this.persist(items);
      return { application, duplicate: false };
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

let store: ApplicationStore | null = null;
export function applicationStore(): ApplicationStore {
  store ??= new ApplicationStore(
    process.env.APPLICATIONS_FILE ?? path.join(process.cwd(), ".data", "applications.json"),
  );
  return store;
}
