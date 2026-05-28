"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [visible,  setVisible]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const next = params.get("next") ?? "/dashboard";
      const res  = await fetch(`/api/auth/login?next=${encodeURIComponent(next)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Incorrect password");
        setPassword("");
        inputRef.current?.focus();
        return;
      }

      router.replace(data.redirectTo ?? "/dashboard");
    } catch {
      setError("Something went wrong — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password field */}
      <div className="relative">
        <input
          ref={inputRef}
          id="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          spellCheck={false}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="input pr-10"
          disabled={loading}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-4 transition-colors duration-150"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs font-medium text-danger animate-fade-in">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Signing in…</>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
