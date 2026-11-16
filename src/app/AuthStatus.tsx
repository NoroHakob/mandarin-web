"use client";

import { useAuth } from "@/lib/auth";

// Temporary: shows auth state on the placeholder home page.
export default function AuthStatus() {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-sm text-subdued">…</p>;
  return <p className="text-sm text-subdued">{user ? user.email : "signed out"}</p>;
}
