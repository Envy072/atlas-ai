import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createRepository } from "@/lib/persistence/createRepository";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import type { StorageAdapter } from "@/lib/persistence/types";

const WidgetSchema = z.object({ id: z.string(), name: z.string().min(1) });
type Widget = z.infer<typeof WidgetSchema>;

function buildAdapter(overrides: Partial<StorageAdapter<Widget>> = {}): StorageAdapter<Widget> {
  return {
    getById: vi.fn(async () => null),
    list: vi.fn(async () => []),
    upsert: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("createRepository", () => {
  it("returns null from getById when the adapter finds nothing", async () => {
    const repo = createRepository({ adapter: buildAdapter(), schema: WidgetSchema, resourceName: "widget" });
    expect(await repo.getById("missing")).toBeNull();
  });

  it("returns a validated record when the adapter finds one", async () => {
    const widget = { id: "w1", name: "Widget" };
    const adapter = buildAdapter({ getById: vi.fn(async () => widget) });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });
    expect(await repo.getById("w1")).toEqual(widget);
  });

  it("throws ValidationError when a stored record fails schema validation on read", async () => {
    const malformed = { id: "w1" } as unknown as Widget;
    const adapter = buildAdapter({ getById: vi.fn(async () => malformed) });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });
    await expect(repo.getById("w1")).rejects.toThrow(ValidationError);
  });

  it("validates every record returned from list", async () => {
    const malformed = [{ id: "w1" }] as unknown as Widget[];
    const adapter = buildAdapter({ getById: vi.fn(async () => null), list: vi.fn(async () => malformed) });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });
    await expect(repo.list()).rejects.toThrow(ValidationError);
  });

  it("refuses to persist an invalid record without ever calling the adapter", async () => {
    const upsert = vi.fn(async () => {});
    const adapter = buildAdapter({ upsert });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });

    await expect(repo.upsert({ id: "w1", name: "" })).rejects.toThrow(ValidationError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persists a valid record via the adapter", async () => {
    const upsert = vi.fn(async () => {});
    const adapter = buildAdapter({ upsert });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });

    await repo.upsert({ id: "w1", name: "Widget" });
    expect(upsert).toHaveBeenCalledWith({ id: "w1", name: "Widget" });
  });

  it("maps an adapter failure to ExternalServiceError", async () => {
    const adapter = buildAdapter({
      getById: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });
    await expect(repo.getById("w1")).rejects.toThrow(ExternalServiceError);
  });

  it("delegates delete to the adapter", async () => {
    const del = vi.fn(async () => {});
    const adapter = buildAdapter({ delete: del });
    const repo = createRepository({ adapter, schema: WidgetSchema, resourceName: "widget" });

    await repo.delete("w1");
    expect(del).toHaveBeenCalledWith("w1");
  });
});
