import { MatchState, MatchStatus } from '../domain/MatchState';
import { MatchEvent } from './MatchEvents';

export class MatchStateMachine {
  reduce(currentState: MatchState, event: MatchEvent): MatchState {
    switch (event.type) {
      case 'START_MATCH':
        return { status: MatchStatus.IN_GAME, elapsedSeconds: 0 };
      case 'PAUSE_MATCH':
        if (currentState.status !== MatchStatus.IN_GAME) {
          return currentState;
        }
        return { ...currentState, status: MatchStatus.PAUSED };
      case 'RESUME_MATCH':
        if (currentState.status !== MatchStatus.PAUSED) {
          return currentState;
        }
        return { ...currentState, status: MatchStatus.IN_GAME };
      case 'FINISH_MATCH':
        return { ...currentState, status: MatchStatus.FINISHED };
      case 'TICK':
        if (currentState.status !== MatchStatus.IN_GAME) {
          return currentState;
        }
        return { ...currentState, elapsedSeconds: currentState.elapsedSeconds + event.seconds };
      default:
        return currentState;
    }
  }
}
