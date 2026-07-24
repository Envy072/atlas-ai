import type { SupabaseClient } from "@supabase/supabase-js";
import { PipelineExecutionSchema, type PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore, UpsertVersionCheckResult } from "@/lib/pipeline/types/storage";
import type { StorageAdapter } from "@/lib/persistence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAdapter } from "@/lib/persistence/adapters/supabaseAdapter";
import { createRepository } from "@/lib/persistence/createRepository";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";

interface PipelineExecutionRow {
  id: string;
  startup_idea: string;
  state: string;
  current_stage_index: number;
  context: unknown;
  stage_history: unknown;
  progress: unknown;
  error_summary: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function toRow(execution: PipelineExecution): PipelineExecutionRow {
  return {
    id: execution.id,
    startup_idea: execution.startupIdea,
    state: execution.state,
    current_stage_index: execution.currentStageIndex,
    context: execution.context,
    stage_history: execution.stageHistory,
    progress: execution.progress,
    error_summary: execution.errorSummary ?? null,
    version: execution.version,
    created_at: execution.createdAt,
    updated_at: execution.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): PipelineExecution {
  const r = row as unknown as PipelineExecutionRow;
  return {
    id: r.id,
    startupIdea: r.startup_idea,
    state: r.state as PipelineExecution["state"],
    currentStageIndex: r.current_stage_index,
    context: r.context as PipelineExecution["context"],
    stageHistory: r.stage_history as PipelineExecution["stageHistory"],
    progress: r.progress as PipelineExecution["progress"],
    errorSummary: r.error_summary ?? undefined,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const UNIQUE_VIOLATION = "23505";

// Real as of Milestone 107 (Milestone 104A ADR Decision 4, Milestone 107's
// own approved concurrency design). Built on Milestone 105's persistence
// core for the plain, unconditional four methods (getById/list/upsert/
// delete — upsert here is unconditional, kept only for callers with a
// genuine need to bypass version checking, e.g. pipelineEngine.test.ts's
// own fixture seeding, never production persistence). The one new,
// pipeline-specific method, upsertWithVersionCheck, is implemented
// directly against the injected client rather than through
// createSupabaseAdapter, since Milestone 105's generic adapter
// deliberately has no concept of a conditional write (see
// lib/pipeline/types/storage.ts's own comment on why this contract, not
// the generic one, owns this method).
//
// The Supabase client is constructed lazily, on first real call — the
// pattern Milestone 106 established (and Milestone 105's own eager first
// pass broke), restored here from the start rather than rediscovered.
export function createSupabasePipelineStore(tableName = "pipeline_executions"): PipelineExecutionStore {
  let cachedClient: SupabaseClient | null = null;
  function getClient(): SupabaseClient {
    if (!cachedClient) cachedClient = createAdminClient();
    return cachedClient;
  }

  let cachedRepository: StorageAdapter<PipelineExecution> | null = null;
  function getRepository(): StorageAdapter<PipelineExecution> {
    if (!cachedRepository) {
      const adapter = createSupabaseAdapter<PipelineExecution>({
        client: getClient(),
        tableName,
        toRow: toRow as unknown as (execution: PipelineExecution) => Record<string, unknown>,
        fromRow,
      });
      cachedRepository = createRepository({
        adapter,
        schema: PipelineExecutionSchema,
        resourceName: "pipeline execution",
      });
    }
    return cachedRepository;
  }

  async function upsertWithVersionCheck(
    execution: PipelineExecution,
    expectedVersion: number
  ): Promise<UpsertVersionCheckResult> {
    const validated = parseOrThrow(
      PipelineExecutionSchema,
      execution,
      "Invalid pipeline execution — refusing to persist."
    );
    const client = getClient();
    const nextVersion = expectedVersion + 1;
    const row = { ...toRow(validated), version: nextVersion };

    try {
      if (expectedVersion === 0) {
        // First-ever write for this id: succeed unless a row with this id
        // already exists (a genuine, surprising conflict — two writers
        // both believing they're the first to create this execution).
        const { error } = await client.from(tableName).insert(row);
        if (error) {
          if (error.code === UNIQUE_VIOLATION) {
            const current = await getRepository().getById(execution.id);
            if (!current) {
              throw new ExternalServiceError(
                "Supabase",
                "Insert conflicted but the conflicting row could not be re-read."
              );
            }
            return { success: false, current };
          }
          throw new Error(error.message);
        }
        return { success: true, version: nextVersion };
      }

      const { data, error } = await client
        .from(tableName)
        .update(row)
        .eq("id", execution.id)
        .eq("version", expectedVersion)
        .select();

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        const current = await getRepository().getById(execution.id);
        if (!current) {
          throw new ExternalServiceError("Supabase", "Version check failed but the current row could not be re-read.");
        }
        return { success: false, current };
      }

      return { success: true, version: nextVersion };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ExternalServiceError) throw error;
      throw new ExternalServiceError("Supabase", "Pipeline execution storage operation failed.");
    }
  }

  return {
    getById: (id) => getRepository().getById(id),
    list: () => getRepository().list(),
    upsert: (execution) => getRepository().upsert(execution),
    delete: (id) => getRepository().delete(id),
    upsertWithVersionCheck,
  };
}
