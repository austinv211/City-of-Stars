import { useState } from "react";
import { Navigate } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { AnimatedStar } from "@/core/components/TitleBar";
import { DISPLAY_NAME_MAX } from "@/core/components/DisplayNamePrompt";

/** Where email confirmation links land; must be in Supabase's redirect allow-list. */
const AUTH_LANDING_URL =
  import.meta.env.VITE_AUTH_LANDING_URL ?? "https://austinv211.github.io/City-of-Stars/";

type Mode = "signin" | "signup";

interface Fields {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: Fields = { name: "", email: "", password: "", confirmPassword: "" };

/** The first problem with the form, checked before anything touches auth. */
function validate(mode: Mode, f: Fields): string | null {
  if (mode === "signup" && !f.name.trim()) return "Choose a display name.";
  if (mode === "signup" && f.password !== f.confirmPassword) return "Passwords do not match.";
  if (f.password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

async function submit(mode: Mode, f: Fields): Promise<{ error?: string; created?: boolean }> {
  const email = f.email.trim();
  // Check the whitelist before touching auth, so a stranger gets a clear answer.
  const { data: allowed } = await supabase.rpc("is_email_allowed", { user_email: email });
  if (!allowed) {
    return { error: "This email is not authorized to access City of Stars. Contact the administrator for access." };
  }

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
    return error ? { error: error.message } : {};
  }

  const { error } = await supabase.auth.signUp({
    email,
    password: f.password,
    options: {
      // The app has no web origin to return to, so the confirmation link
      // lands on a small static page that says what to do next.
      emailRedirectTo: AUTH_LANDING_URL,
      data: { display_name: f.name.trim() },
    },
  });
  return error ? { error: error.message } : { created: true };
}

export default function LoginPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
  };

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
    setFields((f) => ({ ...f, password: "", confirmPassword: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    const problem = validate(mode, fields);
    setError(problem);
    if (problem) return;

    setLoading(true);
    const result = await submit(mode, fields);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.created) {
      switchMode("signin");
      setSuccessMessage("Account created! Check your email for a confirmation link before signing in.");
    }
  }

  const signingUp = mode === "signup";

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 40% 35%, color-mix(in oklch, var(--secondary) 6%, transparent) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 65% 55%, color-mix(in oklch, var(--primary) 7%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div
          className="relative overflow-hidden border border-border bg-card px-8 py-9"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <div className="ctp-accent-bar pointer-events-none absolute inset-x-0 top-0 h-[2px]" aria-hidden />
          <Brand subtitle={signingUp ? "Create a new account" : "Sign in to your account"} />
          <ModeTabs mode={mode} onChange={switchMode} />

          {successMessage && (
            <div className="mb-5 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {successMessage}
            </div>
          )}

          <form id="auth-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {signingUp && (
              <Field id="display-name" label="Display name" hint="How your DM and party see you. Your email stays private.">
                <Input
                  id="display-name"
                  autoComplete="nickname"
                  placeholder="e.g. Mira"
                  maxLength={DISPLAY_NAME_MAX}
                  value={fields.name}
                  onChange={set("name")}
                  required
                  className="h-10"
                />
              </Field>
            )}

            <Field id="email" label="Email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={fields.email}
                onChange={set("email")}
                required
                className="h-10"
              />
            </Field>

            <Field id="password" label="Password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={signingUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={fields.password}
                  onChange={set("password")}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {signingUp && (
              <Field id="confirm-password" label="Confirm Password">
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={fields.confirmPassword}
                  onChange={set("confirmPassword")}
                  required
                  className="h-10"
                />
              </Field>
            )}

            {error && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full font-medium"
              style={{ boxShadow: "var(--shadow-glow), var(--shadow-sm)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!loading && (signingUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {signingUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(signingUp ? "signin" : "signup")}
              className="font-medium text-primary hover:underline"
            >
              {signingUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col items-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-primary/20 bg-primary/15">
        <AnimatedStar size={32} />
      </div>
      <div>
        <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold tracking-tight text-transparent">
          City of Stars
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Sign in or sign up"
      className="mb-6 grid grid-cols-2 bg-input p-0.5 text-sm"
      style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}
    >
      {(["signin", "signup"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          aria-controls="auth-form"
          onClick={() => onChange(m)}
          className={
            mode === m
              ? "bg-primary/20 py-1.5 font-medium text-primary transition-all"
              : "py-1.5 font-medium text-muted-foreground transition-all"
          }
        >
          {m === "signin" ? "Sign In" : "Sign Up"}
        </button>
      ))}
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
