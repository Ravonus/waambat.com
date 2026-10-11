"use client";
import { useActionState, useState } from "react";
import { backupSignIn } from "./login-action";
export default function LoginForm() {
  const [error, action, pending] = useActionState(backupSignIn, "");
  const [username, setUsername] = useState("");
  return (
    <form action={action} className="mt-8 space-y-4">
      <h2 className="text-waambat-pink">Backup administrator login</h2>
      <label className="block">
        Username
        <input
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          maxLength={40}
          className="mt-2 block w-full border border-white/30 bg-black p-2"
        />
      </label>
      <label className="block">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className="mt-2 block w-full border border-white/30 bg-black p-2"
        />
      </label>
      <button
        disabled={pending}
        className="border-waambat-pink rounded border px-5 py-2"
      >
        {pending ? "Signing in…" : "Sign in with password"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
