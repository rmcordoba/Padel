import common from '@ohos.app.ability.common';
import {
  GameSubState,
  MatchLifecycleStatus,
  MatchSnapshot,
  ScoringMode
} from '../../domain/PadelScoring';
import { MatchEvent } from '../../application/MatchEvents';
import { PadelScoringEngine } from '../../application/PadelScoringEngine';
import { PrimaryActionButton } from '../components/PrimaryActionButton';
import { HarmonyPreferencesKVStore } from '../../infrastructure/persistence/HarmonyPreferencesKVStore';
import { LocalMatchRepository, PersistedMatchSession } from '../../infrastructure/persistence/LocalMatchRepository';

@Component
export struct HomeScreen {
  private readonly defaultScoringMode: ScoringMode = ScoringMode.CLASSIC;
  private readonly defaultBestOf: 1 | 3 | 5 = 3;
  private readonly persistDebounceMs: number = 500;

  private engine: PadelScoringEngine = new PadelScoringEngine({
    scoringMode: this.defaultScoringMode,
    bestOf: this.defaultBestOf
  });
  private repository?: LocalMatchRepository;
  private tickerId: number = -1;
  private persistTimerId: number = -1;
  private matchStartedAtMs: number = 0;
  private pauseStartedAtMs: number = 0;
  private pausedMs: number = 0;
  private eventHistory: MatchEvent[] = [];
  private restoredFromStorage: boolean = false;

  @State private snapshot: MatchSnapshot = this.engine.getSnapshot();
  @State private pointFeedback: string = '';

  aboutToAppear() {
    this.startTicker();
    if (!this.restoredFromStorage) {
      this.restoredFromStorage = true;
      void this.restoreLastMatchOrStartNew();
    }
  }

  aboutToDisappear() {
    this.stopTicker();
    void this.flushPersistence();
  }

  private startTicker() {
    this.stopTicker();
    this.tickerId = setInterval(() => {
      if (this.snapshot.status !== MatchLifecycleStatus.IN_PROGRESS || this.matchStartedAtMs <= 0) {
        return;
      }
      this.snapshot = { ...this.snapshot };
    }, 1000);
  }

  private stopTicker() {
    if (this.tickerId >= 0) {
      clearInterval(this.tickerId);
      this.tickerId = -1;
    }
  }

  private startMatch() {
    this.pausedMs = 0;
    this.matchStartedAtMs = Date.now();
    this.pauseStartedAtMs = 0;
    this.eventHistory = [];
    this.dispatch({
      type: 'StartMatch',
      config: {
        bestOf: this.defaultBestOf,
        scoringMode: this.defaultScoringMode
      }
    }, true);
  }

  private dispatch(event: MatchEvent, persistImmediately: boolean = false) {
    this.snapshot = this.engine.dispatch(event);
    this.eventHistory = [...this.eventHistory, event];
    this.schedulePersistence(persistImmediately);
  }

  private awardPoint(team: 'A' | 'B') {
    if (this.snapshot.status !== MatchLifecycleStatus.IN_PROGRESS) {
      return;
    }

    this.dispatch(team === 'A' ? { type: 'PointWonByA' } : { type: 'PointWonByB' });
    this.pointFeedback = `Punto para Equipo ${team}`;
    this.vibrateIfAvailable();

    setTimeout(() => {
      this.pointFeedback = '';
    }, 700);
  }

  private togglePauseOrResume() {
    if (this.snapshot.status === MatchLifecycleStatus.IN_PROGRESS) {
      this.pauseStartedAtMs = Date.now();
      this.dispatch({ type: 'Pause' }, true);
      return;
    }

    if (this.snapshot.status === MatchLifecycleStatus.PAUSED) {
      if (this.pauseStartedAtMs > 0) {
        this.pausedMs += Date.now() - this.pauseStartedAtMs;
        this.pauseStartedAtMs = 0;
      }
      this.dispatch({ type: 'Resume' }, true);
    }
  }

  private currentServer(): string {
    const totalPoints = this.snapshot.pointsA + this.snapshot.pointsB;
    return totalPoints % 2 === 0 ? 'Equipo A' : 'Equipo B';
  }

