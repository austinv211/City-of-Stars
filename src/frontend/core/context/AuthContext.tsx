import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isPlayerRole: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlayerRole, setIsPlayerRole] = useState(false);

  async function loadRole(userId: string) {
    const [{ data: roleData }, { data: appRoles }] = await Promise.all([
      supabase.from("user_roles").select("app_role").eq("user_id", userId).maybeSingle(),
      supabase.rpc("get_my_app_roles"),
    ]);
    const roles: string[] = appRoles ?? [];
    setIsAdmin(roleData?.app_role === "admin" || roles.includes("admin"));
    setIsPlayerRole(roles.includes("player"));
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Only reload the role on events that can actually change it.
      // TOKEN_REFRESHED fires frequently on Windows (WebView2 triggers
      // visibilitychange on focus) and would hammer the DB otherwise.
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session?.user) loadRole(session.user.id);
        else { setIsAdmin(false); setIsPlayerRole(false); }
      } else if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        setIsPlayerRole(false);
      }
      // INITIAL_SESSION fires once on subscribe with the stored session (or null).
      // Clearing loading here — instead of a separate getSession() call — prevents a
      // race on Windows/WebView2 where the getSession() promise resolves with a stale
      // null after SIGNED_IN has already set a valid session.
      if (event === "INITIAL_SESSION") setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch roles whenever allowed_emails or user_roles change for this user.
  useEffect(() => {
    const userId = session?.user?.id;
    const email = session?.user?.email;
    if (!userId || !email) return;

    const channel = supabase
      .channel(`auth-roles-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allowed_emails", filter: `email=eq.${email}` },
        () => loadRole(userId),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${userId}` },
        () => loadRole(userId),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Proactively refresh the token 10 minutes before it expires.
  // autoRefreshToken is disabled on the client to stop WebView2 from firing
  // _recoverAndRefresh on every visibilitychange event, so we own the schedule.
  useEffect(() => {
    if (!session?.expires_at) return;
    const msUntilRefresh = session.expires_at * 1000 - Date.now() - 10 * 60 * 1000;
    const timer = setTimeout(async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) console.error("[auth] proactive token refresh failed:", error.message);
    }, Math.max(0, msUntilRefresh));
    return () => clearTimeout(timer);
  }, [session?.expires_at]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, isAdmin, isPlayerRole, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
