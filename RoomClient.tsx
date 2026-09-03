"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMuted, playSfx, setMuted, unlockAudio } from "@/lib/sound";
import type { RoomState } from "@/lib/game";
import {
  JoinView,
  LobbyView,
  QuestionView,
  RoundEndView,
  RoomGone,
  SpyGuessView,
  VotingView,
} from "./GameViews";

export default function RoomClient({ code }: { code: string }) {
  const [data, setData] = useState<RoomState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [guessId, setGuessId] = useState<number | null>(null);

  const prevPhase = useRef<string | null>(null);
  const prevRound = useRef<number | null>(null);
  const audioUnlocked = useRef(false);

  /* ---------- identity ---------- */
  useEffect(() => {
    try {
      let t = localStorage.getItem("spy-token");
      if (!t) {
        t = crypto.randomUUID();
        localStorage.setItem("spy-token", t);
      }
      setToken(t);
      setMutedState(isMuted());
    } catch {
      setToken(crypto.randomUUID());
    }
  }, []);

  /* ---------- load + poll ---------- */
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${code}?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setGone(true);
        return;
      }
      if (!res.ok) return;
      const state = (await res.json()) as RoomState;
      setData(state);
      setActionError(null);
    } catch {
      /* keep last state */
    }
  }, [code, token]);

  useEffect(() => {
    if (!token) return;
    void load();
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, [token, load]);

  /* ---------- phase / round change effects ---------- */
  useEffect(() => {
    if (!data) return;
    const phase = data.room.phase;
    if (prevPhase.current && prevPhase.current !== phase) {
      if (phase === "question") playSfx("go");
      else if (phase === "voting") playSfx("vote");
      else if (phase === "spy-guess") playSfx("suspense");
      else if (phase === "round-end") {
        setTimeout(() => playSfx(data.result?.spyWon ? "win" : "lose"), 350);
      }
    }
    prevPhase.current = phase;
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const round = data.room.round;
    if (prevRound.current !== null && prevRound.current !== round) {
      setRevealed(false);
      setSelected(null);
      setGuessId(null);
    }
    prevRound.current = round;
  }, [data]);

  /* ---------- actions ---------- */
  async function act(body: Record<string, unknown>): Promise<boolean> {
    if (!token) return false;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(d.error ?? "Something went wrong");
        return false;
      }
      await load();
      return true;
    } catch {
      setActionError("Network hiccup — try again");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    const link = `${window.location.origin}/room/${code}`;
    try {
      await navigator.clipboard.writeText(
        `🕵️ Join my Spy at Wolt game! Room code: ${code} — ${link}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite:", `Room code: ${code} — ${link}`);
    }
  }

  async function leaveRoom() {
    await act({ action: "leave" });
    window.location.href = "/";
  }

  function toggleReveal() {
    setRevealed((r) => {
      if (!r) playSfx("reveal");
      return !r;
    });
  }

  /* ---------- render ---------- */
  if (gone) {
    return (
      <Shell code={code}>
        <RoomGone code={code} />
      </Shell>
    );
  }

  if (!token || !data) {
    return (
      <Shell code={code}>
        <div className="flex flex-col items-center justify-center pt-32 text-[#00789B]">
          <div className="floating text-6xl">🛵</div>
          <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-slate-400">
            Rounding up agents…
          </p>
        </div>
      </Shell>
    );
  }

  const you = data.you;
  const phase = data.room.phase;

  return (
    <Shell
      code={code}
      onPointerDown={() => {
        if (!audioUnlocked.current) {
          audioUnlocked.current = true;
          unlockAudio();
        }
      }}
      headerRight={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
              if (!next) playSfx("tap");
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg shadow-md transition hover:scale-105"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={leaveRoom}
            disabled={busy}
            className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#00789B] shadow-md transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            Leave
          </button>
        </div>
      }
    >
      {actionError && (
        <div className="mx-auto mb-4 w-full max-w-2xl rounded-2xl bg-red-50 px-5 py-3 text-center text-sm font-bold text-red-500">
          ⚠️ {actionError}
        </div>
      )}

      {!you ? (
        <JoinView
          code={code}
          busy={busy}
          error={actionError}
          onJoin={(name, emoji) => {
            void act({ action: "join", name, emoji });
          }}
        />
      ) : phase === "lobby" ? (
        <LobbyView
          data={data}
          onStart={() => void act({ action: "start" })}
          onKick={(playerId) => void act({ action: "kick", targetPlayerId: playerId })}
          onCopy={() => void copyInvite()}
          copied={copied}
          busy={busy}
        />
      ) : phase === "question" ? (
        <QuestionView
          data={data}
          revealed={revealed}
          onToggleReveal={toggleReveal}
          onAdvance={() => void act({ action: "advance" })}
          busy={busy}
        />
      ) : phase === "voting" ? (
        <VotingView
          data={data}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            playSfx("tap");
          }}
          onVote={(targetId) => {
            void act({ action: "vote", targetId }).then((ok) => {
              if (ok) playSfx("vote");
            });
          }}
          onAdvance={() => void act({ action: "advance" })}
          busy={busy}
        />
      ) : phase === "spy-guess" ? (
        <SpyGuessView
          data={data}
          guessId={guessId}
          onSelect={(id) => {
            setGuessId(id);
            playSfx("tap");
          }}
          onGuess={() => void act({ action: "spy-guess", guessId })}
          busy={busy}
        />
      ) : (
        <RoundEndView
          data={data}
          onNext={() => void act({ action: "next" })}
          onLobby={() => void act({ action: "to-lobby" })}
          busy={busy}
        />
      )}
    </Shell>
  );
}

/* ================= shell ================= */

function Shell({
  code,
  children,
  headerRight,
  onPointerDown,
}: {
  code: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  onPointerDown?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#EFF6FB] text-[#0B2537]" onPointerDown={onPointerDown}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a
          href="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#0B2537]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00C2E8] text-lg shadow-lg shadow-[#00C2E8]/30">
            🛵
          </span>
          SPY AT WOLT
        </a>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(code);
            }}
            className="hidden rounded-full border-2 border-[#00C2E8]/50 bg-white px-4 py-2 font-mono text-sm font-black tracking-[0.25em] text-[#00789B] sm:block"
            title="Copy room code"
          >
            {code}
          </button>
          {headerRight}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
    </div>
  );
}
