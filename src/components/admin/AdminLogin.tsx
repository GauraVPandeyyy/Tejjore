"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Sign-in failed.");
      router.replace("/admin"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }

  return <main className="admin-root admin-login-shell">
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <Image src="/brand/tejjora-mark.png" alt="" width={96} height={96} className="admin-login-mark" priority />
      <span className="admin-eyebrow">Tejjora operations</span>
      <h1 id="admin-login-title">Staff sign in</h1>
      <p>Reservations, arrivals, rates and room availability for the hotel team.</p>
      {!configured && <div className="admin-alert" role="alert">Admin access is not configured yet. Add ADMIN_USERS_JSON and ADMIN_SESSION_SECRET on the server.</div>}
      <form onSubmit={submit} className="admin-login-form">
        <label><span>User ID</span><input autoComplete="username" value={userId} onChange={(e)=>setUserId(e.target.value)} disabled={!configured} /></label>
        <label><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} disabled={!configured} /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button type="submit" disabled={!configured || busy || !userId || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
