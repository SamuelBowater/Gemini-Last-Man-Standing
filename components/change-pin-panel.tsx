"use client";

import { useState } from "react";
import { PanelTitle, Sub, PrimaryButton, PasswordInput } from "@/components/ui";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function ChangePinPanel({ onClose }: { onClose: () => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (currentPin.length !== 4) {
      setError("Enter your current 4-digit PIN.");
      return;
    }
    if (newPin.length !== 4) {
      setError("Choose a new 4-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Those new PINs don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/change-pin", { method: "POST", body: JSON.stringify({ currentPin, newPin }) });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <>
        <PanelTitle>PIN updated</PanelTitle>
        <Sub>Use your new PIN next time you log in.</Sub>
        <PrimaryButton onClick={onClose}>Done</PrimaryButton>
      </>
    );
  }

  return (
    <>
      <PanelTitle>Change your PIN</PanelTitle>
      <Sub>Enter your current PIN and choose a new 4-digit one.</Sub>
      <div className="flex flex-col gap-2.5">
        <PasswordInput
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="Current PIN"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PasswordInput
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="New PIN"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PasswordInput
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Confirm new PIN"
          inputMode="numeric"
          className="font-mono tracking-[6px] text-center text-lg"
        />
        <PrimaryButton onClick={submit} disabled={busy}>
          {busy ? "…" : "Save new PIN"}
        </PrimaryButton>
      </div>
      {error && <div className="text-red text-[13px] mt-2.5">{error}</div>}
    </>
  );
}
