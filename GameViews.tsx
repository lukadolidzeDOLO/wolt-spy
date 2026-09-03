"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { EMOJIS, LOCATIONS, MIN_PLAYERS, SAMPLE_QUESTIONS, type RoomState } from "@/lib/game";

/* ================= tiny pieces ================= */

export function Countdown({
  deadlineMs,
  className = "",
}: {
  deadlineMs: number | null;
  className?: string;
}) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (deadlineMs == null) return;
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadlineMs]);
  const left = deadlineMs == null ? null : Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
  if (left == null) return null;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const danger = left <= 30 && left > 0;
  return (
    <span
      className={`font-mono text-xl font-black tabular-nums ${
        danger ? "animate-pulse text-red-400" : ""
      } ${className}`}
    >
      {mm}:{ss}
    </span>
  );
}

const CONFETTI_COLORS = ["#00C2E8", "#7CE7FF", "#FF8A5C", "#FFD166", "#A78BFA", "#FFFFFF"];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.4 + Math.random() * 2.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 7 + Math.random() * 7,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.5,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function Avatar({ emoji, size = "text-3xl" }: { emoji: string; size?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-2xl bg-gradient-to-br from-[#DFF4FF] to-[#B9E8FF] ${size}`}
    >
      {emoji}
    </span>
  );
}

/* ================= join ================= */

export function JoinView({
  code,
  onJoin,
  busy,
  error,
}: {
  code: string;
  onJoin: (name: string, emoji: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🕵️");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spy-name");
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-[#0A1E33]/15">
        <p className="text-center text-sm font-extrabold uppercase tracking-widest text-[#00789B]">
          Joining room
        </p>
        <p className="mt-1 text-center text-4xl font-black tracking-[0.25em] text-[#0A1E33]">{code}</p>
        <div className="mt-6">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Agent name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="e.g. Agent Pizza"
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name, emoji)}
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold text-[#0B2537] placeholder:text-slate-400 focus:border-[#00C2E8] focus:outline-none"
          />
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Avatar
          </label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${
                  emoji === e
                    ? "scale-110 bg-[#00C2E8] shadow-lg shadow-[#00C2E8]/40"
                    : "bg-slate-100 hover:bg-[#00C2E8]/20"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500">
            ⚠️ {error}
          </p>
        )}
        <button
          onClick={() => name.trim() && onJoin(name, emoji)}
          disabled={busy || !name.trim()}
          className="mt-6 w-full rounded-full bg-[#00C2E8] py-4 text-base font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {busy ? "Joining…" : "🕵️ Join the mission"}
        </button>
      </div>
    </div>
  );
}

/* ================= lobby ================= */

