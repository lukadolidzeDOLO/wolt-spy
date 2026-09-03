"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EMOJIS, LOCATIONS, MIN_PLAYERS } from "@/lib/game";

export default function Landing() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🕵️");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spy-name");
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  async function createRoom() {
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Pick a name first — the host needs one too 😄");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, emoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create room");
      localStorage.setItem("spy-token", data.token);
      localStorage.setItem("spy-name", trimmed);
      router.push(`/room/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room");
      setBusy(null);
    }
  }

  function joinRoom() {
    const c = code.trim().toUpperCase();
    if (c.length < 5) {
      setError("Enter the 5-character room code");
      return;
    }
    localStorage.setItem("spy-name", name.trim() || "");
    router.push(`/room/${c}`);
  }

  return (
    <div className="min-h-screen bg-[#EFF6FB] text-[#0B2537]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#00C2E8] text-2xl shadow-lg shadow-[#00C2E8]/30">
            🛵
          </span>
          SPY AT WOLT
        </div>
        <span className="hidden rounded-full border border-[#00C2E8]/40 bg-white px-4 py-1.5 text-xs font-bold text-[#00789B] sm:block">
          Wolt Support Associates Edition 🕵️
        </span>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A1E33] px-6 py-12 text-white shadow-2xl shadow-[#0A1E33]/30 sm:px-12">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00C2E8]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-[#00789B]/30 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 top-6 text-4xl opacity-40 select-none">🎯</div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 text-3xl opacity-20 select-none">🕵️</div>

          <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#00C2E8]/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#7CE7FF]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#00C2E8]" />
                Play on the floor · between tickets
              </p>
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
                ONE OF YOU
                <br />
                IS A{" "}
                <span className="relative inline-block text-[#00C2E8]">
                  SPY
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 120 10" fill="none">
                    <path d="M2 7C30 2 90 2 118 7" stroke="#00C2E8" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300">
                The classic <strong className="text-white">spy party game</strong>, Wolt edition. Create a room,
                share the code, and find out who's the impostor — perfect for a coffee-break round with the team
                sitting right next to you.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={createRoom}
                  disabled={busy !== null}
                  className="rounded-full bg-[#00C2E8] px-8 py-4 text-base font-extrabold text-[#06283B] shadow-xl shadow-[#00C2E8]/25 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {busy === "create" ? "Creating room…" : "🎮 Create a room"}
                </button>
                <div className="flex items-center gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
                    onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                    placeholder="CODE"
                    className="w-32 rounded-full border-2 border-white/15 bg-white/10 px-4 py-3.5 text-center text-lg font-black tracking-[0.3em] text-white placeholder:text-white/30 focus:border-[#00C2E8] focus:outline-none"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={busy !== null}
                    className="rounded-full border-2 border-[#00C2E8]/60 px-6 py-3.5 text-base font-extrabold text-[#7CE7FF] transition hover:bg-[#00C2E8]/10 active:scale-95 disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
              {error && (
                <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-300">
                  ⚠️ {error}
                </p>
              )}
              <p className="mt-4 text-xs text-slate-400">
                {MIN_PLAYERS}+ players per room · one spy per round · the spy guesses at the end
              </p>
            </div>

            <div className="relative hidden md:block">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0D2740] shadow-2xl">
                <Image
                  src="/images/hero.png"
                  alt="Courier spy illustration"
                  width={720}
                  height={720}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
              <div className="absolute -left-6 top-6 animate-bounce rounded-2xl bg-white px-4 py-2 text-sm font-extrabold text-[#0B2537] shadow-xl">
                🤫 Don&apos;t show your card!
              </div>
              <div className="absolute -right-3 bottom-8 rounded-2xl bg-[#00C2E8] px-4 py-2 text-sm font-extrabold text-[#06283B] shadow-xl">
                Round 1 · 5:00 ⏱️
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Name + avatar strip */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="rounded-[2rem] border border-[#00C2E8]/25 bg-white p-6 shadow-xl shadow-[#0B2537]/5 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Your agent name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="e.g. Agent Pizza"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-lg font-bold text-[#0B2537] placeholder:text-slate-400 focus:border-[#00C2E8] focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-500">
                Your avatar
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition ${
                      emoji === e
                        ? "bg-[#00C2E8] shadow-lg shadow-[#00C2E8]/40 scale-110"
                        : "bg-slate-100 hover:bg-[#00C2E8]/20"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to play */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
          How the mission works
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          One round takes about 5 minutes — perfect between calls. 🎧
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              emoji: "🏠",
              color: "bg-[#00C2E8]",
              title: "Create & share",
              text: "Host creates a room and gets a 5-letter code. Everyone joins with a name and avatar — or just yell the code across the floor.",
            },
            {
              emoji: "🕵️",
              color: "bg-[#FF8A5C]",
              title: "One of you is the spy",
              text: "Everyone gets a secret location — except the spy. Tap to reveal your card, ask crafty questions out loud, and don't give it away.",
            },
            {
              emoji: "🗳️",
              color: "bg-[#7C5CFF]",
              title: "Vote & reveal",
              text: "Vote for the impostor. If the spy gets caught, they get one shot at guessing the location. Correct guess = spy wins. Otherwise, the team wins.",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-[#0B2537]/5 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-2xl ${s.color} bg-opacity-10 text-3xl shadow-inner`}
              >
                {s.emoji}
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Location teaser */}
        <div className="mt-12 rounded-[2rem] bg-[#0A1E33] p-8 text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#7CE7FF]">
            Secret locations include
          </p>
          <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
            {LOCATIONS.slice(0, 14).map((l) => (
              <span
                key={l.id}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-white/80"
              >
                {l.emoji} {l.name}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-[#00C2E8]/50 px-4 py-1.5 text-sm font-bold text-[#00C2E8]">
              + {LOCATIONS.length - 14} more…
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        Made with 💙 by a support associate, for support associates.{" "}
        <span className="font-bold text-[#00789B]">No couriers were harmed.</span>
      </footer>
    </div>
  );
}
