import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { RoundResult } from "@/lib/game";

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  phase: text("phase").notNull().default("lobby"),
  round: integer("round").notNull().default(0),
  locationId: integer("location_id"),
  spyPlayerId: uuid("spy_player_id"),
  spyGuessId: integer("spy_guess_id"),
  phaseDeadlineMs: bigint("phase_deadline_ms", { mode: "number" }),
  result: jsonb("result").$type<RoundResult | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("🕵️"),
    isHost: boolean("is_host").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("players_room_token_idx").on(t.roomId, t.token),
    index("players_room_idx").on(t.roomId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    voterToken: text("voter_token").notNull(),
    targetPlayerId: uuid("target_player_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_room_round_voter_idx").on(t.roomId, t.round, t.voterToken),
    index("votes_room_idx").on(t.roomId),
  ],
);

export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Vote = typeof votes.$inferSelect;
