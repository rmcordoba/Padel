export enum MatchFormat {
  BEST_OF_3 = 'BEST_OF_3',
  BEST_OF_5 = 'BEST_OF_5'
}

export enum GameMode {
  ADVANTAGE = 'ADVANTAGE',
  NO_ADVANTAGE = 'NO_ADVANTAGE'
}

export enum SpecialPointMode {
  NONE = 'NONE',
  GOLDEN_POINT = 'GOLDEN_POINT',
  SUPER_TIEBREAK = 'SUPER_TIEBREAK'
}

export enum MatchStatus {
  IDLE = 'IDLE',
  READY = 'READY',
  IN_GAME = 'IN_GAME',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED'
}

export enum Server {
  TEAM_A = 'TEAM_A',
  TEAM_B = 'TEAM_B'
}

export interface MatchConfig {
  teamAName: string;
  teamBName: string;
  format: MatchFormat;
  gameMode: GameMode;
  specialPointMode: SpecialPointMode;
  tieBreakEnabled: boolean;
  gamesPerSet: number;
}

export interface ScoreSnapshot {
  teamA: number;
  teamB: number;
}

export interface SpecialState {
  inTieBreak: boolean;
  isSetPoint: boolean;
  isMatchPoint: boolean;
}

export interface MatchMetadata {
  schemaVersion: number;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  elapsedSeconds: number;
  durationSeconds?: number;
}

export interface MatchEventPayload {
  type: string;
  [key: string]: string | number | boolean;
}

export interface MatchTimelineEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly payload: Readonly<MatchEventPayload>;
}

export interface MatchState {
  config: MatchConfig;
  status: MatchStatus;
  setsWon: ScoreSnapshot;
  currentSetGames: ScoreSnapshot;
  currentGamePoints: ScoreSnapshot;
  server: Server;
  specialState: SpecialState;
  metadata: MatchMetadata;
  eventHistory: ReadonlyArray<MatchTimelineEvent>;
}
