import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { players, rooms, votes } from "@/db/schema";
import {
  EMOJIS,
  genDeadlineMs,
  getLocation,
  LOCATIONS,
  pickRandom,
  sanitizeName,
  type Phase,
  type RoundResult,
} from "@/lib/game";

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function getRoom(code: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!room) throw new ApiError("Room not found", 404);
  return room;
}

async function getRoomPlayers(roomId: string) {
  return db.select().from(players).where(eq(players.roomId, roomId)).orderBy(players.joinedAt);
}

async function requirePlayer(roomId: string, token: unknown) {
  if (typeof token !== "string" || !token) throw new ApiError("Not in this room", 401);
  const [p] = await db
    .select()
    .from(players)
    .where(and(eq(players.roomId, roomId), eq(players.token, token)))
    .limit(1);
  if (!p) throw new ApiError("You're not in this room", 401);
  return p;
}

async function requireHost(roomId: string, token: unknown) {
  const p = await requirePlayer(roomId, token);
  if (!p.isHost) throw new ApiError("Only the host can do that", 403);
  return p;
}

async function beginRound(roomId: string, round: number) {
  const roomPlayers = await getRoomPlayers(roomId);
  const spy = pickRandom(roomPlayers);
  const location = pickRandom(LOCATIONS);
  await db
    .update(rooms)
    .set({
      phase: "question",
      round,
      spyPlayerId: spy.id,
      locationId: location.id,
      spyGuessId: null,
      result: null,
      phaseDeadlineMs: genDeadlineMs("question"),
    })
    .where(eq(rooms.id, roomId));
}

