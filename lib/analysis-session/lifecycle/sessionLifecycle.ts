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

async function loadRecordOrThrow(sessionId: string, store: AnalysisSessionStore): Promise<SessionRecord> {
  const record = await store.getById(sessionId);
  if (!record) {
    throw new InvalidRequestError(`No analysis session found for id "${sessionId}".`);
  }
  return record;
}

// Creates a brand-new session by starting a brand-new pipeline execution
// (delegating entirely to lib/pipeline's own startPipeline — this
// function performs no orchestration of its own) and persisting only the
// tiny SessionRecord that references it.
export async function createSession(
  input: CreateSessionInput,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const validated = parseOrThrow(CreateSessionInputSchema, input, "Invalid session input.");

  const execution = await startPipeline({ startupIdea: validated.startupIdea });
  const record = buildSessionRecord({
    executionId: execution.id,
    title: validated.title ?? validated.startupIdea,
    startupIdea: validated.startupIdea,
  });
  await store.upsert(record);

  return composeAnalysisSession(record, execution);
}

// An orphaned session (its execution no longer exists) is not a valid
// session (MILESTONE_12_DESIGN.md Section 17) — returns null rather than
// a partially-composed view.
export async function getSession(
  sessionId: string,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession | null> {
  const record = await store.getById(sessionId);
  if (!record) return null;

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
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, store);
  const execution = await cancelPipeline(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function retrySession(
  sessionId: string,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, store);
  const execution = await retryStage(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function resumeSession(
  sessionId: string,
  store: AnalysisSessionStore = defaultStore
): Promise<AnalysisSession> {
  const record = await loadRecordOrThrow(sessionId, store);
  const execution = await resumePipeline(record.executionId);
  return composeAnalysisSession(record, execution);
}

export async function getLogs(
  sessionId: string,
  store: AnalysisSessionStore = defaultStore
): Promise<LogEntry[]> {
  const record = await loadRecordOrThrow(sessionId, store);
  const execution = await getExecution(record.executionId);
  if (!execution) {
    throw new InvalidRequestError(`No pipeline execution found for session "${sessionId}".`);
  }
  return buildLogs(execution);
}
