// Dev-only event bus — supabase.ts patches channel() to emit here,
// RealtimeDebugOverlay reads from here.  Zero cost in production because
// the entire patch block is inside `if (import.meta.env.DEV)` which Vite
// eliminates at build time.

export interface DebugEvent {
  id: string;
  channelName: string;
  eventType: string; // INSERT | UPDATE | DELETE | broadcast-event-name
  table?: string;
  payload: unknown;
  receivedAt: Date;
}

type Listener = (event: DebugEvent) => void;

const listeners = new Set<Listener>();
const log: DebugEvent[] = [];
const MAX_LOG = 150;

export function emitDebugEvent(event: DebugEvent): void {
  log.unshift(event);
  if (log.length > MAX_LOG) log.length = MAX_LOG;
  for (const fn of listeners) fn(event);
}

export function onDebugEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDebugLog(): readonly DebugEvent[] {
  return log;
}

export function clearDebugLog(): void {
  log.length = 0;
}
