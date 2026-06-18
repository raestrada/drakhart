import { Player } from '../entities/Player';
import {
  ENERGY_MAX,
  ENERGY_DRAIN_FLYING,
  ENERGY_DRAIN_MECHA,
  ENERGY_DRAIN_SHOOT,
  ENERGY_DRAIN_DAMAGED,
  ENERGY_REGEN_HUMAN,
  ENERGY_REGEN_GROUNDED,
} from '../utils/constants';
import { FormState } from './FormStateMachine';

export class EnergySystem {
  private current: number = ENERGY_MAX;
  private max: number = ENERGY_MAX;

  get currentEnergy(): number {
    return this.current;
  }

  get maxEnergy(): number {
    return this.max;
  }

  get ratio(): number {
    return this.current / this.max;
  }

  isDepleted(): boolean {
    return this.current <= 0;
  }

  canShoot(): boolean {
    return this.current >= ENERGY_DRAIN_SHOOT;
  }

  consumeShoot(): void {
    if ((window as any).godModeActive || (window as any).infiniteEnergyActive) {
      this.current = this.max;
      return;
    }
    this.current = Math.max(0, this.current - ENERGY_DRAIN_SHOOT);
  }

  consumeDamage(): void {
    if ((window as any).godModeActive || (window as any).infiniteEnergyActive) {
      this.current = this.max;
      return;
    }
    this.current = Math.max(0, this.current - ENERGY_DRAIN_DAMAGED);
  }

  addEnergy(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  update(delta: number, state: FormState, isFlyingUp: boolean, onGround: boolean, starMultiplier: number = 1): void {
    if ((window as any).godModeActive || (window as any).infiniteEnergyActive) {
      this.current = this.max;
      return;
    }
    const dt = delta / 1000;

    if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
      this.current = Math.min(this.max, this.current + ENERGY_REGEN_HUMAN * dt * starMultiplier);
    } else if (state === FormState.MECHA) {
      this.current = Math.max(0, this.current - ENERGY_DRAIN_MECHA * dt);
    } else if (state === FormState.DRAGON) {
      if (onGround) {
        this.current = Math.min(
          this.max,
          this.current + ENERGY_REGEN_GROUNDED * dt * starMultiplier
        );
      } else {
        const drain = isFlyingUp ? ENERGY_DRAIN_FLYING : (ENERGY_DRAIN_FLYING * 0.4);
        this.current = Math.max(0, this.current - drain * dt);
      }
    }
  }

  destroy(): void {
    // cleanup if needed
  }
}
