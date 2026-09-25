"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyPatch,
  initialDraft,
  parseDraftState,
  setFields,
  type DraftField,
  type DraftPatch,
  type DraftState,
  type FieldSource,
} from "./draft";

const DRAFT_KEY = "bcc-leasing-draft-v1";
const SESSION_KEY = "bcc-leasing-session-v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the draft lives until reload.
  }
}

/** Random per-browser session: isolates chat and applications between clients. */
export function sessionId(): string {
  let id = read<string>(SESSION_KEY);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    write(SESSION_KEY, id);
  }
  return id;
}

/**
 * Single application draft shared by the calculator, the assistant and the application
 * form. Persisted in localStorage (the project's storage model); restored after reload.
 */
export function useLeaseDraft() {
  const [state, setState] = useState<DraftState>(initialDraft);
  const [restored, setRestored] = useState(false);
  // Latest committed draft for async callbacks (terms loading, assistant responses).
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    const saved = parseDraftState(read(DRAFT_KEY));
    if (saved) {
      latest.current = saved;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(saved);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    // Contacts stay in page memory only, like the application contact form.
    if (restored)
      write(DRAFT_KEY, {
        ...state,
        values: { ...state.values, contactName: "", contactPhone: "" },
      });
  }, [state, restored]);

  const update = useCallback((patch: DraftPatch, source: FieldSource = "form") => {
    const next = setFields(latest.current, patch, source);
    latest.current = next;
    setState(next);
  }, []);

  /** Assistant patch: fields changed locally after the request keep the local value. */
  const applyAssistantPatch = useCallback(
    (patch: DraftPatch, baseRevs: Record<DraftField, number>) => {
      const result = applyPatch(latest.current, patch, baseRevs, "chat");
      latest.current = result.state;
      setState(result.state);
      return { applied: result.applied, skipped: result.skipped };
    },
    [],
  );

  const replace = useCallback((next: DraftState) => {
    latest.current = next;
    setState(next);
  }, []);

  return { state, restored, update, applyAssistantPatch, replace, latest };
}
