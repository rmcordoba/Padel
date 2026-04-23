import { MatchEvent } from '../../application/MatchEvents';
import { MatchSnapshot } from '../../domain/PadelScoring';
import { PreferencesStore } from './PreferencesStore';

const ACTIVE_MATCH_KEY = 'active_match_v1';

export interface PersistedMatchSession {
  matchState: MatchSnapshot;
  eventHistory: ReadonlyArray<MatchEvent>;
  matchStartedAtMs: number;
  pauseStartedAtMs: number;
  pausedMs: number;
  persistedAtMs: number;
}

export class LocalMatchRepository {
  constructor(private readonly preferencesStore: PreferencesStore) {
  }

  async saveActiveMatch(session: PersistedMatchSession): Promise<void> {
    await this.preferencesStore.save<PersistedMatchSession>(ACTIVE_MATCH_KEY, session);
  }

  async readActiveMatch(): Promise<PersistedMatchSession | undefined> {
    return this.preferencesStore.read<PersistedMatchSession>(ACTIVE_MATCH_KEY);
  }
}
