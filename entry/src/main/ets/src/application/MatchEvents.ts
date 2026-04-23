import { MatchConfig, MatchSnapshot } from '../domain/PadelScoring';

export type StartMatchEvent = { type: 'StartMatch'; config?: Partial<MatchConfig> };
export type PointWonByAEvent = { type: 'PointWonByA' };
export type PointWonByBEvent = { type: 'PointWonByB' };
export type UndoEvent = { type: 'Undo' };
export type PauseEvent = { type: 'Pause' };
export type ResumeEvent = { type: 'Resume' };
export type EditScoreEvent = {
  type: 'EditScore';
  patch: Partial<Pick<MatchSnapshot,
    | 'setsWonA'
    | 'setsWonB'
    | 'gamesInSetA'
    | 'gamesInSetB'
    | 'pointsA'
    | 'pointsB'
    | 'status'
    | 'winner'
    | 'advantagesUsedInCurrentGame'
  >>;
};

export type MatchEvent =
  | StartMatchEvent
  | PointWonByAEvent
  | PointWonByBEvent
  | UndoEvent
  | PauseEvent
  | ResumeEvent
  | EditScoreEvent;
