export type MatchEvent =
  | { type: 'START_MATCH' }
  | { type: 'PAUSE_MATCH' }
  | { type: 'RESUME_MATCH' }
  | { type: 'FINISH_MATCH' }
  | { type: 'TICK'; seconds: number };
