import { MatchEvent } from './MatchEvents';
import {
  GameSubState,
  MatchConfig,
  MatchLifecycleStatus,
  MatchSnapshot,
  ScoringMode
} from '../domain/PadelScoring';

const DEFAULT_CONFIG: MatchConfig = {
  bestOf: 3,
  scoringMode: ScoringMode.CLASSIC,
  advantagesBeforeStarPoint: 2
};

export class PadelScoringEngine {
  private config: MatchConfig;
  private history: MatchSnapshot[];

  constructor(initialConfig?: Partial<MatchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.history = [this.createInitialSnapshot()];
  }

  dispatch(event: MatchEvent): MatchSnapshot {
    if (event.type === 'Undo') {
      if (this.history.length > 1) {
        this.history.pop();
      }
      return this.getSnapshot();
    }

    const current = this.getSnapshot();
    let next = current;

    switch (event.type) {
      case 'StartMatch':
        this.config = { ...this.config, ...event.config };
        next = {
          ...this.createInitialSnapshot(),
          status: MatchLifecycleStatus.IN_PROGRESS,
          scoringMode: this.config.scoringMode,
          bestOf: this.config.bestOf,
          gameSubState: GameSubState.NORMAL
        };
        break;
      case 'Pause':
        if (current.status === MatchLifecycleStatus.IN_PROGRESS) {
          next = { ...current, status: MatchLifecycleStatus.PAUSED };
        }
        break;
      case 'Resume':
        if (current.status === MatchLifecycleStatus.PAUSED) {
          next = { ...current, status: MatchLifecycleStatus.IN_PROGRESS };
        }
        break;
      case 'EditScore':
        next = this.sanitizeSnapshot({ ...current, ...event.patch });
        break;
      case 'PointWonByA':
        next = this.applyPoint(current, 'A');
        break;
      case 'PointWonByB':
        next = this.applyPoint(current, 'B');
        break;
      default:
        next = current;
        break;
    }

    this.history.push(next);
    return next;
  }

  getSnapshot(): MatchSnapshot {
    return this.history[this.history.length - 1];
  }

  private applyPoint(current: MatchSnapshot, winner: 'A' | 'B'): MatchSnapshot {
    if (current.status !== MatchLifecycleStatus.IN_PROGRESS) {
      return current;
    }
    if (current.winner !== null) {
      return current;
    }

    let next = { ...current };

    if (next.gamesInSetA === 6 && next.gamesInSetB === 6) {
      next.isTieBreak = true;
      next.gameSubState = GameSubState.TIE_BREAK;
      if (winner === 'A') {
        next.pointsA += 1;
      } else {
        next.pointsB += 1;
      }

      if (Math.max(next.pointsA, next.pointsB) >= 7 && Math.abs(next.pointsA - next.pointsB) >= 2) {
        const setWinner = next.pointsA > next.pointsB ? 'A' : 'B';
        return this.closeSet(next, setWinner);
      }

      return this.sanitizeSnapshot(next);
    }

    if (winner === 'A') {
      next.pointsA += 1;
    } else {
      next.pointsB += 1;
    }

    if (
      this.config.scoringMode === ScoringMode.STAR_POINT &&
      current.pointsA >= 3 &&
      current.pointsB >= 3 &&
      current.pointsA === current.pointsB &&
      Math.abs(next.pointsA - next.pointsB) === 1
    ) {
      next.advantagesUsedInCurrentGame += 1;
    }

    if (this.shouldCloseGame(next)) {
      return this.closeGame(next, winner);
    }

    return this.sanitizeSnapshot(next);
  }

  private shouldCloseGame(snapshot: MatchSnapshot): boolean {
    if (snapshot.isTieBreak) {
      return false;
    }

    if (this.config.scoringMode === ScoringMode.GOLDEN_POINT && snapshot.pointsA >= 3 && snapshot.pointsB >= 3) {
      return snapshot.pointsA !== snapshot.pointsB;
    }

    if (this.config.scoringMode === ScoringMode.STAR_POINT && snapshot.pointsA >= 3 && snapshot.pointsB >= 3) {
      const isDeuce = snapshot.pointsA === snapshot.pointsB;
      if (snapshot.advantagesUsedInCurrentGame >= this.config.advantagesBeforeStarPoint && !isDeuce) {
        return true;
      }
      if (!isDeuce && Math.abs(snapshot.pointsA - snapshot.pointsB) >= 2) {
        return true;
      }
      if (!isDeuce && Math.max(snapshot.pointsA, snapshot.pointsB) > 4) {
        return true;
      }
      return false;
    }

    return Math.max(snapshot.pointsA, snapshot.pointsB) >= 4 && Math.abs(snapshot.pointsA - snapshot.pointsB) >= 2;
  }

