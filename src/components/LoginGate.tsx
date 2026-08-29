import { useState } from "react";

/**
 * TEMPORARY placeholder — Task 3 ports the real LoginGate verbatim from
 * SukiBook's src/components/LoginGate.tsx (rebranded) and overwrites this
 * file. This stub exists only so store.tsx (Task 2) type-checks and the
 * cloud-auth gate renders something usable in the interim.
 */
export interface LoginGateProps {
  busy: boolean;
  sent: boolean;
  onSend: (email: string) => Promise<void>;
  onDemo: () => void;
}

export default function LoginGate({ busy, sent, onSend, onDemo }: LoginGateProps) {
  const [email, setEmail] = useState("");

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 360, width: "100%", padding: 24 }}>
        <h1>TindahanPro</h1>
        {sent ? (
          <p>Check your email for a magic link.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onSend(email);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
        <button type="button" onClick={onDemo}>
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}
