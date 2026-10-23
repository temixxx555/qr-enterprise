"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui";
export default function AccountForm() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = register
        ? await authClient.signUp.email(values)
        : await authClient.signIn.email(values);
      if (result.error) throw new Error(result.error.message);
      if (register && !result.data?.token) { setError("Check your email to verify your account, then sign in."); return; }
      router.replace("/dashboard"); router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className='account-shell'>
      <form className='panel account-card participant-form' onSubmit={submit}>
        <p className='eyebrow'>ENTERPRISE QR</p>
        <h1>{register ? "Make space for your ideas." : "Welcome back."}</h1>
        <p>Your pages, campaigns and team in one place.</p>
        {register && (
          <label>
            Your name
            <input name='name' required maxLength={100} autoComplete='name' />
          </label>
        )}
        <label>
          Email
          <input name='email' type='email' autoComplete='email' required />
        </label>
        <label>
          Password
          <input
            name='password'
            type='password'
            required
            minLength={12}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {register && <small>Use at least 12 characters.</small>}
        {error && <p role='alert'>{error}</p>}
        <Button disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </Button>
        <button
          className='text-link'
          type='button'
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Already have an account? Sign in" : "Create an account"}
        </button>
        <Link href="/reset-password">Forgot your password?</Link>
        <small>
          Use your own account for your workspace.
        </small>
      </form>
    </main>
  );
}