  private matchDurationText(): string {
    if (this.matchStartedAtMs <= 0) {
      return '00:00';
    }

    const nowMs = Date.now();
    const activeMs = nowMs - this.matchStartedAtMs - this.pausedMs;
    const seconds = Math.max(0, Math.floor(activeMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${this.twoDigits(minutes)}:${this.twoDigits(remainingSeconds)}`;
  }

  private twoDigits(value: number): string {
    return value < 10 ? `0${value}` : String(value);
  }

  private modeLabel(): string {
    if (this.snapshot.scoringMode === ScoringMode.GOLDEN_POINT) {
      return 'Golden Point';
    }
    if (this.snapshot.scoringMode === ScoringMode.STAR_POINT) {
      return 'Star Point';
    }
    return 'Ventaja clásica';
  }

  private specialStateLabel(): string {
    switch (this.snapshot.gameSubState) {
      case GameSubState.TIE_BREAK:
        return 'Tie-break';
      case GameSubState.GOLDEN_POINT:
        return 'Golden point activo';
      case GameSubState.STAR_POINT:
        return 'Star point activo';
      case GameSubState.DEUCE:
        return 'Deuce';
      case GameSubState.ADVANTAGE_A:
        return 'Ventaja Equipo A';
      case GameSubState.ADVANTAGE_B:
        return 'Ventaja Equipo B';
      default:
        return 'Normal';
    }
  }

  private restartWithSameConfig() {
    this.engine = new PadelScoringEngine({
      bestOf: this.snapshot.bestOf,
      scoringMode: this.snapshot.scoringMode
    });
    this.snapshot = this.engine.getSnapshot();
    this.startMatch();
  }

  private newMatch() {
    this.engine = new PadelScoringEngine({
      bestOf: this.defaultBestOf,
      scoringMode: this.defaultScoringMode
    });
    this.snapshot = this.engine.getSnapshot();
    this.startMatch();
  }

  private vibrateIfAvailable() {
    const maybeNavigator = (globalThis as Record<string, Object>)['navigator'] as Record<string, Object> | undefined;
    if (!maybeNavigator) {
      return;
    }

    const vibrateFn = maybeNavigator['vibrate'] as ((pattern: number) => boolean) | undefined;
    if (typeof vibrateFn === 'function') {
      vibrateFn(20);
    }
  }

  private getRepository(): LocalMatchRepository {
    if (!this.repository) {
      const context = getContext(this) as common.UIAbilityContext;
      this.repository = new LocalMatchRepository(new HarmonyPreferencesKVStore(context));
    }

    return this.repository;
  }

  private async restoreLastMatchOrStartNew(): Promise<void> {
    try {
      const persisted = await this.getRepository().readActiveMatch();
      if (!persisted || persisted.matchState.status === MatchLifecycleStatus.NOT_STARTED) {
        this.startMatch();
        return;
      }

      this.eventHistory = [...persisted.eventHistory];
      this.matchStartedAtMs = persisted.matchStartedAtMs;
      this.pauseStartedAtMs = persisted.pauseStartedAtMs;
      this.pausedMs = persisted.pausedMs;

      const restoredState = persisted.matchState;
      this.engine = new PadelScoringEngine({
        bestOf: restoredState.bestOf,
        scoringMode: restoredState.scoringMode
      });

      this.engine.dispatch({
        type: 'StartMatch',
        config: {
          bestOf: restoredState.bestOf,
          scoringMode: restoredState.scoringMode
        }
      });

      this.engine.dispatch({
        type: 'EditScore',
        patch: {
          setsWonA: restoredState.setsWonA,
          setsWonB: restoredState.setsWonB,
          gamesInSetA: restoredState.gamesInSetA,
          gamesInSetB: restoredState.gamesInSetB,
          pointsA: restoredState.pointsA,
          pointsB: restoredState.pointsB,
          status: MatchLifecycleStatus.IN_PROGRESS,
          winner: restoredState.winner,
          advantagesUsedInCurrentGame: restoredState.advantagesUsedInCurrentGame
        }
      });

      if (restoredState.status === MatchLifecycleStatus.PAUSED) {
        this.engine.dispatch({ type: 'Pause' });
      }

      this.snapshot = this.engine.getSnapshot();
    } catch (_error) {
      this.startMatch();
    }
  }

  private buildPersistedSession(): PersistedMatchSession {
    return {
      matchState: this.snapshot,
      eventHistory: this.eventHistory,
      matchStartedAtMs: this.matchStartedAtMs,
      pauseStartedAtMs: this.pauseStartedAtMs,
      pausedMs: this.pausedMs,
      persistedAtMs: Date.now()
    };
  }

  private schedulePersistence(forceNow: boolean = false) {
    if (this.persistTimerId >= 0) {
      clearTimeout(this.persistTimerId);
      this.persistTimerId = -1;
    }

    if (forceNow) {
      void this.persistNow();
      return;
    }

    this.persistTimerId = setTimeout(() => {
      this.persistTimerId = -1;
      void this.persistNow();
    }, this.persistDebounceMs);
  }

  private async persistNow(): Promise<void> {
    await this.getRepository().saveActiveMatch(this.buildPersistedSession());
  }

  private async flushPersistence(): Promise<void> {
    if (this.persistTimerId >= 0) {
      clearTimeout(this.persistTimerId);
      this.persistTimerId = -1;
    }
    await this.persistNow();
  }

  @Builder
  private buildScoreCard(title: string, teamA: string, teamB: string) {
    Column({ space: 6 }) {
      Text(title)
        .fontSize(14)
        .fontColor('#6A6A6A');
      Row() {
        Text(`A: ${teamA}`)
          .fontSize(24)
          .fontWeight(FontWeight.Bold);
        Blank();
        Text(`B: ${teamB}`)
          .fontSize(24)
          .fontWeight(FontWeight.Bold);
      }
      .width('100%');
    }
    .padding(14)
    .borderRadius(12)
    .backgroundColor('#F4F4F7')
    .width('100%');
  }

  @Builder
  private buildEndMatchFlow() {
    Column({ space: 12 }) {
      Text('Partido finalizado')
        .fontSize(24)
        .fontWeight(FontWeight.Bold);
      Text(`Ganador: Equipo ${this.snapshot.winner}`)
        .fontSize(20)
        .fontWeight(FontWeight.Medium);
      Text(`Resultado por sets: ${this.snapshot.setsWonA} - ${this.snapshot.setsWonB}`)
        .fontSize(18);
      Text(`Duración: ${this.matchDurationText()}`)
        .fontSize(18);

      PrimaryActionButton({
        label: 'Repetir configuración',
        onTap: () => this.restartWithSameConfig()
      });

      PrimaryActionButton({
        label: 'Nuevo partido',
        backgroundColor: '#22A55A',
        onTap: () => this.newMatch()
      });
    }
    .width('100%')
    .padding(16)
    .borderRadius(14)
    .backgroundColor('#EEF8EE');
  }

  build() {
    Column({ space: 14 }) {
      Text('Padel Scoreboard')
        .fontSize(28)
        .fontWeight(FontWeight.Bold);

      if (this.pointFeedback.length > 0) {
        Text(this.pointFeedback)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#0B8A2A')
          .padding(10)
          .borderRadius(10)
          .backgroundColor('#E8F8EC')
          .width('100%');
      }

      this.buildScoreCard('Sets ganados', `${this.snapshot.setsWonA}`, `${this.snapshot.setsWonB}`);
      this.buildScoreCard('Games set actual', `${this.snapshot.gamesInSetA}`, `${this.snapshot.gamesInSetB}`);
      this.buildScoreCard('Puntos game actual', this.snapshot.displayPointsA, this.snapshot.displayPointsB);

      Row() {
        Text(`Servidor: ${this.currentServer()}`)
          .fontSize(16)
          .fontWeight(FontWeight.Medium);
        Blank();
        Text(`Duración: ${this.matchDurationText()}`)
          .fontSize(16);
      }
      .width('100%');

      Text(`Modo activo: ${this.modeLabel()}`)
        .fontSize(16);
      Text(`Estado especial: ${this.specialStateLabel()}`)
        .fontSize(16);

      const blocked = this.snapshot.status !== MatchLifecycleStatus.IN_PROGRESS;

      PrimaryActionButton({
        label: 'Punto Equipo A',
        onTap: () => this.awardPoint('A'),
        backgroundColor: '#0A84FF',
        enabled: !blocked
      });

      PrimaryActionButton({
        label: 'Punto Equipo B',
        onTap: () => this.awardPoint('B'),
        backgroundColor: '#FF5E57',
        enabled: !blocked
      });

      if (this.snapshot.status === MatchLifecycleStatus.PAUSED) {
        Text('PAUSED: interacción bloqueada')
          .fontColor('#A53D00')
          .fontWeight(FontWeight.Medium)
          .padding(10)
          .backgroundColor('#FFEBD9')
          .borderRadius(10)
          .width('100%');
      }

      if (this.snapshot.status !== MatchLifecycleStatus.FINISHED) {
        PrimaryActionButton({
          label: this.snapshot.status === MatchLifecycleStatus.PAUSED ? 'Reanudar' : 'PAUSED',
          backgroundColor: this.snapshot.status === MatchLifecycleStatus.PAUSED ? '#FF9500' : '#6A6A6A',
          onTap: () => this.togglePauseOrResume()
        });
      }

      if (this.snapshot.status === MatchLifecycleStatus.FINISHED) {
        this.buildEndMatchFlow();
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .justifyContent(FlexAlign.Start);
  }
}
