export type TickListener = (seconds: number) => void;

export interface Ticker {
  start(listener: TickListener): void;
  stop(): void;
}
