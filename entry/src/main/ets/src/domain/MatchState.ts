export enum MatchStatus {
  IDLE = 'IDLE',
  READY = 'READY',
  IN_GAME = 'IN_GAME',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED'
}

export interface MatchState {
  status: MatchStatus;
  elapsedSeconds: number;
}
