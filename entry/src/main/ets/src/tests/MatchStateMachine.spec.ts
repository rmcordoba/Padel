import { MatchStateMachine } from '../application/MatchStateMachine';
import { MatchStatus } from '../domain/MatchState';

const machine = new MatchStateMachine();

const initial = { status: MatchStatus.IDLE, elapsedSeconds: 0 };
const started = machine.reduce(initial, { type: 'START_MATCH' });
if (started.status !== MatchStatus.IN_GAME) {
  throw new Error('START_MATCH should move to IN_GAME');
}

const ticked = machine.reduce(started, { type: 'TICK', seconds: 5 });
if (ticked.elapsedSeconds !== 5) {
  throw new Error('TICK should increase elapsedSeconds');
}

const paused = machine.reduce(ticked, { type: 'PAUSE_MATCH' });
if (paused.status !== MatchStatus.PAUSED) {
  throw new Error('PAUSE_MATCH should move to PAUSED');
}
