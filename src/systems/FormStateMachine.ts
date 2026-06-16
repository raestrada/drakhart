import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnergySystem } from './EnergySystem';
import { FlightSystem } from './FlightSystem';
import { HeatSystem } from './HeatSystem';
import {
  TRANSFORM_DURATION,
  TRANSFORM_COOLDOWN_DURATION,
  CAMERA_ZOOM_DRAGON,
  CAMERA_ZOOM_MECHA,
  CAMERA_ZOOM_HUMAN,
  CAMERA_ZOOM_DURATION,
  SHAKE,
} from '../utils/constants';
import { playFlash } from '../effects/ScreenEffects';

export enum FormState {
  HUMAN = 'HUMAN',
  TRANSFORMING = 'TRANSFORMING',
  MECHA = 'MECHA',
  DRAGON = 'DRAGON',
  EXHAUSTED = 'EXHAUSTED',
}

export class FormStateMachine {
  private currentState: FormState = FormState.HUMAN;
  private player: Player;
  private energySystem: EnergySystem;
  private flightSystem: FlightSystem;
  private heatSystem: HeatSystem;
  private transformUnlocked = false;
  private dragonUnlocked = false;
  private canTransform = true;
  private scene: Phaser.Scene;

  constructor(player: Player, scene: Phaser.Scene) {
    this.player = player;
    this.scene = scene;
    this.energySystem = new EnergySystem();
    this.flightSystem = new FlightSystem(player);
    this.heatSystem = new HeatSystem();
  }

  get state(): FormState {
    return this.currentState;
  }

  get energy(): EnergySystem {
    return this.energySystem;
  }

  get flight(): FlightSystem {
    return this.flightSystem;
  }

  get heat(): HeatSystem {
    return this.heatSystem;
  }

  unlockTransform(): void {
    this.transformUnlocked = true;
  }

  unlockDragon(): void {
    this.dragonUnlocked = true;
  }

  hasTransform(): boolean {
    return this.transformUnlocked;
  }

  hasDragon(): boolean {
    return this.dragonUnlocked;
  }

  isMecha(): boolean {
    return this.currentState === FormState.MECHA;
  }

  isMechaUnlocked(): boolean {
    return this.transformUnlocked;
  }

  isDragonUnlocked(): boolean {
    return this.dragonUnlocked;
  }


  requestTransform(): void {
    if (!this.canTransform) return;

    if (this.currentState === FormState.HUMAN) {
      if (this.transformUnlocked) {
        this.beginTransformToMecha();
      }
    } else if (this.currentState === FormState.MECHA) {
      if (this.dragonUnlocked) {
        this.beginTransformToDragon();
      } else {
        this.startRevert();
      }
    } else if (this.currentState === FormState.DRAGON) {
      this.startRevert();
    }
  }

