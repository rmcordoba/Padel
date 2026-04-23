export enum MatchLifecycleStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED'
}

export enum GameSubState {
  NORMAL = 'NORMAL',
  DEUCE = 'DEUCE',
  ADVANTAGE_A = 'ADVANTAGE_A',
  ADVANTAGE_B = 'ADVANTAGE_B',
  GOLDEN_POINT = 'GOLDEN_POINT',
  STAR_POINT = 'STAR_POINT',
  TIE_BREAK = 'TIE_BREAK'
}

export enum ScoringMode {
  CLASSIC = 'CLASSIC',
  GOLDEN_POINT = 'GOLDEN_POINT',
  STAR_POINT = 'STAR_POINT'
}

export interface MatchConfig {
  bestOf: 1 | 3 | 5;
  scoringMode: ScoringMode;
  advantagesBeforeStarPoint: number;
}

export interface MatchSnapshot {
  status: MatchLifecycleStatus;
  gameSubState: GameSubState;
  scoringMode: ScoringMode;
  bestOf: 1 | 3 | 5;
  setsWonA: number;
  setsWonB: number;
  gamesInSetA: number;
  gamesInSetB: number;
  pointsA: number;
  pointsB: number;
  displayPointsA: string;
  displayPointsB: string;
  advantagesUsedInCurrentGame: number;
  isTieBreak: boolean;
  winner: 'A' | 'B' | null;
}
