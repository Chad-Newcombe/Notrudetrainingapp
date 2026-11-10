"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Cloud, LockKeyhole } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/Button";
import { guestRecords, importGuestData } from "@/lib/store/storage";
import type { StoredRecord } from "@/lib/account/records";

const fieldClass = "w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 outline-offset-2";

export default function AccountPage() {
  const { enabled, user } = useAccount();
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deviceRecords, setDeviceRecords] = useState<StoredRecord[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (user) void guestRecords().then(setDeviceRecords).catch(() => {
      setStatus("Device data could not be read.");
    });
  }, [user]);

  async function authRequest(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many attempts. Try again in a minute.");
        throw new Error(path === "sign-in/email"
          ? "Couldn’t sign in. Check your email and password."
          : path === "sign-out" ? "Couldn’t sign out. Try again." : "Couldn’t create the account. Check your details or sign in.");
      }
      window.location.assign(path === "sign-up/email" ? "/account" : "/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account access is unavailable.");
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = { email: String(data.get("email")).trim(), password: String(data.get("password")) };
    void authRequest(create ? "sign-up/email" : "sign-in/email", create
      ? { ...credentials, name: String(data.get("name")).trim() }
      : credentials);
  }

  async function importData() {
    setBusy(true);
    setError("");
    try {
      await importGuestData(deviceRecords);
      setStatus("Your device data was copied to your account.");
      setDeviceRecords([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn’t import device data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-enter space-y-6 px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <Button href="/" variant="ghost" className="gap-2"><ArrowLeft size={16} aria-hidden /> Home</Button>
      <section className="coach-stage account-stage">
        <div className="coach-stage-content">
          <LockKeyhole size={24} aria-hidden />
          <p className="coach-stage-label mt-4">Your account</p>
          <h1 className="font-display mt-2 text-3xl font-bold">{user ? `Hi, ${user.name}` : "Keep your progress"}</h1>
          <p className="coach-stage-subtitle mt-2">Bring your training, coach, and check-ins with you.</p>
        </div>
      </section>

      {!enabled ? (
        <p className="panel p-5">This server is in guest mode. Your progress is saved in this browser. The project README has the setup steps for accounts.</p>
      ) : user ? (
        <section className="panel space-y-4 p-5">
          <div className="flex items-center gap-2 font-semibold"><Cloud size={18} aria-hidden /> Saving to your account</div>
          <p className="break-words text-sm text-[var(--muted)]">{user.email}</p>
          {deviceRecords.length > 0 && (
            <>
              <p className="text-sm text-[var(--muted)]">Copy this browser’s guest profile, plan, and activity to an empty account. The device copy stays available in guest mode.</p>
              <Button className="w-full" disabled={busy} onClick={() => void importData()}>Copy device data to account</Button>
            </>
          )}
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void authRequest("sign-out", {})}>Sign out</Button>
        </section>
      ) : (
        <form key={String(create)} onSubmit={submit} className="panel space-y-4 p-5">
          <h2 className="font-display text-xl font-bold">{create ? "Create an account" : "Sign in"}</h2>
          {create && <label className="block space-y-1"><span>Display name</span><input className={fieldClass} name="name" autoComplete="name" required maxLength={100} /></label>}
          <label className="block space-y-1"><span>Email</span><input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label className="block space-y-1"><span>Password</span><input className={fieldClass} name="password" type="password" autoComplete={create ? "new-password" : "current-password"} required minLength={create ? 10 : undefined} maxLength={128} /></label>
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "One moment…" : create ? "Create account" : "Sign in"}</Button>
          <button type="button" className="w-full text-sm font-semibold underline underline-offset-4" disabled={busy}
            onClick={() => { setCreate(!create); setError(""); }}>
            {create ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      )}
      {status && <p role="status" className="text-sm">{status}</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </main>
  );
}
