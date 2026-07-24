import { describe, it, expect } from "vitest";
import { createSupabaseAdapter } from "@/lib/persistence/adapters/supabaseAdapter";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";

interface Widget {
  id: string;
  name: string;
}

function buildAdapter(client: ReturnType<typeof createMockSupabaseClient>) {
  return createSupabaseAdapter<Widget>({
    client,
    tableName: "widgets",
    toRow: (widget) => ({ id: widget.id, name: widget.name }),
    fromRow: (row) => ({ id: row.id as string, name: row.name as string }),
  });
}

describe("createSupabaseAdapter", () => {
  it("returns null from getById when no row matches", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null } });
    const adapter = buildAdapter(client);
    expect(await adapter.getById("missing")).toBeNull();
  });

  it("maps a found row through fromRow", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: { id: "w1", name: "Widget" }, error: null } });
    const adapter = buildAdapter(client);
    expect(await adapter.getById("w1")).toEqual({ id: "w1", name: "Widget" });
  });

  it("throws when the select errors", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: { message: "boom" } } });
    const adapter = buildAdapter(client);
    await expect(adapter.getById("w1")).rejects.toThrow("boom");
  });

  it("maps every row returned from list through fromRow", async () => {
    const client = createMockSupabaseClient({
      selectResult: { data: [{ id: "w1", name: "One" }, { id: "w2", name: "Two" }], error: null },
    });
    const adapter = buildAdapter(client);
    expect(await adapter.list()).toEqual([
      { id: "w1", name: "One" },
      { id: "w2", name: "Two" },
    ]);
  });

  it("returns an empty array from list when no rows exist", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null } });
    const adapter = buildAdapter(client);
    expect(await adapter.list()).toEqual([]);
  });

  it("upserts a record mapped through toRow", async () => {
    const client = createMockSupabaseClient();
    const adapter = buildAdapter(client);
    await expect(adapter.upsert({ id: "w1", name: "Widget" })).resolves.toBeUndefined();
  });

  it("throws when upsert errors", async () => {
    const client = createMockSupabaseClient({ upsertResult: { error: { message: "conflict" } } });
    const adapter = buildAdapter(client);
    await expect(adapter.upsert({ id: "w1", name: "Widget" })).rejects.toThrow("conflict");
  });

  it("deletes by id", async () => {
    const client = createMockSupabaseClient();
    const adapter = buildAdapter(client);
    await expect(adapter.delete("w1")).resolves.toBeUndefined();
  });

  it("throws when delete errors", async () => {
    const client = createMockSupabaseClient({ deleteResult: { error: { message: "not found" } } });
    const adapter = buildAdapter(client);
    await expect(adapter.delete("w1")).rejects.toThrow("not found");
  });
});