async function finishVoting(roomId: string, round: number, spyPlayerId: string | null, locationId: number | null) {
  const voteRows = await db
    .select()
    .from(votes)
    .where(and(eq(votes.roomId, roomId), eq(votes.round, round)));
  const counts = new Map<string, number>();
  for (const v of voteRows) {
    if (v.targetPlayerId) counts.set(v.targetPlayerId, (counts.get(v.targetPlayerId) ?? 0) + 1);
  }
  const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
  const top = [...counts.entries()].filter(([, n]) => n === max).map(([id]) => id);
  const caught = max > 0 && !!spyPlayerId && top.includes(spyPlayerId);
  const loc = getLocation(locationId);

  if (caught) {
    await db
      .update(rooms)
      .set({ phase: "spy-guess", phaseDeadlineMs: null })
      .where(eq(rooms.id, roomId));
    return;
  }

  const roomPlayers = await getRoomPlayers(roomId);
  const votedOut = top.length === 1 ? roomPlayers.find((p) => p.id === top[0]) : null;
  const result: RoundResult = {
    spyWon: true,
    spyCaught: false,
    guessName: null,
    guessEmoji: null,
    locationName: loc?.name ?? "?",
    locationEmoji: loc?.emoji ?? "❓",
    votedOutName: votedOut?.name ?? null,
  };
  await db
    .update(rooms)
    .set({ phase: "round-end", phaseDeadlineMs: null, result })
    .where(eq(rooms.id, roomId));
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toUpperCase();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  try {
    const room = await getRoom(code);
    const action = String(body.action ?? "");

    switch (action) {
      case "join": {
        const name = sanitizeName(body.name);
        if (!name) throw new ApiError("Please enter a name");
        const emoji =
          typeof body.emoji === "string" && EMOJIS.includes(body.emoji) ? body.emoji : "🕵️";
        const token = typeof body.token === "string" && body.token ? body.token : crypto.randomUUID();
        await db
          .insert(players)
          .values({ roomId: room.id, token, name, emoji })
          .onConflictDoUpdate({
            target: [players.roomId, players.token],
            set: { name, emoji },
          });
        return NextResponse.json({ ok: true });
      }

      case "start": {
        await requireHost(room.id, body.token);
        if (room.phase !== "lobby") throw new ApiError("Round already started");
        const roomPlayers = await getRoomPlayers(room.id);
        if (roomPlayers.length < 3) throw new ApiError("Need at least 3 players to start");
        await beginRound(room.id, 1);
        return NextResponse.json({ ok: true });
      }

      case "advance": {
        await requireHost(room.id, body.token);
        if (room.phase === "question") {
          await db
            .update(rooms)
            .set({ phase: "voting", phaseDeadlineMs: genDeadlineMs("voting") })
            .where(eq(rooms.id, room.id));
          return NextResponse.json({ ok: true });
        }
        if (room.phase === "voting") {
          await finishVoting(room.id, room.round, room.spyPlayerId, room.locationId);
          return NextResponse.json({ ok: true });
        }
        throw new ApiError("Nothing to advance right now");
      }

      case "vote": {
        const you = await requirePlayer(room.id, body.token);
        if (room.phase !== "voting") throw new ApiError("Voting is not open");
        const targetId = body.targetId === null || body.targetId === undefined ? null : String(body.targetId);
        if (targetId) {
          if (targetId === you.id) throw new ApiError("Nice try — you can't vote for yourself");
          const roomPlayers = await getRoomPlayers(room.id);
          if (!roomPlayers.some((p) => p.id === targetId)) throw new ApiError("Unknown player");
        }
        await db
          .insert(votes)
          .values({ roomId: room.id, round: room.round, voterToken: you.token, targetPlayerId: targetId })
          .onConflictDoUpdate({
            target: [votes.roomId, votes.round, votes.voterToken],
            set: { targetPlayerId: targetId },
          });
        return NextResponse.json({ ok: true });
      }

      case "spy-guess": {
        const you = await requirePlayer(room.id, body.token);
        if (room.phase !== "spy-guess") throw new ApiError("Not the guess round");
        if (!room.spyPlayerId || you.id !== room.spyPlayerId) throw new ApiError("Only the spy guesses", 403);
        const guessId = Number(body.guessId);
        const loc = getLocation(guessId);
        if (!loc) throw new ApiError("Invalid location");
        const guessLoc = getLocation(room.locationId);
        const result: RoundResult = {
          spyWon: loc.id === room.locationId,
          spyCaught: true,
          guessName: loc.name,
          guessEmoji: loc.emoji,
          locationName: guessLoc?.name ?? "?",
          locationEmoji: guessLoc?.emoji ?? "❓",
          votedOutName: null,
        };
        await db
          .update(rooms)
          .set({ phase: "round-end", phaseDeadlineMs: null, spyGuessId: loc.id, result })
          .where(eq(rooms.id, room.id));
        return NextResponse.json({ ok: true });
      }

      case "next": {
        await requireHost(room.id, body.token);
        if (room.phase !== "round-end") throw new ApiError("Round is not over");
        await beginRound(room.id, room.round + 1);
        return NextResponse.json({ ok: true });
      }

      case "to-lobby": {
        await requireHost(room.id, body.token);
        await db
          .update(rooms)
          .set({
            phase: "lobby",
            round: 0,
            spyPlayerId: null,
            locationId: null,
            spyGuessId: null,
            result: null,
            phaseDeadlineMs: null,
          })
          .where(eq(rooms.id, room.id));
        return NextResponse.json({ ok: true });
      }

      case "kick": {
        await requireHost(room.id, body.token);
        const targetId = String(body.targetPlayerId ?? "");
        const roomPlayers = await getRoomPlayers(room.id);
        const target = roomPlayers.find((p) => p.id === targetId);
        if (!target) throw new ApiError("Unknown player");
        if (target.isHost) throw new ApiError("You can't kick yourself");
        if (target.id === room.spyPlayerId && room.phase !== "lobby" && room.phase !== "round-end") {
          throw new ApiError("Can't kick the spy mid-round 😅");
        }
        await db
          .delete(votes)
          .where(or(eq(votes.voterToken, target.token), eq(votes.targetPlayerId, target.id)));
        await db.delete(players).where(eq(players.id, target.id));
        if (room.phase === "round-end" && target.id === room.spyPlayerId) {
          await db
            .update(rooms)
            .set({ phase: "spy-guess", phaseDeadlineMs: null })
            .where(eq(rooms.id, room.id));
        }
        return NextResponse.json({ ok: true });
      }

      case "leave": {
        const you = await requirePlayer(room.id, body.token);
        await db
          .delete(votes)
          .where(or(eq(votes.voterToken, you.token), eq(votes.targetPlayerId, you.id)));
        await db.delete(players).where(eq(players.id, you.id));
        const remaining = await getRoomPlayers(room.id);
        if (remaining.length === 0) {
          await db.delete(rooms).where(eq(rooms.id, room.id));
        } else if (you.isHost) {
          await db
            .update(players)
            .set({ isHost: true })
            .where(eq(players.id, remaining[0].id));
        }
        return NextResponse.json({ ok: true });
      }

      default:
        throw new ApiError("Unknown action");
    }
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("action error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export type { Phase };