  private triggerVortexParticles(targetColor: number): void {
    const pX = this.player.x;
    const pY = this.player.y;

    // Spawn 24 energy particles around the player and pull them in
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.2;
      const dist = Phaser.Math.Between(70, 120);
      const startX = pX + Math.cos(angle) * dist;
      const startY = pY + Math.sin(angle) * dist;

      const size = Phaser.Math.Between(3, 6);
      const spark = this.scene.add.rectangle(startX, startY, size, size, targetColor, 0.9);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(this.player.depth + 1);

      // Suck into player's chest core position
      this.scene.tweens.add({
        targets: spark,
        x: pX,
        y: pY - 8,
        scale: 0.1,
        angle: 360,
        duration: Phaser.Math.Between(350, 500),
        ease: 'Cubic.easeIn',
        onComplete: () => {
          spark.destroy();
        }
      });
    }
  }

  private beginTransformToMecha(): void {
    this.currentState = FormState.TRANSFORMING;
    this.player.setVelocity(0, 0);
    (this.scene as any).gameAudio?.playTransform();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    this.scene.cameras.main.shake(400, SHAKE.TRANSFORM.intensity);
    playFlash(this.scene, 400, 255, 255, 255);

    this.triggerVortexParticles(0xff0066); // Crimson Mecha core vortex

    this.scene.time.delayedCall(400, () => {
      this.enterMecha();
    });
  }

  private enterMecha(): void {
    this.currentState = FormState.MECHA;
    this.player.setTexture('player-mecha');
    this.player.setScale(1.4);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const oldBottom = body.bottom;
    body.setSize(48, 76);
    body.setOffset(40, 52);
    body.updateFromGameObject();
    this.player.y -= (body.bottom - oldBottom);
    body.updateFromGameObject();
    body.allowGravity = true;

    this.scene.cameras.main.zoomTo(
      CAMERA_ZOOM_MECHA,
      CAMERA_ZOOM_DURATION
    );
  }

  private beginTransformToDragon(): void {
    this.currentState = FormState.TRANSFORMING;
    this.player.setVelocity(0, 0);
    (this.scene as any).gameAudio?.playTransform();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    this.scene.cameras.main.shake(TRANSFORM_DURATION, SHAKE.TRANSFORM.intensity);
    playFlash(this.scene, TRANSFORM_DURATION, 255, 0, 100); // magenta flash for mecha-dragon

    this.triggerVortexParticles(0xff5500); // Orange Dragon core vortex

    this.scene.time.delayedCall(TRANSFORM_DURATION, () => {
      this.enterDragon();
    });
  }

  private enterDragon(): void {
    this.currentState = FormState.DRAGON;
    this.player.setTexture('player-dragon');
    this.player.setScale(1.45);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    const oldBottom = body.bottom;
    body.setSize(84, 60);
    body.setOffset(6, 6);
    body.updateFromGameObject();
    this.player.y -= (body.bottom - oldBottom);
    body.updateFromGameObject();
    this.flightSystem.activate();

    this.scene.cameras.main.zoomTo(
      CAMERA_ZOOM_DRAGON,
      CAMERA_ZOOM_DURATION
    );
  }

  private startRevert(): void {
    this.currentState = FormState.EXHAUSTED;
    this.player.setTexture('player-human');
    (this.scene as any).gameAudio?.playRevert();
    this.player.setScale(0.8);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = true;
    const oldBottom = body.bottom;
    body.setSize(36, 60);
    body.setOffset(30, 36);
    body.updateFromGameObject();
    this.player.y -= (body.bottom - oldBottom);
    body.updateFromGameObject();
    this.flightSystem.deactivate();

    this.scene.cameras.main.zoomTo(
      CAMERA_ZOOM_HUMAN,
      CAMERA_ZOOM_DURATION
    );

    this.canTransform = false;
    this.scene.time.delayedCall(TRANSFORM_COOLDOWN_DURATION, () => {
      if (this.currentState === FormState.EXHAUSTED) {
        this.currentState = FormState.HUMAN;
      }
      this.canTransform = true;
    });
  }

  update(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body ? (body.blocked.down || body.touching.down) : false;
    
    this.energySystem.update(
      delta,
      this.currentState,
      this.flightSystem.isFlyingUp(),
      onGround
    );

    if (this.currentState === FormState.MECHA) {
      const isMoving = body ? Math.abs(body.velocity.x) > 10 : false;
      this.heatSystem.update(delta, isMoving);
    } else if (this.currentState === FormState.HUMAN || this.currentState === FormState.EXHAUSTED) {
      this.heatSystem.update(delta, false);
    }

    if (
      (this.currentState === FormState.DRAGON || this.currentState === FormState.MECHA) &&
      this.energySystem.isDepleted()
    ) {
      if (this.scene.scene.key === 'GameScene3') {
        if (this.player.alive) {
          this.player.takeDamage(100, 0);
        }
      } else {
        this.startRevert();
      }
    }

    if (this.currentState === FormState.DRAGON) {
      this.flightSystem.update(delta);
    }
  }

  isInState(state: FormState): boolean {
    return this.currentState === state;
  }

  destroy(): void {
    this.energySystem.destroy();
  }
}
