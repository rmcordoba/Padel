import { PadelScoringEngine } from '../application/PadelScoringEngine';
import { MatchEvent } from '../application/MatchEvents';
import { GameSubState, MatchLifecycleStatus, ScoringMode } from '../domain/PadelScoring';
import { PreferencesStore } from '../infrastructure/persistence/PreferencesStore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class InMemoryPreferencesStore implements PreferencesStore {
  private readonly data = new Map<string, unknown>();

  async save<T>(key: string, value: T): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(value)) as unknown);
  }

  async read<T>(key: string): Promise<T | undefined> {
    const value = this.data.get(key);
    return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as T);
  }
}

function play(engine: PadelScoringEngine, events: MatchEvent[]): void {
  events.forEach((event) => {
    engine.dispatch(event);
  });
}

function gameBy(engine: PadelScoringEngine, team: 'A' | 'B'): void {
  play(engine, [
    { type: team === 'A' ? 'PointWonByA' : 'PointWonByB' },
    { type: team === 'A' ? 'PointWonByA' : 'PointWonByB' },
    { type: team === 'A' ? 'PointWonByA' : 'PointWonByB' },
    { type: team === 'A' ? 'PointWonByA' : 'PointWonByB' }
  ]);
}

(() => {
  const classic = new PadelScoringEngine();
  classic.dispatch({ type: 'StartMatch' });

  classic.dispatch({ type: 'PointWonByA' });
  let snap = classic.getSnapshot();
  assert(snap.displayPointsA === '15' && snap.displayPointsB === '0', 'Classic scoring should move to 15-0');

  classic.dispatch({ type: 'PointWonByA' });
  classic.dispatch({ type: 'PointWonByA' });
  snap = classic.getSnapshot();
  assert(snap.displayPointsA === '40' && snap.displayPointsB === '0', 'Classic scoring should move to 40-0');

  classic.dispatch({ type: 'PointWonByA' });
  snap = classic.getSnapshot();
  assert(snap.gamesInSetA === 1 && snap.pointsA === 0 && snap.pointsB === 0, 'Classic scoring should close a game at 4th point');
})();

(() => {
  const deuce = new PadelScoringEngine();
  deuce.dispatch({ type: 'StartMatch' });

  play(deuce, [
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' }
  ]);

  let snap = deuce.getSnapshot();
  assert(snap.gameSubState === GameSubState.DEUCE, 'Deuce should be detected at 40-40');

  deuce.dispatch({ type: 'PointWonByA' });
  snap = deuce.getSnapshot();
  assert(snap.gameSubState === GameSubState.ADVANTAGE_A, 'Advantage should move to team A after deuce');

  deuce.dispatch({ type: 'PointWonByB' });
  snap = deuce.getSnapshot();
  assert(snap.gameSubState === GameSubState.DEUCE, 'Lost advantage should return to deuce');

  deuce.dispatch({ type: 'PointWonByB' });
  deuce.dispatch({ type: 'PointWonByB' });
  snap = deuce.getSnapshot();
  assert(snap.gamesInSetB === 1, 'Two consecutive points after deuce should close game with advantage rules');
})();

(() => {
  const golden = new PadelScoringEngine({ scoringMode: ScoringMode.GOLDEN_POINT });
  golden.dispatch({ type: 'StartMatch' });

  play(golden, [
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' }
  ]);

  let snap = golden.getSnapshot();
  assert(snap.gameSubState === GameSubState.GOLDEN_POINT, 'Golden point should be active at deuce');

  golden.dispatch({ type: 'PointWonByA' });
  snap = golden.getSnapshot();
  assert(snap.gamesInSetA === 1 && snap.pointsA === 0, 'Golden point should close game in one decisive point');
})();

(() => {
  const star = new PadelScoringEngine({ scoringMode: ScoringMode.STAR_POINT, advantagesBeforeStarPoint: 1 });
  star.dispatch({ type: 'StartMatch' });

  play(star, [
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' }
  ]);

  star.dispatch({ type: 'PointWonByA' });
  star.dispatch({ type: 'PointWonByB' });

  let snap = star.getSnapshot();
  assert(snap.gameSubState === GameSubState.STAR_POINT, 'Star point should activate after configured number of advantages');

  star.dispatch({ type: 'PointWonByA' });
  snap = star.getSnapshot();
  assert(snap.gamesInSetA === 1, 'Star point should close game with one final point');
})();

