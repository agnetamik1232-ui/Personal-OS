import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ink-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-sm bg-accent" />
          </div>
          <span className="text-base font-semibold text-ink-4 tracking-tight">
            Personal OS
          </span>
        </div>

        <div className="panel p-8 space-y-6">
          <div>
            <div className="accent-bar mb-3" />
            <h1 className="text-xl font-semibold text-ink-4 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-ink-3 mt-1">
              Enter your password to continue
            </p>
          </div>

          {/* Suspense required because LoginForm reads useSearchParams */}
          <Suspense fallback={<div className="h-24" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-ink-3/50 mt-6">
          Personal OS · private instance
        </p>
      </div>
    </div>
  );
}
