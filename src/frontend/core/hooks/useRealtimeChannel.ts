import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface RealtimeChannelHandlers {
  onBroadcast?: (event: string, payload: unknown) => void;
  onPostgresChange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtimeChannel(
  channelName: string,
  handlers: RealtimeChannelHandlers,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    if (!channelName) return;

    let channel = supabase.channel(channelName);

    if (handlers.onBroadcast) {
      const fn = handlers.onBroadcast;
      channel = channel.on("broadcast", { event: "*" }, ({ event, payload }) =>
        fn(event, payload)
      );
    }

    if (handlers.onPostgresChange) {
      const fn = handlers.onPostgresChange;
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => fn(payload as RealtimePostgresChangesPayload<Record<string, unknown>>)
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, ...deps]);
}
