import { useState } from "react";
import { Navigate } from "react-router";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (session) return <Navigate to="/characters" replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage(
          "Account created! Check your email for a confirmation link before signing in."
        );
        switchMode("signin");
      }
    }

    setLoading(false);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Subtle radial glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(239 84% 67% / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-xl border px-8 py-9"
          style={{
            background:    "hsl(var(--card))",
            borderColor:   "hsl(var(--border))",
            boxShadow:     "var(--shadow-elevated)",
          }}
        >
          {/* Logo + title */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                boxShadow:
                  "0 0 0 1px hsl(var(--primary) / 0.25), inset 0 1px 0 hsl(var(--primary) / 0.2)",
              }}
            >
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">City of Stars</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to your account" : "Create a new account"}
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div
            className="mb-6 grid grid-cols-2 rounded-md p-0.5 text-sm"
            style={{
              background: "hsl(var(--input))",
              boxShadow: "inset 0 1px 3px hsl(0 0% 0% / 0.4)",
            }}
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="rounded py-1.5 font-medium transition-all"
                style={
                  mode === m
                    ? {
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        boxShadow: "var(--shadow-sm)",
                      }
                    : { color: "hsl(var(--muted-foreground))" }
                }
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Success message */}
          {successMessage && (
            <div
              className="mb-5 rounded-md px-4 py-3 text-sm"
              style={{
                background:  "hsl(142 70% 45% / 0.1)",
                border:      "1px solid hsl(142 70% 45% / 0.3)",
                color:       "hsl(142 70% 70%)",
                boxShadow:   "inset 0 1px 0 hsl(142 70% 45% / 0.1)",
              }}
            >
              {successMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
                style={{
                  background:  "hsl(var(--input))",
                  borderColor: "hsl(var(--border))",
                  boxShadow:   "inset 0 1px 3px hsl(0 0% 0% / 0.35)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 pr-10"
                  style={{
                    background:  "hsl(var(--input))",
                    borderColor: "hsl(var(--border))",
                    boxShadow:   "inset 0 1px 3px hsl(0 0% 0% / 0.35)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10"
                  style={{
                    background:  "hsl(var(--input))",
                    borderColor: "hsl(var(--border))",
                    boxShadow:   "inset 0 1px 3px hsl(0 0% 0% / 0.35)",
                  }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-md px-4 py-3 text-sm"
                style={{
                  background:  "hsl(var(--destructive) / 0.1)",
                  border:      "1px solid hsl(var(--destructive) / 0.3)",
                  color:       "hsl(var(--destructive))",
                  boxShadow:   "inset 0 1px 0 hsl(var(--destructive) / 0.1)",
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-10 font-medium"
              style={{
                boxShadow: "var(--shadow-glow), var(--shadow-sm)",
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Mode switcher link */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
