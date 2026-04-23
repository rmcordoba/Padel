export interface PreferencesStore {
  save<T>(key: string, value: T): Promise<void>;
  read<T>(key: string): Promise<T | undefined>;
}
