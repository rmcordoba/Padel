import {
  GameMode,
  MatchConfig,
  MatchEventPayload,
  MatchFormat,
  MatchState,
  MatchStatus,
  Server,
  SpecialPointMode
} from '../domain/MatchState';

const DEFAULT_SCHEMA_VERSION = 1;

type MatchStateMachineEvent =
  | { type: 'START_MATCH' }
  | { type: 'PAUSE_MATCH' }
  | { type: 'RESUME_MATCH' }
  | { type: 'FINISH_MATCH' }
  | { type: 'TICK'; seconds: number }
  | { type: string; [key: string]: string | number | boolean };

export class MatchStateMachine {
  createInitialState(matchId: string, config?: Partial<MatchConfig>, nowIso: string = new Date().toISOString()): MatchState {
    const resolvedConfig: MatchConfig = {
      teamAName: config?.teamAName ?? 'Team A',
      teamBName: config?.teamBName ?? 'Team B',
      format: config?.format ?? MatchFormat.BEST_OF_3,
      gameMode: config?.gameMode ?? GameMode.ADVANTAGE,
      specialPointMode: config?.specialPointMode ?? SpecialPointMode.NONE,
      tieBreakEnabled: config?.tieBreakEnabled ?? true,
      gamesPerSet: config?.gamesPerSet ?? 6
    };

    return {
      config: resolvedConfig,
      status: MatchStatus.IDLE,
      setsWon: { teamA: 0, teamB: 0 },
      currentSetGames: { teamA: 0, teamB: 0 },
      currentGamePoints: { teamA: 0, teamB: 0 },
      server: Server.TEAM_A,
      specialState: {
        inTieBreak: false,
        isSetPoint: false,
        isMatchPoint: false
      },
      metadata: {
        schemaVersion: DEFAULT_SCHEMA_VERSION,
        matchId,
        createdAt: nowIso,
        updatedAt: nowIso,
        elapsedSeconds: 0
      },
      eventHistory: []
    };
  }

  reduce(currentState: MatchState, event: MatchStateMachineEvent, nowIso: string = new Date().toISOString()): MatchState {
    const nextState = this.reduceCore(currentState, event, nowIso);
    return this.appendEvent(nextState, event, nowIso);
  }

  private reduceCore(currentState: MatchState, event: MatchStateMachineEvent, nowIso: string): MatchState {
    switch (event.type) {
      case 'START_MATCH':
        return {
          ...currentState,
          status: MatchStatus.IN_GAME,
          metadata: {
            ...currentState.metadata,
            startedAt: currentState.metadata.startedAt ?? nowIso,
            updatedAt: nowIso
          }
        };
      case 'PAUSE_MATCH':
        if (currentState.status !== MatchStatus.IN_GAME) {
          return this.touch(currentState, nowIso);
        }
        return {
          ...currentState,
          status: MatchStatus.PAUSED,
          metadata: { ...currentState.metadata, updatedAt: nowIso }
        };
      case 'RESUME_MATCH':
        if (currentState.status !== MatchStatus.PAUSED) {
          return this.touch(currentState, nowIso);
        }
        return {
          ...currentState,
          status: MatchStatus.IN_GAME,
          metadata: { ...currentState.metadata, updatedAt: nowIso }
        };
      case 'FINISH_MATCH':
        return {
          ...currentState,
          status: MatchStatus.FINISHED,
          metadata: {
            ...currentState.metadata,
            updatedAt: nowIso,
            finishedAt: nowIso,
            durationSeconds: currentState.metadata.elapsedSeconds
          }
        };
      case 'TICK':
        if (currentState.status !== MatchStatus.IN_GAME) {
          return this.touch(currentState, nowIso);
        }
        return {
          ...currentState,
          metadata: {
            ...currentState.metadata,
            updatedAt: nowIso,
            elapsedSeconds: currentState.metadata.elapsedSeconds + Number(event.seconds)
          }
        };
      default:
        return this.touch(currentState, nowIso);
    }
  }

  private appendEvent(currentState: MatchState, event: MatchStateMachineEvent, nowIso: string): MatchState {
    const payload: MatchEventPayload = { ...event };
    const timelineEvent = Object.freeze({
      eventId: `${currentState.metadata.matchId}:${currentState.eventHistory.length + 1}`,
      occurredAt: nowIso,
      payload: Object.freeze(payload)
    });

    return {
      ...currentState,
      eventHistory: [...currentState.eventHistory, timelineEvent]
    };
  }

  private touch(currentState: MatchState, nowIso: string): MatchState {
    return {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        updatedAt: nowIso
      }
    };
  }
}
