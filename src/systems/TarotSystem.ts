import { Player } from '../entities/Player';

export class TarotSystem {
  private collected: Set<string> = new Set();

  collect(cardId: string, _player: Player | null = null): void {
    this.collected.add(cardId);

    // Apply permanent effects
    switch (cardId) {
      case 'magician':
        // Double jump — handled in Player.ts via hasDoubleJump check
        break;
      case 'chariot':
        // Speed boost — handled via speedMultiplier check
        break;
      case 'strength':
        // Damage boost — handled in CombatSystem
        break;
      case 'star':
        // Energy regen boost
        break;
      case 'tower':
        // 3-way fire spread
        break;
    }
  }

  hasCard(cardId: string): boolean {
    return this.collected.has(cardId);
  }

  get collectedCards(): string[] {
    return Array.from(this.collected);
  }

  get count(): number {
    return this.collected.size;
  }

  // Effect accessors used by other systems
  hasDoubleJump(): boolean {
    return this.collected.has('magician');
  }

  hasChariot(): boolean {
    return this.collected.has('chariot');
  }

  hasStrength(): boolean {
    return this.collected.has('strength');
  }

  hasStar(): boolean {
    return this.collected.has('star');
  }

  hasTower(): boolean {
    return this.collected.has('tower');
  }

  // Save / Load
  save(): object {
    return { collected: Array.from(this.collected) };
  }

  load(data: { collected: string[] }): void {
    this.collected = new Set(data.collected);
  }
}
