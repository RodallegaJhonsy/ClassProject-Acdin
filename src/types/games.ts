// Type definitions for src/data/games.json.
// The JSON is assigned to `GamesData` (structural check, no casts / no `any`).

export interface SiteData {
  title: string;
  subtitle: string;
  intro: string;
  navLabel: string;
  footer: string;
}

export interface UiStrings {
  backToMenu: string;
  howToPlay: string;
  start: string;
  play: string;
  check: string;
  playAgain: string;
  next: string;
  seeResults: string;
  score: string;
  progress: string;
  best: string;
  notPlayed: string;
  correct: string;
  incorrect: string;
  questionOf: string;
  resultsTitle: string;
  yourScore: string;
  resultExcellent: string;
  resultGood: string;
  resultTry: string;
  gamesLabel: string;
  timeline: {
    dragHint: string;
    moveUp: string;
    moveDown: string;
    correctPosition: string;
    wrongPosition: string;
    reviewTitle: string;
  };
  differences: {
    found: string;
    misses: string;
    imageALabel: string;
    imageBLabel: string;
    giveUp: string;
    congrats: string;
    partial: string;
    placeholderNote: string;
  };
  submarine: {
    depth: string;
    time: string;
    goal: string;
    startDive: string;
    crashed: string;
    crashedText: string;
    restart: string;
    won: string;
    wonText: string;
    bestTime: string;
    up: string;
    down: string;
    left: string;
    right: string;
    disclaimer: string;
  };
  detective: {
    selectHint: string;
    selected: string;
    redFlag: string;
    notRedFlag: string;
    youWereRight: string;
    youWereWrong: string;
    youFlagged: string;
    youDidNotFlag: string;
  };
  halloween: {
    candies: string;
    lives: string;
    bonusMode: string;
    bonusTime: string;
    targetReached: string;
    targetReachedText: string;
    bonusCompletedText: string;
    candyDefeat: string;
    candyDefeatText: string;
    left: string;
    right: string;
    memoryMoves: string;
    memoryFlips: string;
    memoryTime: string;
    memoryPairs: string;
    memoryWon: string;
    memoryWonText: string;
    memoryTimeDefeat: string;
    memoryTimeDefeatText: string;
    memoryTimeAlmostText: string;
    memoryFlipsDefeat: string;
    memoryFlipsDefeatText: string;
    surviveDistance: string;
    surviveLives: string;
    surviveChase: string;
    surviveCrashed: string;
    surviveCrashedText: string;
    surviveWon: string;
    surviveWonText: string;
    up: string;
    down: string;
    disclaimer: string;
  };
}

/** Fields shared by every mini-game. */
export interface GameMeta {
  title: string;
  description: string;
  /** Icon key, mapped to a lucide icon in GameCard (falls back to a default). */
  icon: string;
  instructions: string[];
}

export interface TimelineEvent {
  id: string;
  label: string;
  year: string;
  explanation: string;
}

/** Events must be listed in the CORRECT chronological order in the JSON. */
export interface TimelineGameData extends GameMeta {
  events: TimelineEvent[];
}

export interface Difference {
  id: string;
  label: string;
  /** Center X in % of image width (0–100). */
  x: number;
  /** Center Y in % of image height (0–100). */
  y: number;
  /** Hit radius in % of image width. */
  radius: number;
}

export interface DifferencesGameData extends GameMeta {
  imageA: string;
  imageB: string;
  imageAlt: string;
  /** width / height of the images. */
  aspectRatio: number;
  differences: Difference[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Index of the correct option. */
  correct: number;
  explanation: string;
}

export interface QuizGameData extends GameMeta {
  questions: QuizQuestion[];
}

export interface Obstacle {
  /** "rock" | "jellyfish" (unknown types are drawn as rocks). */
  type: string;
  /** Horizontal center in % of the play area width. */
  x: number;
  /** Depth in meters. */
  depth: number;
  /** Diameter in logical pixels. */
  size: number;
  /** Optional horizontal oscillation in % of width. */
  moveRange?: number;
  /** Oscillation speed (radians per second). */
  speed?: number;
}

export interface SubmarineGameData extends GameMeta {
  targetDepth: number;
  /** Meters per second. */
  maxDescentSpeed: number;
  /** Logical pixels per second. */
  horizontalSpeed: number;
  obstacles: Obstacle[];
}

export interface DetectiveCase {
  id: string;
  tag: string;
  text: string;
  isRedFlag: boolean;
  explanation: string;
}

export interface DetectiveGameData extends GameMeta {
  cases: DetectiveCase[];
}

export interface SpawnConfig {
  initialIntervalMs: number;
  minIntervalMs: number;
  initialSpeed: number;
  maxSpeed: number;
}

export interface BasketConfig {
  widthPx: number;
  minWidthPx: number;
  shrinkEvery: number;
}

export interface CatchCandiesGameData extends GameMeta {
  targetCandies: number;
  lives: number;
  hardModeSeconds: number;
  candyTypes: string[];
  badTypes: string[];
  badSpawnChance: number;
  badSpawnChanceHard: number;
  basket: BasketConfig;
  spawnConfig: SpawnConfig;
}

export interface MemoryPair {
  id: string;
  icon: string;
  label: string;
}

export interface MemoryGameData extends GameMeta {
  gridCols: number;
  gridRows: number;
  timeLimitSeconds: number;
  maxFlips: number;
  flipBackDelayMs: number;
  pairs: MemoryPair[];
}

export interface NightObstacle {
  id: string;
  icon: string;
  speed: number;
  size: number;
  pattern: string;
}

export interface SurviveNightGameData extends GameMeta {
  targetDistance: number;
  lives: number;
  playerSpeed: number;
  chaseAfterMeters: number;
  pathNarrowEvery: number;
  pathNarrowPercent: number;
  minPathWidthPercent: number;
  obstacles: NightObstacle[];
}

export interface SectionBase {
  title: string;
  shortTitle: string;
  tagline: string;
  intro: string;
  cover: string;
  coverAlt: string;
}

export interface DianaSection extends SectionBase {
  games: {
    timeline: TimelineGameData;
    differences: DifferencesGameData;
    quiz: QuizGameData;
  };
}

export interface OceanGateSection extends SectionBase {
  games: {
    submarine: SubmarineGameData;
    timeline: TimelineGameData;
    detective: DetectiveGameData;
  };
}

export interface HalloweenSection extends SectionBase {
  games: {
    catchCandies: CatchCandiesGameData;
    memory: MemoryGameData;
    surviveNight: SurviveNightGameData;
  };
}

export interface GamesData {
  site: SiteData;
  ui: UiStrings;
  princessDiana: DianaSection;
  oceanGate: OceanGateSection;
  halloween: HalloweenSection;
}

export type SectionKey = "princessDiana" | "oceanGate" | "halloween";

export type ActiveGame =
  | { section: "princessDiana"; game: keyof DianaSection["games"] }
  | { section: "oceanGate"; game: keyof OceanGateSection["games"] }
  | { section: "halloween"; game: keyof HalloweenSection["games"] };

/** Callback every game calls once it reaches its results screen. */
export type FinishHandler = (score: number, total: number) => void;

