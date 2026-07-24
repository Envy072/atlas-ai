// The one storage-adapter contract every backend implements (Milestone
// 105). This is not a new shape — it's the exact four-method interface
// every existing store in this codebase already independently settled on
// (AnalysisSessionStore, PipelineExecutionStore, MarketKnowledgeStore,
// and siblings), now formalized as the pluggable-adapter boundary a
// generic repository can wrap. A secondary lookup a specific store needs
// (e.g. MarketKnowledgeStore's own findByIndustry) is composed on top of
// an adapter built from this contract, never added here — this interface
// stays the common baseline every backend can satisfy, not a superset
// only some of them can.
export interface StorageAdapter<T> {
  getById(id: string): Promise<T | null>;
  list(): Promise<T[]>;
  upsert(record: T): Promise<void>;
  delete(id: string): Promise<void>;
}