(() => {
  const tieBreak = new PadelScoringEngine();
  tieBreak.dispatch({ type: 'StartMatch' });

  for (let i = 0; i < 6; i += 1) {
    gameBy(tieBreak, 'A');
    gameBy(tieBreak, 'B');
  }

  let snap = tieBreak.getSnapshot();
  assert(snap.isTieBreak && snap.gameSubState === GameSubState.TIE_BREAK, '6-6 should enter tie-break mode');

  play(tieBreak, [
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' }
  ]);

  snap = tieBreak.getSnapshot();
  assert(snap.setsWonA === 1 && snap.gamesInSetA === 0 && snap.gamesInSetB === 0, 'Tie-break should close the set at 7+ with 2-point lead');
})();

(() => {
  const undo = new PadelScoringEngine();
  undo.dispatch({ type: 'StartMatch' });
  undo.dispatch({ type: 'PointWonByA' });
  undo.dispatch({ type: 'PointWonByA' });

  undo.dispatch({ type: 'Undo' });
  let snap = undo.getSnapshot();
  assert(snap.pointsA === 1 && snap.displayPointsA === '15', 'Undo should roll back one event');

  undo.dispatch({ type: 'Undo' });
  undo.dispatch({ type: 'Undo' });
  snap = undo.getSnapshot();
  assert(snap.status === MatchLifecycleStatus.NOT_STARTED, 'Undo chain should reach initial snapshot without underflow');
})();

(() => {
  const closeMatch = new PadelScoringEngine({ bestOf: 1 });
  closeMatch.dispatch({ type: 'StartMatch' });

  for (let i = 0; i < 6; i += 1) {
    gameBy(closeMatch, 'A');
  }

  const snap = closeMatch.getSnapshot();
  assert(snap.status === MatchLifecycleStatus.FINISHED, 'Closing final set should finish the match');
  assert(snap.winner === 'A' && snap.setsWonA === 1, 'Winner should be assigned when match closes');
})();

(async () => {
  const persistence = new PadelScoringEngine({ scoringMode: ScoringMode.GOLDEN_POINT, bestOf: 1 });
  const eventHistory: MatchEvent[] = [
    { type: 'StartMatch', config: { scoringMode: ScoringMode.GOLDEN_POINT, bestOf: 1 } },
    { type: 'PointWonByA' },
    { type: 'PointWonByA' },
    { type: 'PointWonByB' },
    { type: 'PointWonByB' },
    { type: 'EditScore', patch: { gamesInSetA: 5, gamesInSetB: 5, pointsA: 3, pointsB: 3 } },
    { type: 'PointWonByA' }
  ];

  play(persistence, eventHistory);
  const finalSnapshot = persistence.getSnapshot();

  const store = new InMemoryPreferencesStore();
  await store.save('match:snapshot', finalSnapshot);
  await store.save('match:eventHistory', eventHistory);

  const restoredSnapshot = await store.read<typeof finalSnapshot>('match:snapshot');
  const restoredEvents = await store.read<MatchEvent[]>('match:eventHistory');

  assert(restoredSnapshot !== undefined, 'Persistence should restore saved snapshot');
  assert(restoredEvents !== undefined && restoredEvents.length === eventHistory.length, 'Persistence should restore all events');

  const replayEngine = new PadelScoringEngine({ scoringMode: ScoringMode.GOLDEN_POINT, bestOf: 1 });
  play(replayEngine, restoredEvents ?? []);
  const replayed = replayEngine.getSnapshot();

  assert(replayed.gamesInSetA === finalSnapshot.gamesInSetA && replayed.gamesInSetB === finalSnapshot.gamesInSetB, 'Replay from eventHistory should reconstruct game score');
  assert(replayed.displayPointsA === finalSnapshot.displayPointsA && replayed.displayPointsB === finalSnapshot.displayPointsB, 'Replay from eventHistory should reconstruct display points');
})();
