"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/auth", { method: "POST", body: new FormData(event.currentTarget) });
      if (response.ok) {
        // A full page load, so the proxy sees the new cookie and serves the owner's gallery.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center px-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          name="password"
          type="password"
          placeholder="Password"
          aria-label="Password"
          aria-invalid={error}
          autoComplete="current-password"
          autoFocus
          required
          className="h-11"
        />
        <Button type="submit" disabled={busy} className="h-11">
          Sign in
        </Button>
      </form>
    </main>
  );
}