  private closeGame(snapshot: MatchSnapshot, winner: 'A' | 'B'): MatchSnapshot {
    let next = { ...snapshot };
    if (winner === 'A') {
      next.gamesInSetA += 1;
    } else {
      next.gamesInSetB += 1;
    }

    next.pointsA = 0;
    next.pointsB = 0;
    next.advantagesUsedInCurrentGame = 0;
    next.isTieBreak = false;
    next.gameSubState = GameSubState.NORMAL;

    const setWinner = this.detectSetWinner(next);
    if (setWinner !== null) {
      return this.closeSet(next, setWinner);
    }

    return this.sanitizeSnapshot(next);
  }

  private closeSet(snapshot: MatchSnapshot, winner: 'A' | 'B'): MatchSnapshot {
    let next = { ...snapshot };

    if (winner === 'A') {
      next.setsWonA += 1;
    } else {
      next.setsWonB += 1;
    }

    next.gamesInSetA = 0;
    next.gamesInSetB = 0;
    next.pointsA = 0;
    next.pointsB = 0;
    next.advantagesUsedInCurrentGame = 0;
    next.isTieBreak = false;
    next.gameSubState = GameSubState.NORMAL;

    const setsToWin = Math.floor(this.config.bestOf / 2) + 1;
    if (next.setsWonA >= setsToWin || next.setsWonB >= setsToWin) {
      next.status = MatchLifecycleStatus.FINISHED;
      next.winner = next.setsWonA > next.setsWonB ? 'A' : 'B';
    }

    return this.sanitizeSnapshot(next);
  }

  private detectSetWinner(snapshot: MatchSnapshot): 'A' | 'B' | null {
    const maxGames = Math.max(snapshot.gamesInSetA, snapshot.gamesInSetB);
    const diff = Math.abs(snapshot.gamesInSetA - snapshot.gamesInSetB);

    if (maxGames >= 6 && diff >= 2) {
      return snapshot.gamesInSetA > snapshot.gamesInSetB ? 'A' : 'B';
    }

    if (maxGames === 7) {
      return snapshot.gamesInSetA > snapshot.gamesInSetB ? 'A' : 'B';
    }

    return null;
  }

  private sanitizeSnapshot(snapshot: MatchSnapshot): MatchSnapshot {
    const next = { ...snapshot };
    next.status = next.winner === null ? next.status : MatchLifecycleStatus.FINISHED;
    next.scoringMode = this.config.scoringMode;
    next.bestOf = this.config.bestOf;

    const isDeuceLike = next.pointsA >= 3 && next.pointsB >= 3;

    if (next.isTieBreak || (next.gamesInSetA === 6 && next.gamesInSetB === 6)) {
      next.isTieBreak = true;
      next.gameSubState = GameSubState.TIE_BREAK;
      next.displayPointsA = String(next.pointsA);
      next.displayPointsB = String(next.pointsB);
      return next;
    }

    if (!isDeuceLike) {
      next.gameSubState = GameSubState.NORMAL;
      next.displayPointsA = this.toClassicDisplay(next.pointsA);
      next.displayPointsB = this.toClassicDisplay(next.pointsB);
      return next;
    }

    if (this.config.scoringMode === ScoringMode.GOLDEN_POINT && next.pointsA === next.pointsB) {
      next.gameSubState = GameSubState.GOLDEN_POINT;
      next.displayPointsA = '40';
      next.displayPointsB = '40';
      return next;
    }

    if (this.config.scoringMode === ScoringMode.STAR_POINT) {
      if (next.pointsA === next.pointsB && next.advantagesUsedInCurrentGame >= this.config.advantagesBeforeStarPoint) {
        next.gameSubState = GameSubState.STAR_POINT;
        next.displayPointsA = '40';
        next.displayPointsB = '40';
        return next;
      }
    }

    if (next.pointsA === next.pointsB) {
      next.gameSubState = GameSubState.DEUCE;
      next.displayPointsA = '40';
      next.displayPointsB = '40';
    } else if (next.pointsA > next.pointsB) {
      next.gameSubState = GameSubState.ADVANTAGE_A;
      next.displayPointsA = 'AD';
      next.displayPointsB = '-';
    } else {
      next.gameSubState = GameSubState.ADVANTAGE_B;
      next.displayPointsA = '-';
      next.displayPointsB = 'AD';
    }

    return next;
  }

  private toClassicDisplay(points: number): string {
    if (points <= 0) {
      return '0';
    }
    if (points === 1) {
      return '15';
    }
    if (points === 2) {
      return '30';
    }
    return '40';
  }

  private createInitialSnapshot(): MatchSnapshot {
    return {
      status: MatchLifecycleStatus.NOT_STARTED,
      gameSubState: GameSubState.NORMAL,
      scoringMode: this.config.scoringMode,
      bestOf: this.config.bestOf,
      setsWonA: 0,
      setsWonB: 0,
      gamesInSetA: 0,
      gamesInSetB: 0,
      pointsA: 0,
      pointsB: 0,
      displayPointsA: '0',
      displayPointsB: '0',
      advantagesUsedInCurrentGame: 0,
      isTieBreak: false,
      winner: null
    };
  }
}
