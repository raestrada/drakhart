import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnergySystem } from './EnergySystem';
import { FlightSystem } from './FlightSystem';
import { HeatSystem } from './HeatSystem';
import {
  TRANSFORM_DURATION,
  TRANSFORM_DURATION_MECHA,
  TRANSFORM_COOLDOWN_DURATION,
  CAMERA_ZOOM_DRAGON,
  CAMERA_ZOOM_MECHA,
  CAMERA_ZOOM_HUMAN,
  CAMERA_ZOOM_DURATION,
  SHAKE,
} from '../utils/constants';
import { playFlash } from '../effects/ScreenEffects';
import { getSceneAudio } from '../scenes/BaseLevelScene';
import { HITSTOP } from './HitstopSystem';
import { t } from '../i18n';

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
  private vortexTimer: Phaser.Time.TimerEvent | null = null;

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

  private startVortexStream(color: number): void {
    this.stopVortexStream();

    this.vortexTimer = this.scene.time.addEvent({
      delay: 60,
      callback: () => this.emitVortexParticles(color),
      loop: true,
    });

    // Initial burst for impact
    for (let i = 0; i < 18; i++) {
      this.emitSingleVortexParticle(color, true);
    }
  }

  private stopVortexStream(): void {
    if (this.vortexTimer) {
      this.vortexTimer.destroy();
      this.vortexTimer = null;
    }
  }

  private emitVortexParticles(color: number): void {
    const count = Phaser.Math.Between(3, 5);
    for (let i = 0; i < count; i++) {
      this.emitSingleVortexParticle(color, false);
    }
  }

  private emitSingleVortexParticle(color: number, scatter: boolean): void {
    const cam = this.scene.cameras.main;
    const camLeft = cam.scrollX;
    const camRight = cam.scrollX + cam.width;
    const camTop = cam.scrollY;
    const camBottom = cam.scrollY + cam.height;
    const pX = this.player.x;
    const pY = this.player.y;

    // Pick a random screen edge
    const edge = Phaser.Math.Between(0, 3);
    let startX: number;
    let startY: number;

    switch (edge) {
      case 0: // top
        startX = Phaser.Math.Between(camLeft, camRight);
        startY = camTop - Phaser.Math.Between(20, 80);
        break;
      case 1: // right
        startX = camRight + Phaser.Math.Between(20, 80);
        startY = Phaser.Math.Between(camTop, camBottom);
        break;
      case 2: // bottom
        startX = Phaser.Math.Between(camLeft, camRight);
        startY = camBottom + Phaser.Math.Between(20, 80);
        break;
      default: // left
        startX = camLeft - Phaser.Math.Between(20, 80);
        startY = Phaser.Math.Between(camTop, camBottom);
        break;
    }

    if (scatter) {
      startX = pX + Phaser.Math.Between(-150, 150);
      startY = pY + Phaser.Math.Between(-150, 150);
    }

    const size = Phaser.Math.Between(2, 5);
    const alpha = scatter ? 0.95 : 0.8;

    const spark = this.scene.add.rectangle(startX, startY, size, size, color, alpha);
    spark.setBlendMode(Phaser.BlendModes.ADD);
    spark.setDepth(this.player.depth + 1);

    // Particles flow toward the Dragon Core (player's chest)
    this.scene.tweens.add({
      targets: spark,
      x: pX,
      y: pY - 8,
      scale: 0.15,
      angle: 360,
      alpha: 0,
      duration: Phaser.Math.Between(300, 550),
      ease: 'Cubic.easeIn',
      onComplete: () => spark.destroy(),
    });
  }

  private beginTransformToMecha(): void {
    this.currentState = FormState.TRANSFORMING;
    this.player.setVelocity(0, 0);
    getSceneAudio(this.scene)?.playTransform();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    this.scene.cameras.main.shake(TRANSFORM_DURATION_MECHA, SHAKE.TRANSFORM.intensity);
    playFlash(this.scene, TRANSFORM_DURATION_MECHA, 255, 255, 255);
    this.player.combatSystem.hitstop.freeze(HITSTOP.TRANSFORM.duration, HITSTOP.TRANSFORM.intensity);

    this.startVortexStream(0xff0066); // Crimson Mecha core vortex

    this.scene.time.delayedCall(TRANSFORM_DURATION_MECHA, () => {
      this.stopVortexStream();
      this.enterMecha();
    });
  }

  private getRealBodyBottom(body: Phaser.Physics.Arcade.Body): number {
    const sprite = this.player;
    return sprite.y - (sprite.displayOriginY - body.offset.y) * sprite.scaleY + body.height;
  }

  private enterMecha(): void {
    this.currentState = FormState.MECHA;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const oldBottom = this.getRealBodyBottom(body);

    this.player.setTexture('player-mecha');
    this.player.setScale(1.4);
    body.setSize(48, 76);
    body.setOffset(40, 52);
    body.updateFromGameObject();

    const newBottom = this.getRealBodyBottom(body);
    this.player.y -= (newBottom - oldBottom);
    body.updateFromGameObject();
    body.y -= 2;
    body.setVelocity(0, 0);
    body.allowGravity = true;

    const platforms = (this.scene as any).platforms;
    if (platforms) this.scene.physics.world.collide(this.player, platforms);

    this.scene.cameras.main.zoomTo(
      CAMERA_ZOOM_MECHA,
      CAMERA_ZOOM_DURATION
    );
  }

  private beginTransformToDragon(): void {
    this.currentState = FormState.TRANSFORMING;
    this.player.setVelocity(0, 0);
    getSceneAudio(this.scene)?.playTransform();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    this.scene.cameras.main.shake(TRANSFORM_DURATION, SHAKE.TRANSFORM.intensity);
    playFlash(this.scene, TRANSFORM_DURATION, 255, 0, 100);
    this.player.combatSystem.hitstop.freeze(HITSTOP.TRANSFORM.duration, HITSTOP.TRANSFORM.intensity); // magenta flash for mecha-dragon

    this.startVortexStream(0xff5500); // Orange Dragon core vortex

    this.scene.time.delayedCall(TRANSFORM_DURATION, () => {
      this.stopVortexStream();
      this.enterDragon();
    });
  }

  public enterDragon(): void {
    this.currentState = FormState.DRAGON;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const oldBottom = this.getRealBodyBottom(body);

    this.player.setTexture('player-dragon');
    this.player.setScale(1.45);
    body.allowGravity = false;
    body.setSize(84, 60);
    body.setOffset(6, 6);
    body.updateFromGameObject();

    const newBottom = this.getRealBodyBottom(body);
    this.player.y -= (newBottom - oldBottom);
    body.updateFromGameObject();
    body.setVelocity(0, 0);

    this.flightSystem.activate();
    getSceneAudio(this.scene)?.setDragonActive(true);

    const hint = this.scene.add.text(this.player.x, this.player.y - 50, t('story.dragonFlightHint'), {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffaa44', align: 'center',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400);
    this.scene.tweens.add({ targets: hint, alpha: 0, duration: 800, delay: 3000, onComplete: () => hint.destroy() });

    this.scene.cameras.main.zoomTo(
      CAMERA_ZOOM_DRAGON,
      CAMERA_ZOOM_DURATION
    );
  }

  private startRevert(): void {
    this.currentState = FormState.EXHAUSTED;
    getSceneAudio(this.scene)?.setDragonActive(false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const oldBottom = this.getRealBodyBottom(body);

    this.player.setTexture('player-human');
    getSceneAudio(this.scene)?.playRevert();
    this.player.setScale(0.8);
    body.allowGravity = true;
    body.setSize(36, 60);
    body.setOffset(30, 36);
    body.updateFromGameObject();

    const newBottom = this.getRealBodyBottom(body);
    this.player.y -= (newBottom - oldBottom);
    body.updateFromGameObject();
    body.y -= 2;
    body.setVelocity(0, 0);

    const platforms = (this.scene as any).platforms;
    if (platforms) this.scene.physics.world.collide(this.player, platforms);

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
    
    const starMult = this.player.tarotSystem?.hasStar() ? 1.5 : 1;
    this.energySystem.update(
      delta,
      this.currentState,
      this.flightSystem.isFlyingUp(),
      onGround,
      starMult
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
        // Shmup corridor: revert with a health penalty instead of an instant kill.
        // Keeps tension without a hard fail-state wall.
        if (this.player.alive) {
          this.startRevert();
          this.player.takeDamage(30, 0);
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
    this.stopVortexStream();
    this.energySystem.destroy();
  }
}
