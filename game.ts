export type Phase = "lobby" | "question" | "voting" | "spy-guess" | "round-end";

export type GameLocation = { id: number; name: string; emoji: string; desc: string };

export const LOCATIONS: GameLocation[] = [
  { id: 1, name: "Support Office", emoji: "🏢", desc: "Your own floor. Right where you're standing. Meta." },
  { id: 2, name: "Wolt HQ", emoji: "🇫🇮", desc: "The mothership in Helsinki. Someone's hiding a blue hoodie." },
  { id: 3, name: "Courier Hub", emoji: "📦", desc: "Scooters, spare batteries, and a wall of blue Wolt bags." },
  { id: 4, name: "Dark Kitchen", emoji: "👨‍🍳", desc: "20 ghost restaurants, one kitchen, zero dining tables." },
  { id: 5, name: "Restaurant Kitchen", emoji: "🍳", desc: "Sizzling pans and a chef yelling 'order up!'" },
  { id: 6, name: "Supermarket", emoji: "🛒", desc: "Self-checkout beeps and someone's abandoned cart." },
  { id: 7, name: "Sauna", emoji: "🧖", desc: "Finnish classic. Someone is definitely sweating." },
  { id: 8, name: "Movie Theater", emoji: "🎬", desc: "Butter-popcorn smell, phones on silent, feet on seats." },
  { id: 9, name: "Library", emoji: "📚", desc: "Shhh. The librarian is watching you." },
  { id: 10, name: "Gym", emoji: "🏋️", desc: "Grunting, clanking weights, one guy who never wipes the machines." },
  { id: 11, name: "Hospital", emoji: "🏥", desc: "Stethoscopes, beeping monitors, questionable cafeteria jelly." },
  { id: 12, name: "School", emoji: "🎓", desc: "Chalk dust, school lunches, the kid who always raises a hand." },
  { id: 13, name: "Bank", emoji: "🏦", desc: "Vault doors, suits, and a very serious queue." },
  { id: 14, name: "Airport", emoji: "✈️", desc: "Overpriced coffee and people sprinting to gate B42." },
  { id: 15, name: "Zoo", emoji: "🦁", desc: "Monkeys flinging things. Do NOT feed the animals." },
  { id: 16, name: "Beach", emoji: "🏖️", desc: "Sand in everything and seagulls stealing fries." },
  { id: 17, name: "Space Station", emoji: "🚀", desc: "Everything floats, even your coffee." },
  { id: 18, name: "Wedding", emoji: "💒", desc: "Champagne, crying uncles, and one very nervous best man." },
  { id: 19, name: "Casino", emoji: "🎰", desc: "Lights, dings, and people losing rent money gracefully." },
  { id: 20, name: "Police Station", emoji: "🚓", desc: "Donuts in the break room. Don't ask." },
  { id: 21, name: "Submarine", emoji: "🐋", desc: "Tight corridors, periscope turns, the captain's bad jokes." },
  { id: 22, name: "Farm", emoji: "🐄", desc: "Mud, tractors, and a rooster with zero respect for sleep." },
  { id: 23, name: "Concert", emoji: "🎤", desc: "Ears ringing, phone-light waves, someone crowd-surfing." },
  { id: 24, name: "Pirate Ship", emoji: "🏴‍☠️", desc: "Arrr. The parrot knows every secret." },
  { id: 25, name: "Dark Ops Room", emoji: "🕶️", desc: "A secret Wolt floor that doesn't officially exist." },
  { id: 26, name: "Cloud Server Room", emoji: "☁️", desc: "Cold air, blinking lights, the hum of a million orders." },
];

export function getLocation(id: number | null | undefined): GameLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export type RoundResult = {
  spyWon: boolean;
  spyCaught: boolean;
  guessName: string | null;
  guessEmoji: string | null;
  locationName: string;
  locationEmoji: string;
  votedOutName: string | null;
};

export const QUESTION_SECONDS = 300;
export const VOTING_SECONDS = 90;
export const MIN_PLAYERS = 3;

export const PHASE_META: Record<Phase, { label: string; emoji: string; hint: string }> = {
  lobby: { label: "Lobby", emoji: "🛎️", hint: "Waiting for players" },
  question: { label: "Question round", emoji: "🗣️", hint: "Ask questions out loud. Don't say the place!" },
  voting: { label: "Voting", emoji: "🗳️", hint: "Who is the spy?" },
  "spy-guess": { label: "Spy's guess", emoji: "🕵️", hint: "The spy got caught. Time to guess!" },
  "round-end": { label: "Round over", emoji: "🏁", hint: "Round complete" },
};

export const EMOJIS = [
  "🕵️", "🚀", "🦊", "🐼", "🦄", "🍕", "🍔", "🍟",
  "🥤", "🍩", "🍉", "🎧", "🎮", "⚽", "🏀", "🎲",
  "🎯", "😎", "🤠", "👻", "🤖", "🐸", "🦉", "🐙",
];

export const SAMPLE_QUESTIONS = [
  "Would I find an e-scooter here?",
  "Could you take a nap here?",
  "Is there a queue at 2 PM?",
  "Would someone wear a uniform?",
  "Is there food nearby?",
  "Would it be loud here?",
  "Could you get a discount here?",
  "Is the floor sticky?",
  "Would I need a ticket to get in?",
  "Is it indoors or outdoors?",
];

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function genRoomCode(len = 5): string {
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
  return out;
}

export function genDeadlineMs(phase: Phase): number {
  const seconds = phase === "voting" ? VOTING_SECONDS : QUESTION_SECONDS;
  return Date.now() + seconds * 1000;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sanitizeName(raw: unknown): string {
  return String(raw ?? "").trim().slice(0, 20);
}

/* ---------- shared client/server types for room state ---------- */

export type PublicPlayer = { id: string; name: string; emoji: string; isHost: boolean };
export type PublicLocation = { id: number; name: string; emoji: string; desc: string };
export type PossibleLocation = { id: number; name: string; emoji: string };
export type VoteStat = {
  counts: Record<string, number>;
  abstain: number;
  cast: number;
  votedPlayerIds: string[];
};
export type VoteRowOut = {
  voterName: string;
  voterEmoji: string;
  targetName: string | null;
  targetEmoji: string | null;
};
export type YouState = {
  playerId: string;
  name: string;
  emoji: string;
  isHost: boolean;
  role: "spy" | "citizen" | null;
  location: PublicLocation | null;
  possibleLocations: PossibleLocation[] | null;
};
export type RoomState = {
  room: {
    code: string;
    phase: Phase;
    round: number;
    deadlineMs: number | null;
    spyId: string | null;
  };
  players: PublicPlayer[];
  voteStats: VoteStat | null;
  votes: VoteRowOut[] | null;
  result: RoundResult | null;
  you: YouState | null;
};
