export type HeatLevel = 'normal' | 'warning' | 'danger';

export class HeatSystem {
  private current = 0;
  private max = 100;
  private shutdownActive = false;
  private shutdownTimer = 0;
  private readonly SHUTDOWN_DURATION = 3000;

  get heat(): number { return this.current; }
  get ratio(): number { return this.current / this.max; }
  get level(): HeatLevel {
    if (this.shutdownActive) return 'danger';
    if (this.current >= 80) return 'danger';
    if (this.current >= 60) return 'warning';
    return 'normal';
  }
  get isShutdown(): boolean { return this.shutdownActive; }

  addHeat(amount: number): void {
    if (this.shutdownActive) return;
    this.current = Math.min(this.max, this.current + amount);
    if (this.current >= this.max) {
      this.triggerShutdown();
    }
  }

  clearHeat(): void {
    this.current = 0;
    this.shutdownActive = false;
    this.shutdownTimer = 0;
  }

  private triggerShutdown(): void {
    this.shutdownActive = true;
    this.shutdownTimer = this.SHUTDOWN_DURATION;
    this.current = this.max;
  }

  update(delta: number, isMoving: boolean): void {
    const dt = delta / 1000;

    if (this.shutdownActive) {
      this.shutdownTimer -= delta;
      this.current = Math.max(0, this.current - 15 * dt);
      if (this.shutdownTimer <= 0) {
        this.shutdownActive = false;
        this.current = 0;
      }
      return;
    }

    // Passive cooling
    const coolingRate = isMoving ? 2 : 5;
    this.current = Math.max(0, this.current - coolingRate * dt);
  }

  get speedMultiplier(): number {
    if (this.shutdownActive) return 0;
    if (this.current >= 80) return 0.7;
    if (this.current >= 60) return 0.85;
    return 1.0;
  }

  get canAct(): boolean {
    return !this.shutdownActive;
  }

  destroy(): void {
    // cleanup if needed
  }
}
