import preferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { PreferencesStore } from './PreferencesStore';

export class HarmonyPreferencesKVStore implements PreferencesStore {
  private static readonly STORE_FILE_NAME = 'padel_local_store';
  private preferencesInstance?: preferences.Preferences;

  constructor(private readonly context: common.UIAbilityContext) {
  }

  async save<T>(key: string, value: T): Promise<void> {
    const preferencesStore = await this.getPreferences();
    await preferencesStore.put(key, JSON.stringify(value));
    await preferencesStore.flush();
  }

  async read<T>(key: string): Promise<T | undefined> {
    const preferencesStore = await this.getPreferences();
    const raw = await preferencesStore.get(key, '');
    if (typeof raw !== 'string' || raw.length === 0) {
      return undefined;
    }

    return JSON.parse(raw) as T;
  }

  private async getPreferences(): Promise<preferences.Preferences> {
    if (!this.preferencesInstance) {
      this.preferencesInstance = await preferences.getPreferences(this.context, HarmonyPreferencesKVStore.STORE_FILE_NAME);
    }

    return this.preferencesInstance;
  }
}
