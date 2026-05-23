import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  clearDebugLog,
  getDebugLog,
  onDebugEvent,
  type DebugEvent,
} from "@/lib/realtimeDebug";

type ChannelInfo = { name: string; state: string };

const STATE_COLORS: Record<string, string> = {
  SUBSCRIBED: "#22c55e",
  CLOSED: "#6b7280",
  TIMED_OUT: "#ef4444",
  CHANNEL_ERROR: "#ef4444",
};

function StateLabel({ state }: { state: string }) {
  const color = STATE_COLORS[state] ?? "#eab308";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ color }}>{state}</span>
    </span>
  );
}

const BTN: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 11,
  color: "white",
};

export default function RealtimeDebugOverlay() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"channels" | "events">("channels");
  const [events, setEvents] = useState<readonly DebugEvent[]>(() => getDebugLog());
  const [channels, setChannels] = useState<ChannelInfo[]>([]);

  useEffect(() => {
    return onDebugEvent(() => setEvents([...getDebugLog()]));
  }, []);

  useEffect(() => {
    const tick = () =>
      setChannels(
        supabase.getChannels().map((ch) => ({ name: ch.topic, state: ch.state })),
      );
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, []);

  const panel: React.CSSProperties = {
    position: "fixed",
    top: 8,
    right: 8,
    zIndex: 9999,
    background: "rgba(10,10,15,0.93)",
    color: "#e2e8f0",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    fontFamily: "ui-monospace, 'Cascadia Code', monospace",
    fontSize: 11,
    boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
    backdropFilter: "blur(6px)",
  };

  if (!open) {
    return (
      <div
        style={{ ...panel, padding: "5px 10px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen(true)}
        title="Open Realtime Debug"
      >
        <span style={{ color: "#64748b" }}>
          RT⚡ {channels.length}ch&nbsp;/&nbsp;{events.length}ev
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...panel, width: 380, display: "flex", flexDirection: "column", maxHeight: 520 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          gap: 6,
        }}
      >
        <span style={{ flex: 1, color: "#64748b", fontWeight: 700, letterSpacing: "0.04em" }}>
          Realtime Debug
        </span>
        <button
          style={{ ...BTN, background: tab === "channels" ? "#1d4ed8" : "transparent" }}
          onClick={() => setTab("channels")}
        >
          Channels ({channels.length})
        </button>
        <button
          style={{ ...BTN, background: tab === "events" ? "#1d4ed8" : "transparent" }}
          onClick={() => setTab("events")}
        >
          Events ({events.length})
        </button>
        <button
          style={{ ...BTN, color: "#64748b", padding: "2px 6px", fontSize: 14 }}
          onClick={() => setOpen(false)}
          title="Minimize"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
        {tab === "channels" && (
          <>
            {channels.length === 0 ? (
              <div style={{ color: "#475569", padding: "8px 0" }}>No active channels</div>
            ) : (
              channels.map((ch) => (
                <div
                  key={ch.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "4px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#cbd5e1",
                    }}
                    title={ch.name}
                  >
                    {ch.name}
                  </span>
                  <StateLabel state={ch.state} />
                </div>
              ))
            )}
          </>
        )}

        {tab === "events" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <button
                onClick={() => {
                  clearDebugLog();
                  setEvents([]);
                }}
                style={{
                  ...BTN,
                  color: "#f87171",
                  border: "1px solid #f87171",
                  padding: "1px 8px",
                }}
              >
                Clear
              </button>
            </div>
            {events.length === 0 ? (
              <div style={{ color: "#475569" }}>No events yet</div>
            ) : (
              events.slice(0, 40).map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "3px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "nowrap", overflow: "hidden" }}>
                    <span style={{ color: "#475569", flexShrink: 0 }}>
                      {ev.receivedAt.toLocaleTimeString()}
                    </span>
                    <span style={{ color: "#60a5fa", flexShrink: 0, fontWeight: 700 }}>
                      {ev.eventType}
                    </span>
                    {ev.table && (
                      <span style={{ color: "#a78bfa", flexShrink: 0 }}>{ev.table}</span>
                    )}
                    <span
                      style={{
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                      title={ev.channelName}
                    >
                      {ev.channelName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
