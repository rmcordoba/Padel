import { PadelScoringEngine } from '../application/PadelScoringEngine';
import { GameSubState, MatchLifecycleStatus, ScoringMode } from '../domain/PadelScoring';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// CLASSIC: deuce y ventaja
const classic = new PadelScoringEngine({ scoringMode: ScoringMode.CLASSIC, bestOf: 1 });
classic.dispatch({ type: 'StartMatch' });
classic.dispatch({ type: 'PointWonByA' });
classic.dispatch({ type: 'PointWonByA' });
classic.dispatch({ type: 'PointWonByA' });
classic.dispatch({ type: 'PointWonByB' });
classic.dispatch({ type: 'PointWonByB' });
let snap = classic.dispatch({ type: 'PointWonByB' });
assert(snap.gameSubState === GameSubState.DEUCE, 'CLASSIC debe entrar en DEUCE en 40-40');
snap = classic.dispatch({ type: 'PointWonByA' });
assert(snap.gameSubState === GameSubState.ADVANTAGE_A, 'CLASSIC debe dar ventaja a A');

// GOLDEN_POINT: cierre directo en 40-40 + 1
const golden = new PadelScoringEngine({ scoringMode: ScoringMode.GOLDEN_POINT, bestOf: 1 });
golden.dispatch({ type: 'StartMatch' });
for (let i = 0; i < 3; i += 1) {
  golden.dispatch({ type: 'PointWonByA' });
  golden.dispatch({ type: 'PointWonByB' });
}
snap = golden.getSnapshot();
assert(snap.gameSubState === GameSubState.GOLDEN_POINT, 'GOLDEN_POINT debe mostrar punto decisivo en deuce');
snap = golden.dispatch({ type: 'PointWonByA' });
assert(snap.gamesInSetA === 1, 'GOLDEN_POINT debe cerrar el game con un único punto tras deuce');

// STAR_POINT con advantagesBeforeStarPoint=2
const star = new PadelScoringEngine({ scoringMode: ScoringMode.STAR_POINT, bestOf: 1, advantagesBeforeStarPoint: 2 });
star.dispatch({ type: 'StartMatch' });
for (let i = 0; i < 3; i += 1) {
  star.dispatch({ type: 'PointWonByA' });
  star.dispatch({ type: 'PointWonByB' });
}
star.dispatch({ type: 'PointWonByA' }); // ventaja #1
star.dispatch({ type: 'PointWonByB' }); // deuce
star.dispatch({ type: 'PointWonByB' }); // ventaja #2
snap = star.dispatch({ type: 'PointWonByA' }); // deuce con star
assert(snap.gameSubState === GameSubState.STAR_POINT, 'STAR_POINT debe activarse después de 2 ventajas');
snap = star.dispatch({ type: 'PointWonByA' });
assert(snap.gamesInSetA === 1, 'STAR_POINT debe cerrar game con punto decisivo');

// Tie-break y cierre automático de partido
const tieBreak = new PadelScoringEngine({ scoringMode: ScoringMode.CLASSIC, bestOf: 1 });
tieBreak.dispatch({ type: 'StartMatch' });
tieBreak.dispatch({ type: 'EditScore', patch: { gamesInSetA: 6, gamesInSetB: 6, pointsA: 6, pointsB: 6 } });
snap = tieBreak.dispatch({ type: 'PointWonByA' });
assert(snap.gameSubState === GameSubState.TIE_BREAK, 'En 6-6 se debe jugar TIE_BREAK');
snap = tieBreak.dispatch({ type: 'PointWonByA' });
assert(snap.status === MatchLifecycleStatus.FINISHED, 'best-of-1 debe finalizar al cerrar set');
assert(snap.winner === 'A', 'Se debe persistir el ganador del partido');

// Pause/Resume/Undo
const controls = new PadelScoringEngine();
controls.dispatch({ type: 'StartMatch' });
controls.dispatch({ type: 'Pause' });
snap = controls.getSnapshot();
assert(snap.status === MatchLifecycleStatus.PAUSED, 'Pause debe pasar a PAUSED');
controls.dispatch({ type: 'Resume' });
controls.dispatch({ type: 'PointWonByA' });
controls.dispatch({ type: 'Undo' });
snap = controls.getSnapshot();
assert(snap.pointsA === 0, 'Undo debe revertir la última transición');