export function LobbyView({
  data,
  onStart,
  onKick,
  onCopy,
  copied,
  busy,
}: {
  data: RoomState;
  onStart: () => void;
  onKick: (playerId: string) => void;
  onCopy: () => void;
  copied: boolean;
  busy: boolean;
}) {
  const you = data.you!;
  const host = you.isHost;
  const enough = data.players.length >= MIN_PLAYERS;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* share code */}
      <div className="overflow-hidden rounded-[2rem] bg-[#0A1E33] p-8 text-center text-white shadow-2xl shadow-[#0A1E33]/30">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#7CE7FF]">
          Room code — shout it to your teammates
        </p>
        <p className="my-3 text-6xl font-black tracking-[0.3em] text-[#00C2E8]">{data.room.code}</p>
        <button
          onClick={onCopy}
          disabled={busy}
          className="rounded-full border-2 border-[#00C2E8]/60 px-6 py-2.5 text-sm font-extrabold text-[#7CE7FF] transition hover:bg-[#00C2E8]/10 active:scale-95 disabled:opacity-50"
        >
          {copied ? "✅ Copied!" : "📋 Copy invite link"}
        </button>
      </div>

      {/* players */}
      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-[#0B2537]/5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">
            Agents in the field{" "}
            <span className="ml-1 rounded-full bg-[#00C2E8]/15 px-3 py-1 text-sm font-black text-[#00789B]">
              {data.players.length}
            </span>
          </h2>
          {host && data.players.length > 2 && (
            <span className="text-xs font-semibold text-slate-400">tap ✕ to remove</span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                p.id === you.playerId ? "border-[#00C2E8] bg-[#00C2E8]/5" : "border-slate-100 bg-slate-50"
              }`}
            >
              <Avatar emoji={p.emoji} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">
                  {p.name}
                  {p.isHost && <span className="ml-1.5" title="Host">👑</span>}
                  {p.id === you.playerId && (
                    <span className="ml-1.5 rounded-full bg-[#00C2E8] px-2 py-0.5 text-[10px] font-black text-[#06283B]">
                      YOU
                    </span>
                  )}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {p.isHost ? "Host · runs the game" : "Agent"}
                </p>
              </div>
              {host && !p.isHost && (
                <button
                  onClick={() => onKick(p.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  title="Remove player"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* start */}
      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-lg shadow-[#0B2537]/5">
        {host ? (
          <>
            <button
              onClick={onStart}
              disabled={busy || !enough}
              className="w-full rounded-full bg-[#00C2E8] py-4 text-lg font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              {busy ? "Starting…" : "▶️ Start the mission"}
            </button>
            {!enough && (
              <p className="mt-3 text-sm font-semibold text-slate-400">
                Need at least {MIN_PLAYERS} agents — {MIN_PLAYERS - data.players.length} more to go.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            ⏳ Waiting for <strong className="text-[#0B2537]">{data.players.find((p) => p.isHost)?.name}</strong>{" "}
            (the host) to start the mission…
          </p>
        )}
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-500">
          <p className="font-extrabold text-slate-600">📜 The rules</p>
          <p className="mt-1">
            Everyone gets a secret location — <strong>except one spy</strong>. Ask questions out loud to
            figure out who&apos;s faking it. Then vote. If the spy is caught, they get one guess at the
            location: right = spy wins, wrong = team wins. Same location list for everyone, one round ≈ 5 min.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================= question round ================= */

export function QuestionView({
  data,
  revealed,
  onToggleReveal,
  onAdvance,
  busy,
}: {
  data: RoomState;
  revealed: boolean;
  onToggleReveal: () => void;
  onAdvance: () => void;
  busy: boolean;
}) {
  const you = data.you!;
  const isSpy = you.role === "spy";
  const loc = you.location;
  const questions = [0, 1, 2].map(
    (i) => SAMPLE_QUESTIONS[(data.room.round * 3 + i) % SAMPLE_QUESTIONS.length],
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-lg shadow-[#0B2537]/5">
        <span className="text-sm font-extrabold text-slate-500">
          Round {data.room.round} · {data.players.length} agents
        </span>
        <Countdown deadlineMs={data.room.deadlineMs} />
      </div>

      {/* your secret card */}
      <div className="mt-5">
        <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Your secret card — tap to reveal, tap to hide
        </p>
        <div
          className="flip-card mx-auto w-full max-w-md cursor-pointer select-none"
          onClick={onToggleReveal}
        >
          <div className={`flip-inner h-[330px] ${revealed ? "flipped" : ""}`}>
            {/* front */}
            <div className="flip-face absolute inset-0 grid place-items-center rounded-[2rem] bg-gradient-to-br from-[#0090B8] to-[#00C2E8] shadow-2xl shadow-[#00C2E8]/30">
              <div className="text-center text-white">
                <div className="floating text-6xl">🃏</div>
                <p className="mt-4 text-2xl font-black tracking-widest">TAP TO REVEAL</p>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  {revealed ? "Tap to hide your card" : "Keep your screen away from teammates!"}
                </p>
              </div>
            </div>
            {/* back */}
            <div className="flip-face flip-back absolute inset-0 overflow-hidden rounded-[2rem] shadow-2xl">
              {isSpy ? (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#3B1D5A] to-[#1F0F33] p-7 text-center text-white">
                  <div className="text-6xl">🕵️</div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-[#FF8A5C]">YOU ARE THE SPY</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">
                    Everyone else knows the place — you don&apos;t. Ask clever questions, blend in, and
                    don&apos;t get voted out. If you do, you get one guess to win it all.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#0A1E33] to-[#123A56] p-7 text-center text-white">
                  <div className="text-6xl">{loc?.emoji ?? "❓"}</div>
                  <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.3em] text-[#7CE7FF]">
                    Location
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight">{loc?.name ?? "?"}</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{loc?.desc}</p>
                  <p className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-[#7CE7FF]">
                    🤫 Describe it — never say its name
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* spy bluff list */}
      {isSpy && revealed && (
        <div className="mt-5 rounded-[2rem] border border-[#FF8A5C]/40 bg-[#FFF4EE] p-5">
          <p className="text-sm font-extrabold text-[#B4532A]">
            🎭 Possible locations (use these to bluff):
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(you.possibleLocations ?? []).map((l) => (
              <span
                key={l.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm"
              >
                {l.emoji} {l.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* suggested questions */}
      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-[#0B2537]/5">
        <p className="text-sm font-extrabold text-slate-600">💡 Stuck? Ask these:</p>
        <ul className="mt-2 space-y-1.5">
          {questions.map((q) => (
            <li key={q} className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
              “{q}”
            </li>
          ))}
        </ul>
      </div>

      {/* host advance */}
      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 text-center shadow-lg shadow-[#0B2537]/5">
        {you.isHost ? (
          <>
            <button
              onClick={onAdvance}
              disabled={busy}
              className="w-full rounded-full bg-[#00C2E8] py-4 text-lg font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              🗳️ When ready — start voting
            </button>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Everyone reveals a card and asks questions out loud first!
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            ⏳ The host starts the vote when the group is ready. Questions aren&apos;t done until you&apos;ve
            accused someone without proof 😏
          </p>
        )}
      </div>
    </div>
  );
}

/* ================= voting ================= */

export function VotingView({
  data,
  selected,
  onSelect,
  onVote,
  onAdvance,
  busy,
}: {
  data: RoomState;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onVote: (targetId: string | null) => void;
  onAdvance: () => void;
  busy: boolean;
}) {
  const you = data.you!;
  const stats = data.voteStats;
  const iVoted = stats?.votedPlayerIds.includes(you.playerId) ?? false;
  const target = selected ? data.players.find((p) => p.id === selected) : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-lg shadow-[#0B2537]/5">
        <span className="text-sm font-extrabold text-slate-500">
          Who&apos;s the spy? · {stats ? `${stats.cast}/${data.players.length} voted` : "…"}
        </span>
        <Countdown deadlineMs={data.room.deadlineMs} />
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-slate-500">
        {iVoted ? "✅ Vote locked in — you can still change it" : "Tap an agent to accuse them — you can't vote for yourself"}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.players.map((p) => {
          const isSelf = p.id === you.playerId;
          const count = stats?.counts[p.id] ?? 0;
          const isSel = selected === p.id;
          return (
            <button
              key={p.id}
              disabled={isSelf || busy}
              onClick={() => onSelect(isSel ? null : p.id)}
              className={`rounded-2xl border-2 p-4 text-left transition active:scale-95 ${
                isSel
                  ? "border-[#00C2E8] bg-[#00C2E8]/10 shadow-lg shadow-[#00C2E8]/20"
                  : "border-slate-200 bg-white hover:border-[#00C2E8]/50"
              } ${isSelf ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#DFF4FF] to-[#B9E8FF] text-3xl">
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">
                    {p.name} {isSelf && <span className="text-xs font-bold text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    {count > 0 ? (
                      <span className="text-[#00789B]">🔺 {count} accus{count === 1 ? "ation" : "ations"}</span>
                    ) : (
                      "No accusations yet"
                    )}
                  </p>
                </div>
                {isSel && <span className="text-2xl">🕵️‍♀️</span>}
              </div>
            </button>
          );
        })}
      </div>

      {target && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#00C2E8] bg-[#00C2E8]/10 p-4">
          <p className="text-sm font-extrabold text-[#0B2537]">
            Accuse {target.emoji} {target.name}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onSelect(null)}
              className="rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => onVote(target.id)}
              disabled={busy}
              className="rounded-full bg-[#00C2E8] px-5 py-2 text-sm font-extrabold text-[#06283B] transition hover:brightness-110 active:scale-95"
            >
              🗳️ Accuse!
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-[#0B2537]/5">
        <button
          onClick={() => onVote(null)}
          disabled={busy}
          className="rounded-full border-2 border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-500 transition hover:border-slate-300 active:scale-95"
        >
          🤷 No idea — abstain
        </button>
        {you.isHost ? (
          <button
            onClick={onAdvance}
            disabled={busy}
            className="rounded-full bg-[#FF8A5C] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-[#FF8A5C]/30 transition hover:brightness-110 active:scale-95"
          >
            {stats && stats.cast > 0 ? "🕵️ Reveal the results" : "Skip to results"}
          </button>
        ) : (
          <span className="text-xs font-bold text-slate-400">host reveals when everyone&apos;s voted</span>
        )}
      </div>
    </div>
  );
}

