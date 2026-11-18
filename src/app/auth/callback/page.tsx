import { Suspense } from "react";
import AuthCallback from "./AuthCallback";

export default function AuthCallbackPage() {
  return (
    <main className="absolute inset-0 overflow-y-auto bg-black text-white">
      <Suspense fallback={<Spinner />}>
        <AuthCallback />
      </Suspense>
    </main>
  );
}

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <span
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/25 border-t-white"
      />
    </div>
  );
}
