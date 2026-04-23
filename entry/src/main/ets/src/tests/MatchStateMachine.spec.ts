import { MatchStateMachine } from '../application/MatchStateMachine';
import { MatchStatus } from '../domain/MatchState';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const machine = new MatchStateMachine();
const initial = machine.createInitialState('match-test-1', undefined, '2026-04-23T10:00:00.000Z');
assert(initial.metadata.schemaVersion === 1, 'Initial state must include schemaVersion=1');

const started = machine.reduce(initial, { type: 'START_MATCH' }, '2026-04-23T10:00:05.000Z');
assert(started.status === MatchStatus.IN_GAME, 'START_MATCH should move to IN_GAME');

const ticked = machine.reduce(started, { type: 'TICK', seconds: 5 }, '2026-04-23T10:00:10.000Z');
assert(ticked.metadata.elapsedSeconds === 5, 'TICK should increase elapsedSeconds');

const paused = machine.reduce(ticked, { type: 'PAUSE_MATCH' }, '2026-04-23T10:00:12.000Z');
assert(paused.status === MatchStatus.PAUSED, 'PAUSE_MATCH should move to PAUSED');

const resumed = machine.reduce(paused, { type: 'RESUME_MATCH' }, '2026-04-23T10:00:14.000Z');
assert(resumed.status === MatchStatus.IN_GAME, 'RESUME_MATCH should move to IN_GAME');

const finished = machine.reduce(resumed, { type: 'FINISH_MATCH' }, '2026-04-23T10:00:20.000Z');
assert(finished.status === MatchStatus.FINISHED, 'FINISH_MATCH should move to FINISHED');
assert(finished.metadata.durationSeconds === finished.metadata.elapsedSeconds, 'Duration should be copied from elapsed seconds');

assert(finished.eventHistory.length === 5, 'History should append immutable events for replay/undo');
assert(finished.eventHistory[0].payload.type === 'START_MATCH', 'History should preserve event payloads in order');
assert(finished.eventHistory[4].payload.type === 'FINISH_MATCH', 'History should include the terminal event');

const replayed = finished.eventHistory.reduce(
  (state, event, idx) => machine.reduce(state, event.payload, `2026-04-23T11:00:${String(idx).padStart(2, '0')}.000Z`),
  machine.createInitialState('match-replay', undefined, '2026-04-23T11:00:00.000Z')
);

assert(replayed.status === MatchStatus.FINISHED, 'Replaying eventHistory should reconstruct final status');
assert(replayed.metadata.elapsedSeconds === finished.metadata.elapsedSeconds, 'Replaying eventHistory should reconstruct elapsed time');