/* ================= spy guess ================= */

export function SpyGuessView({
  data,
  guessId,
  onSelect,
  onGuess,
  busy,
}: {
  data: RoomState;
  guessId: number | null;
  onSelect: (id: number) => void;
  onGuess: () => void;
  busy: boolean;
}) {
  const you = data.you!;
  const isSpy = you.role === "spy";

  if (!isSpy) {
    return (
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="rounded-[2rem] bg-[#0A1E33] p-10 text-white shadow-2xl shadow-[#0A1E33]/30">
          <div className="text-6xl">
            <span className="inline-block animate-pulse">🕵️</span>
          </div>
          <h2 className="mt-4 text-2xl font-black">The spy got caught!</h2>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Now they&apos;re sweating and guessing the location… everyone hold your breath.
          </p>
          <div className="mt-5 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#00C2E8]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
        {data.votes && data.votes.length > 0 && (
          <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 text-left shadow-lg shadow-[#0B2537]/5">
            <p className="mb-2 text-sm font-extrabold text-slate-600">📋 The votes</p>
            <VoteList votes={data.votes} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-[2rem] bg-gradient-to-br from-[#3B1D5A] to-[#1F0F33] p-7 text-center text-white shadow-2xl">
        <p className="text-4xl">🕵️🫣</p>
        <h2 className="mt-2 text-2xl font-black text-[#FF8A5C]">You got caught, agent…</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-white/70">
          Last chance to win: name the location. One guess, no pressure (okay, all the pressure).
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LOCATIONS.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`rounded-2xl border-2 p-3 text-left transition active:scale-95 ${
              guessId === l.id
                ? "border-[#00C2E8] bg-[#00C2E8]/15 shadow-lg shadow-[#00C2E8]/20"
                : "border-slate-200 bg-white hover:border-[#00C2E8]/50"
            }`}
          >
            <span className="text-2xl">{l.emoji}</span>
            <p className="mt-1 text-xs font-extrabold leading-tight text-slate-700">{l.name}</p>
          </button>
        ))}
      </div>
      <button
        onClick={onGuess}
        disabled={busy || guessId == null}
        className="mt-5 w-full rounded-full bg-[#FF8A5C] py-4 text-lg font-extrabold text-white shadow-xl shadow-[#FF8A5C]/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        {busy ? "Locking in…" : "🎯 That's my final guess"}
      </button>
    </div>
  );
}

/* ================= round end ================= */

export function VoteList({ votes }: { votes: NonNullable<RoomState["votes"]> }) {
  return (
    <ul className="space-y-1.5">
      {votes.map((v, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600"
        >
          <span>
            {v.voterEmoji} {v.voterName}
          </span>
          <span className="text-slate-400">→</span>
          <span className="text-right">
            {v.targetName ? `${v.targetEmoji} ${v.targetName}` : "🤷 abstained"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RoundEndView({
  data,
  onNext,
  onLobby,
  busy,
}: {
  data: RoomState;
  onNext: () => void;
  onLobby: () => void;
  busy: boolean;
}) {
  const you = data.you!;
  const r = data.result!;
  const spy = data.players.find((p) => p.id === data.room.spyId);
  const spyWon = r.spyWon;

  const title = spyWon ? "THE SPY WINS" : "TEAM WINS";
  const sub = spyWon
    ? r.spyCaught
      ? `${spy?.name ?? "The spy"} was caught… but guessed ${r.guessEmoji} ${r.guessName} correctly. Iconic.`
      : r.votedOutName
        ? `The group voted for ${r.votedOutName} — innocent! The spy slips away.`
        : "The vote was a shambles — the spy slips away untouched."
    : `The group caught ${spy?.name ?? "the spy"}, who guessed ${r.guessEmoji} ${r.guessName}. So close!`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Confetti />
      <div
        className={`rounded-[2.5rem] p-8 text-center text-white shadow-2xl ${
          spyWon
            ? "bg-gradient-to-br from-[#3B1D5A] to-[#1F0F33] shadow-[#3B1D5A]/30"
            : "bg-gradient-to-br from-[#0090B8] to-[#00C2E8] shadow-[#00C2E8]/40"
        }`}
      >
        <div className="text-6xl">{spyWon ? "🕵️" : "🎉"}</div>
        <h2 className="mt-3 text-4xl font-black tracking-tight">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed opacity-90">{sub}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          <span className="rounded-full bg-white/15 px-4 py-1.5">
            📍 Location: {r.locationEmoji} {r.locationName}
          </span>
          {spy && (
            <span className="rounded-full bg-white/15 px-4 py-1.5">
              🕵️ Spy: {spy.emoji} {spy.name}
            </span>
          )}
          {r.guessName && (
            <span className="rounded-full bg-white/15 px-4 py-1.5">
              🎯 Spy guessed: {r.guessEmoji} {r.guessName}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-[#0B2537]/5">
          <p className="mb-3 text-sm font-extrabold text-slate-600">📋 Who voted for whom</p>
          <VoteList votes={data.votes ?? []} />
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-[#0B2537]/5">
          <p className="mb-3 text-sm font-extrabold text-slate-600">🎭 Roles</p>
          <ul className="space-y-1.5">
            {data.players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-bold ${
                  p.id === data.room.spyId ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                }`}
              >
                <span>
                  {p.emoji} {p.name}
                  {p.id === data.room.spyId ? " 🕵️ SPY" : " 🙂 citizen"}
                </span>
                {p.id === you.playerId && <span className="text-[10px] font-black text-[#00789B]">YOU</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 text-center shadow-lg shadow-[#0B2537]/5">
        {you.isHost ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onNext}
              disabled={busy}
              className="flex-1 rounded-full bg-[#00C2E8] py-4 text-lg font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              🔄 Next round
            </button>
            <button
              onClick={onLobby}
              disabled={busy}
              className="rounded-full border-2 border-slate-200 px-6 py-4 font-extrabold text-slate-500 transition hover:border-slate-300 active:scale-95 disabled:opacity-40"
            >
              🛎️ Back to lobby
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            ⏳ Waiting for <strong>{data.players.find((p) => p.isHost)?.name}</strong> to start round{" "}
            {data.room.round + 1}…
          </p>
        )}
      </div>
    </div>
  );
}

/* ================= misc ================= */

export function RoomGone({ code }: { code: string }) {
  return (
    <div className="mx-auto w-full max-w-md pt-20 text-center">
      <div className="rounded-[2rem] bg-white p-10 shadow-2xl shadow-[#0A1E33]/15">
        <div className="text-6xl">🫥</div>
        <h2 className="mt-4 text-2xl font-black">Room {code} is gone</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Everyone left, so the room was dissolved. Create a fresh one!
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-[#00C2E8] px-8 py-3.5 font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/30 transition hover:brightness-110"
        >
          🏠 Back to base
        </a>
      </div>
    </div>
  );
}


