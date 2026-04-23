import { MatchStateMachine } from '../application/MatchStateMachine';
import { MatchStatus } from '../domain/MatchState';

const machine = new MatchStateMachine();
const initial = machine.createInitialState('match-test-1', undefined, '2026-04-23T10:00:00.000Z');

if (initial.metadata.schemaVersion !== 1) {
  throw new Error('Initial state must include schemaVersion=1');
}

const started = machine.reduce(initial, { type: 'START_MATCH' }, '2026-04-23T10:00:05.000Z');
if (started.status !== MatchStatus.IN_GAME) {
  throw new Error('START_MATCH should move to IN_GAME');
}

const ticked = machine.reduce(started, { type: 'TICK', seconds: 5 }, '2026-04-23T10:00:10.000Z');
if (ticked.metadata.elapsedSeconds !== 5) {
  throw new Error('TICK should increase elapsedSeconds');
}

const paused = machine.reduce(ticked, { type: 'PAUSE_MATCH' }, '2026-04-23T10:00:12.000Z');
if (paused.status !== MatchStatus.PAUSED) {
  throw new Error('PAUSE_MATCH should move to PAUSED');
}

if (paused.eventHistory.length !== 3) {
  throw new Error('History should append immutable events for replay/undo');
}

if (paused.eventHistory[0].payload.type !== 'START_MATCH') {
  throw new Error('History should preserve event payloads in order');
}
