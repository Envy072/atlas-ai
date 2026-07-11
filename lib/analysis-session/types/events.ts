import type { SessionEvent } from "@/lib/analysis-session/schemas/event.schema";

export type SessionEventListener = (event: SessionEvent) => void;
