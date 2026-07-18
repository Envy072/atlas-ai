import { startPipeline, resumePipeline, retryStage, cancelPipeline, getExecution } from "@/lib/pipeline";
import { InvalidRequestError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import type {
  AnalysisSession,
  CreateSessionInput,
  SessionRecord,
} from "@/lib/analysis-session/schemas/session.schema";
import { CreateSessionInputSchema } from "@/lib/analysis-session/schemas/session.schema";
import type { LogEntry } from "@/lib/analysis-session/schemas/log.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";
import { buildSessionRecord } from "@/lib/analysis-session/lifecycle/sessionFactory";
import { composeAnalysisSession } from "@/lib/analysis-session/lifecycle/sessionComposer";
import { buildLogs } from "@/lib/analysis-session/logs/buildLogs";
import { defaultAnalysisSessionStore } from "@/lib/analysis-session/storage/defaultStore";

// The one shared default store every lifecycle function falls back to
// unless a caller supplies its own — see storage/defaultStore.ts for why
// this is a single shared instance rather than each function calling
// createStore() independently.
const defaultStore: AnalysisSessionStore = defaultAnalysisSessionStore;

// Loads a record for a specific requester, treating "exists but belongs
// to someone else" identically to "doesn't exist" (Milestone 47, per
// the Milestone 46 review): a distinguishable 403 here would confirm a
// guessed id is real, which is exactly the enumeration risk this
// milestone closes. An anonymous session (ownerId: null) stays exactly
// as accessible as it always has been — Milestone 27's approved
// anonymous-analysis decision is unaffected.
function assertAccessible(record: SessionRecord, requestingUserId: string | null): void {
  if (record.ownerId !== null && record.ownerId !== requestingUserId) {
    throw new InvalidRequestError(`No analysis session found for id "${record.id}".`);
  }
}

async function loadRecordOrThrow(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore
): Promise<SessionRecord> {
  const record = await store.getById(sessionId);
  if (!record) {
    throw new InvalidRequestError(`No analysis session found for id "${sessionId}".`);
  }
  assertAccessible(record, requestingUserId);
  return record;
}

// Creates a brand-new session by starting a brand-new pipeline execution
// (delegating entirely to lib/pipeline's own startPipeline — this
// function performs no orchestration of its own) and persisting only the
// tiny SessionRecord that references it.
export async function createSession(
  input: CreateSessionInput,
  ownerId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const validated = parseOrThrow(CreateSessionInputSchema, input, "Invalid session input.");

  const execution = await startPipeline({ startupIdea: validated.startupIdea });
  const record = buildSessionRecord({
    executionId: execution.id,
    title: validated.title ?? validated.startupIdea,
    startupIdea: validated.startupIdea,
    ownerId,
  });
  await store.upsert(record);

  return composeAnalysisSession(record, execution);
}

// An orphaned session (its execution no longer exists) is not a valid
// session (MILESTONE_12_DESIGN.md Section 17) — returns null rather than
// a partially-composed view. A session that exists but belongs to a
// different user returns null for the identical reason (see
// assertAccessible above) — the route layer already treats a null
// result as "not found" with no change needed there.
export async function getSession(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession | null> {
  const record = await store.getById(sessionId);
  if (!record) return null;
  if (record.ownerId !== null && record.ownerId !== requestingUserId) return null;

  const execution = await getExecution(record.executionId);
  if (!execution) return null;

  return composeAnalysisSession(record, execution);
}

export async function listSessions(store: AnalysisSessionStore = defaultStore): Promise<AnalysisSession[]> {
  const records = await store.list();

  const sessions = await Promise.all(
    records.map(async (record) => {
      const execution = await getExecution(record.executionId);
      if (!execution) return null;
      return composeAnalysisSession(record, execution);
    })
  );

  return sessions.filter((session): session is AnalysisSession => session !== null);
}

// Every lifecycle mutation below is a direct delegation to lib/pipeline's
// own function — this layer never reimplements cancellation, retry, or
// resume semantics (MILESTONE_12_DESIGN.md Section 3's "must never own
// any orchestration logic").
export async function cancelSession(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, requestingUserId, store);
  const execution = await cancelPipeline(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function retrySession(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, requestingUserId, store);
  const execution = await retryStage(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function resumeSession(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, requestingUserId, store);
  const execution = await resumePipeline(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function getLogs(
  sessionId: string,
  requestingUserId: string | null,
  store: AnalysisSessionStore = defaultStore
): Promise<LogEntry[]> {
  const record = await loadRecordOrThrow(sessionId, requestingUserId, store);
  const execution = await getExecution(record.executionId);
  if (!execution) {
    throw new InvalidRequestError(`No pipeline execution found for session "${sessionId}".`);
  }
  return buildLogs(execution);
}
