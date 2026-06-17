import Phaser from 'phaser';
import { FormStateMachine, FormState } from '../systems/FormStateMachine';
import { CombatSystem } from '../systems/CombatSystem';
import {
  PLAYER_HUMAN_SPEED,
  PLAYER_HUMAN_ACCEL,
  PLAYER_HUMAN_DRAG,
  PLAYER_HUMAN_JUMP,
  PLAYER_HUMAN_MAX_FALL,
  PLAYER_MECHA_SPEED,
  PLAYER_MECHA_ACCEL,
  PLAYER_MECHA_DRAG,
  PLAYER_MECHA_JUMP,
  PLAYER_MECHA_HOVER_MAX_TIME,
  PLAYER_MAX_HEALTH,
  INVINCIBILITY_DURATION,
} from '../utils/constants';
import { TarotSystem } from '../systems/TarotSystem';
import { GamepadSystem } from '../systems/GamepadSystem';
import { spawnLandingDust, spawnHoverThrust, spawnDragonExhaust, spawnHitParticles } from '../effects/Particles';
import { spawnDamageNumber } from '../effects/DamageNumbers';

const DRAGON_FRAME_MS = 220;

export class Player extends Phaser.Physics.Arcade.Sprite {
  public formMachine: FormStateMachine;
  public combatSystem: CombatSystem;
  public health = PLAYER_MAX_HEALTH;
  public maxHealth = PLAYER_MAX_HEALTH;
  public alive = true;
  public isInvincible = false;
  public isAnimatingAttack = false;
  public tarotSystem: TarotSystem | null = null;
  public inputEnabled = true;
  private gamepadSystem: GamepadSystem;
  private savedAllowGravity = true;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  public facingRight = true;
  private jumpPressed = false;

  public animState: 'idle' | 'walk' | 'jump' | 'dragon' | 'kneeling' = 'idle';

  private lowHP_steamTimer = 0;
  private mechaSteamTimer = 0;
  private breathTimer = 0;

  // Game feel / juice state variables
  private wasOnGround = true;
  private timeSinceGrounded = 0;
  private jumpBufferTimer = 0;
  private hoverTimer = 0;
  private hoverActive = false;
  private hasJumpedThisCycle = false;
  private hasDoubleJumped = false;

  // Phaser effects state
  private auraTimer = 0;
  private afterimageTimer = 0;
  private footstepTimer = 0;
  private visorGlowTween: Phaser.Tweens.Tween | null = null;
  private visorGlow: Phaser.GameObjects.Rectangle | null = null;
  private visorLight: Phaser.GameObjects.Light | null = null;
  private visorTrailTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-human');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10); // Ensure player renders on top of altar

    this.setScale(0.8);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(36, 60);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(30, 36);

    this.formMachine = new FormStateMachine(this, scene);
    this.combatSystem = new CombatSystem(scene, this);
    this.gamepadSystem = new GamepadSystem(scene);

    this.setupInput(scene);
    this.createVisorGlow(scene);
    this.setupVisorLight(scene);
  }

  private setupVisorLight(scene: Phaser.Scene): void {
    if (scene.lights && scene.lights.active) {
      this.visorLight = scene.lights.addLight(this.x, this.y, 120, 0x00ffcc, 1.1);
    }
  }

  private createVisorGlow(scene: Phaser.Scene): void {
    this.visorGlow = scene.add.rectangle(this.x + 8, this.y - 18, 14, 4, 0x00ffcc, 0);
    this.visorGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.visorGlow.setDepth(this.depth + 1);

    this.visorGlowTween = scene.tweens.add({
      targets: this.visorGlow,
      alpha: { from: 0.3, to: 0.85 },
      scaleX: { from: 0.8, to: 1.3 },
      scaleY: { from: 0.6, to: 1.1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private setupInput(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyTransform = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    const keyAttack = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    keyTransform.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      this.formMachine.requestTransform();
    });

    keyAttack.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      this.combatSystem.attack(this.formMachine.state, this.facingRight);
    });

    // Jump Buffering listeners
    this.keyW.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      this.jumpBufferTimer = 120;
    });
    this.cursors.up.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      this.jumpBufferTimer = 120;
    });
  }

  public setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    if (!enabled) {
      this.savedAllowGravity = body.allowGravity;
      body.allowGravity = false;
      body.setVelocity(0, 0);
    } else {
      body.allowGravity = this.savedAllowGravity;
    }
  }

  public isJumpKeyDown(): boolean {
    return this.cursors.up?.isDown || this.keyW?.isDown;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    this.gamepadSystem.update();

    // Gamepad attack and transform triggers
    if (this.gamepadSystem.attackJustDown && this.inputEnabled) {
      this.combatSystem.attack(this.formMachine.state, this.facingRight);
    }
    if (this.gamepadSystem.transformJustDown && this.inputEnabled) {
      this.formMachine.requestTransform();
    }
    if (this.gamepadSystem.jumpJustDown) {
      this.jumpBufferTimer = 120;
    }

    if (!this.inputEnabled) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(0, 0);
      }
      if (this.animState !== 'kneeling') {
        this.animState = 'idle';
      }
      this.updateAnimation(delta);
      this.updateJuice(delta);
      this.updateVisorGlowPosition();
      this.updateVisorTrail(delta);
      return;
    }

    const { state } = this.formMachine;

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
      this.updateHuman(delta);
    } else if (state === FormState.MECHA) {
      this.updateMecha(delta);
    } else if (state === FormState.DRAGON) {
      this.updateDragon(delta);
    }

    this.formMachine.update(delta);
    this.combatSystem.update();

    if (!this.isAnimatingAttack) {
      this.updateAnimation(delta);
    }

    this.updateJuice(delta);
    this.updateAura(delta);
    this.updateAfterimage(delta);
    this.updateVisorGlowPosition();
    this.updateVisorTrail(delta);
  }

  private updateHuman(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;

    const left = this.cursors.left?.isDown || this.keyA.isDown || this.gamepadSystem.left;
    const right = this.cursors.right?.isDown || this.keyD.isDown || this.gamepadSystem.right;
    const jump = this.cursors.up?.isDown || this.keyW.isDown || this.gamepadSystem.jumpPressed;
    const onGround = body.blocked.down || body.touching.down;
    const isMoving = left || right;

    // Coyote time update
    if (onGround) {
      this.timeSinceGrounded = 0;
      this.hasJumpedThisCycle = false;
      this.hasDoubleJumped = false;
    } else {
      this.timeSinceGrounded += delta;
    }

    // Horizontal movement (Inertia: Accel + Drag)
    if (left) {
      body.setVelocityX(Math.max(-PLAYER_HUMAN_SPEED, body.velocity.x - PLAYER_HUMAN_ACCEL * dt));
      this.facingRight = false;
      this.setFlipX(true);
    } else if (right) {
      body.setVelocityX(Math.min(PLAYER_HUMAN_SPEED, body.velocity.x + PLAYER_HUMAN_ACCEL * dt));
      this.facingRight = true;
      this.setFlipX(false);
    } else {
      body.setVelocityX(body.velocity.x * PLAYER_HUMAN_DRAG);
      if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
    }

    if (isMoving && onGround) {
      this.animState = 'walk';
      this.updateFootstep(delta, this.getTerrainSurface(), false);
    } else if (onGround) {
      this.animState = 'idle';
    } else {
      this.animState = 'jump';
    }

    // Jump execution (buffered or coyote jump)
    const canCoyoteJump = !onGround && this.timeSinceGrounded <= 100 && !this.hasJumpedThisCycle;

    if (jump) {
      if ((onGround || canCoyoteJump) && !this.jumpPressed) {
        body.setVelocityY(PLAYER_HUMAN_JUMP);
        this.jumpPressed = true;
        this.hasJumpedThisCycle = true;
        this.triggerJumpJuice();
      }
      this.jumpPressed = true;
    } else {
      this.jumpPressed = false;
    }

    // Check buffered jump landing
    if (onGround && this.jumpBufferTimer > 0) {
      body.setVelocityY(PLAYER_HUMAN_JUMP);
      this.jumpBufferTimer = 0;
      this.hasJumpedThisCycle = true;
      this.triggerJumpJuice();
    }

    // Double jump (requires The Magician tarot card)
    if (
      jump &&
      !onGround &&
      !canCoyoteJump &&
      this.hasJumpedThisCycle &&
      !this.hasDoubleJumped &&
      this.tarotSystem?.hasDoubleJump()
    ) {
      body.setVelocityY(PLAYER_HUMAN_JUMP * 0.8);
      this.hasDoubleJumped = true;
      (this.scene as any).gameAudio?.playJump();
      const baseScale = this.formMachine.state === FormState.MECHA ? 1.4 : (this.formMachine.state === FormState.DRAGON ? 1.45 : 0.8);
      this.scene.tweens.add({
        targets: this,
        scaleY: baseScale * 1.25,
        scaleX: baseScale * 0.8,
        duration: 120,
        yoyo: true,
        ease: 'Power2',
      });
    }

    // Variable jump height
    if (!jump && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * 0.85);
    }
  }

  private updateMecha(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;

    const left = this.cursors.left?.isDown || this.keyA.isDown || this.gamepadSystem.left;
    const right = this.cursors.right?.isDown || this.keyD.isDown || this.gamepadSystem.right;
    const jump = this.cursors.up?.isDown || this.keyW.isDown || this.gamepadSystem.jumpPressed;
    const onGround = body.blocked.down || body.touching.down;
    const isMoving = left || right;

    // Horizontal movement (Heavy inertia)
    const heatMult = this.formMachine.heat.speedMultiplier;
    const tarotMult = this.tarotSystem?.hasChariot() ? 1.3 : 1.0;
    const maxSpeed = PLAYER_MECHA_SPEED * heatMult * tarotMult;
    if (left) {
      body.setVelocityX(Math.max(-maxSpeed, body.velocity.x - PLAYER_MECHA_ACCEL * dt));
      this.facingRight = false;
      this.setFlipX(true);
    } else if (right) {
      body.setVelocityX(Math.min(maxSpeed, body.velocity.x + PLAYER_MECHA_ACCEL * dt));
      this.facingRight = true;
      this.setFlipX(false);
    } else {
      body.setVelocityX(body.velocity.x * PLAYER_MECHA_DRAG);
      if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
    }

    // Hover / Vertical control
    if (onGround) {
      this.hoverTimer = 0;
      this.hoverActive = false;
      this.hasJumpedThisCycle = false;
      body.allowGravity = true;

      // Heat visual feedback
      this.updateHeatVisuals();

      if (isMoving) {
        this.animState = 'walk';
        this.updateFootstep(delta, this.getTerrainSurface(), true);
      } else {
        this.animState = 'idle';
      }

      // Check buffered jump landing
      if (this.jumpBufferTimer > 0) {
        body.setVelocityY(PLAYER_MECHA_JUMP);
        this.jumpBufferTimer = 0;
        this.hasJumpedThisCycle = true;
        this.triggerJumpJuice();
      }
    } else {
      this.animState = 'jump';

      // Check hover hold
      if (jump && body.velocity.y > -50 && this.hoverTimer < PLAYER_MECHA_HOVER_MAX_TIME) {
        this.hoverActive = true;
        body.allowGravity = false;
        body.setVelocityY(40); // slow mechanical glide
        this.hoverTimer += delta;

        this.formMachine.heat.addHeat(10 * (delta / 1000));

        this.spawnHoverParticles();
      } else {
        this.hoverActive = false;
        body.allowGravity = true;
      }
    }

    // Normal jump trigger
    if (jump) {
      if (onGround && !this.jumpPressed) {
        body.setVelocityY(PLAYER_MECHA_JUMP);
        this.jumpPressed = true;
        this.hasJumpedThisCycle = true;
        this.triggerJumpJuice();
      }
      this.jumpPressed = true;
    } else {
      this.jumpPressed = false;
      this.hoverActive = false;
    }

    // Variable jump height
    if (!jump && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * 0.85);
    }
  }

  private updateDragon(delta: number): void {
    const left = this.cursors.left?.isDown || this.keyA.isDown;
    const right = this.cursors.right?.isDown || this.keyD.isDown;

    if (left) {
      this.facingRight = false;
      this.setFlipX(true);
    } else if (right) {
      this.facingRight = true;
      this.setFlipX(false);
    }

    // Auto-fire while holding X in dragon form
    const keyX = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    const gamepadFire = this.gamepadSystem.attackPressed;
    if ((keyX?.isDown || gamepadFire) && this.inputEnabled) {
      this.combatSystem.attack(this.formMachine.state, this.facingRight);
    }
  }

  private updateAnimation(delta: number): void {
    if (this.animState === 'kneeling') {
      const isMecha = this.formMachine.isMecha();
      this.play(isMecha ? 'm-kneeling' : 'h-kneeling');
      return;
    }

    if (this.formMachine.state === FormState.DRAGON) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      let vx = body.velocity.x;
      let vy = body.velocity.y;

      if (vx === 0 && vy === 0) {
        const left = this.cursors.left?.isDown || this.keyA?.isDown || this.gamepadSystem.left;
        const right = this.cursors.right?.isDown || this.keyD?.isDown || this.gamepadSystem.right;
        const up = this.cursors.up?.isDown || this.keyW?.isDown || this.gamepadSystem.up;
        const down = this.cursors.down?.isDown || this.keyS?.isDown || this.gamepadSystem.down;

        const speed = 260;
        if (left) vx = -speed;
        else if (right) vx = speed;

        if (up) vy = -speed;
        else if (down) vy = speed;
      }

      const flightSpeed = Math.sqrt(vx * vx + vy * vy);

      const targetAngle = this.facingRight
        ? vy * 0.04 + vx * 0.015
        : -(vy * 0.04 - vx * 0.015);
      this.angle = Phaser.Math.Linear(this.angle, Phaser.Math.Clamp(targetAngle, -25, 25), 0.12);

      this.play('d-fly', true);

      const dynamicFlapMs = Math.max(120, DRAGON_FRAME_MS - flightSpeed * 0.3);
      this.anims.timeScale = DRAGON_FRAME_MS / dynamicFlapMs;

      if (flightSpeed > 50) {
        this.spawnFlightParticles(body, vx, vy);
      }
      return;
    }

    this.angle = 0;

    if (this.formMachine.state === FormState.MECHA) {
      if (this.animState === 'idle') {
        this.play('m-idle', true);
      } else if (this.animState === 'walk') {
        this.play('m-walk', true);
      } else {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y < 0) {
          this.play('m-jump', true);
        } else {
          this.play('m-fall', true);
        }
      }
      return;
    }

    if (this.animState === 'idle') {
      this.play('h-idle', true);
    } else if (this.animState === 'walk') {
      this.play('h-walk', true);
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y < 0) {
        this.play('h-jump', true);
      } else {
        this.play('h-fall', true);
      }
    }
  }

  private updateJuice(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    if (onGround && !this.wasOnGround) {
      this.triggerLandingJuice();
    }
    this.wasOnGround = onGround;

    this.updateLowHPFeedback(delta);
    this.updateMechaBodySteam(delta);
  }

  private updateLowHPFeedback(delta: number): void {
    if (this.formMachine.state === FormState.DRAGON) return;

    const hpRatio = this.health / this.maxHealth;
    if (hpRatio < 0.3) {
      this.setTint(0xff5533);
      this.breathTimer += delta;
      if (this.breathTimer > 800) {
        this.breathTimer = 0;
        (this.scene as any).gameAudio?.playLowHealth?.();
      }
      // Ember drip
      this.lowHP_steamTimer += delta;
      if (this.lowHP_steamTimer > 500) {
        this.lowHP_steamTimer = 0;
        const drip = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-8, 8),
          this.y + 15,
          2, 2, 0xff2200, 0.7
        );
        drip.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.physics.add.existing(drip);
        const dBody = drip.body as Phaser.Physics.Arcade.Body;
        if (dBody) {
          dBody.setGravityY(120);
          dBody.setVelocity(Phaser.Math.Between(-20, 20), 0);
        }
        this.scene.tweens.add({
          targets: drip,
          alpha: 0,
          duration: 600,
          onComplete: () => drip.destroy(),
        });
      }
    } else if (hpRatio > 0.3 && this.breathTimer === 0) {
      if (this.formMachine.state !== FormState.MECHA || this.formMachine.heat.level === 'normal') {
        if (this.formMachine.state === FormState.HUMAN) {
          this.clearTint();
        }
      }
    }
  }

  private updateMechaBodySteam(delta: number): void {
    if (this.formMachine.state !== FormState.MECHA) return;

    const heat = this.formMachine.heat;
    if (heat.level === 'warning' || heat.level === 'danger') {
      this.mechaSteamTimer += delta;
      const interval = heat.level === 'danger' ? 100 : 220;
      if (this.mechaSteamTimer > interval) {
        this.mechaSteamTimer = 0;
        for (let i = 0; i < 2; i++) {
          const sx = this.x + Phaser.Math.Between(-12, 12);
          const sy = this.y - Phaser.Math.Between(20, 40);
          const steam = this.scene.add.rectangle(sx, sy, 3, 3, 0xcccccc, 0.6);
          steam.setBlendMode(Phaser.BlendModes.NORMAL);
          steam.setDepth(this.depth + 2);
          this.scene.tweens.add({
            targets: steam,
            y: sy - Phaser.Math.Between(15, 35),
            x: sx + Phaser.Math.Between(-10, 10),
            scale: 2.0,
            alpha: 0,
            duration: Phaser.Math.Between(400, 700),
            onComplete: () => steam.destroy(),
          });
        }
      }
    }
  }

  private updateVisorGlowPosition(): void {
    if (!this.visorGlow) return;
    const state = this.formMachine.state;
    if (state === FormState.DRAGON) {
      this.visorGlow.setVisible(false);
      if (this.visorLight) this.visorLight.setIntensity(0);
      return;
    }
    this.visorGlow.setVisible(true);
    const dir = this.facingRight ? 1 : -1;
    let lx = this.x;
    let ly = this.y;
    if (state === FormState.MECHA) {
      lx = this.x + dir * 4;
      ly = this.y - 8;
      this.visorGlow.setPosition(lx, ly);
      this.visorGlow.fillColor = 0xff3322;
      if (this.visorLight) {
        this.visorLight.setColor(0xff3322);
        this.visorLight.setRadius(180);
        this.visorLight.setIntensity(1.5);
      }
    } else {
      lx = this.x + dir * 8;
      ly = this.y - 18;
      this.visorGlow.setPosition(lx, ly);
      this.visorGlow.fillColor = 0x00ffcc;
      if (this.visorLight) {
        this.visorLight.setColor(0x00ffcc);
        this.visorLight.setRadius(120);
        this.visorLight.setIntensity(1.1);
      }
    }
    if (this.visorLight) {
      this.visorLight.x = lx;
      this.visorLight.y = ly;
    }
  }

  private getTerrainSurface(): 'stone' | 'metal' | 'ash' {
    const biome = (this.scene as any).currentBiome;
    if (biome === 'refinery') return 'metal';
    if (biome === 'gorge') return 'ash';
    return 'stone';
  }

  private updateFootstep(delta: number, surface: 'stone' | 'metal' | 'ash', heavy: boolean): void {
    this.footstepTimer += delta;
    const interval = heavy ? 480 : 340;
    if (this.footstepTimer >= interval) {
      this.footstepTimer = 0;
      (this.scene as any).gameAudio?.playFootstep?.(surface, heavy);
      this.spawnFootstepParticles(surface, heavy);
    }
  }

  private spawnFootstepParticles(surface: 'stone' | 'metal' | 'ash', heavy: boolean): void {
    const count = heavy ? 8 : 4;
    const px = this.x;
    const py = this.y + (heavy ? 40 : 30);

    for (let i = 0; i < count; i++) {
      let color = 0x554433;
      let blendMode = Phaser.BlendModes.NORMAL;
      let alpha = 0.6;
      let size = Phaser.Math.Between(2, 4);
      let duration = Phaser.Math.Between(300, 600);

      if (surface === 'stone') {
        color = Math.random() > 0.4 ? 0x224411 : 0x4a3c31;
      } else if (surface === 'metal') {
        color = Math.random() > 0.5 ? 0xffaa00 : 0xff5500;
        blendMode = Phaser.BlendModes.ADD;
        alpha = 0.95;
        size = Phaser.Math.Between(1.5, 3);
      } else if (surface === 'ash') {
        color = Math.random() > 0.5 ? 0x1f1b1a : 0xee3300;
        blendMode = Math.random() > 0.5 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
        alpha = 0.8;
      }

      const p = this.scene.add.rectangle(
        px + Phaser.Math.Between(-8, 8),
        py,
        size,
        size,
        color,
        alpha
      );
      p.setDepth(this.depth - 1);
      p.setBlendMode(blendMode);

      this.scene.physics.add.existing(p);
      const pBody = p.body as Phaser.Physics.Arcade.Body;
      if (pBody) {
        pBody.allowGravity = (surface !== 'ash');
        const vx = Phaser.Math.Between(-80, 80);
        const vy = surface === 'ash' ? Phaser.Math.Between(-50, -20) : Phaser.Math.Between(-120, -50);
        pBody.setVelocity(vx, vy);
      }

      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.1,
        duration: duration,
        onComplete: () => p.destroy()
      });
    }
  }

  private updateAura(delta: number): void {
    this.auraTimer += delta;
    const state = this.formMachine.state;
    if (state === FormState.DRAGON) return;

    const interval = state === FormState.HUMAN || state === FormState.EXHAUSTED ? 90 : 60;
    if (this.auraTimer < interval) return;
    this.auraTimer = 0;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.abs(body.velocity.x);
    if (speed < 30 && Math.random() > 0.35) return;

    const isHuman = state === FormState.HUMAN || state === FormState.EXHAUSTED;
    const col = isHuman
      ? (Math.random() > 0.5 ? 0x1a0505 : 0x330a0a)
      : (Math.random() > 0.5 ? 0xff0066 : 0xff5ea2);
    const sz = Phaser.Math.Between(2, 5);

    const p = this.scene.add.rectangle(
      this.x + Phaser.Math.Between(-12, 12),
      this.y + Phaser.Math.Between(-20, 20),
      sz, sz, col, 0.6
    );
    p.setDepth(this.depth - 1);
    if (!isHuman) p.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: p,
      y: p.y - Phaser.Math.Between(20, 50),
      x: p.x + Phaser.Math.Between(-10, 10),
      alpha: 0,
      scale: 0.1,
      duration: Phaser.Math.Between(400, 800),
      ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  private updateAfterimage(delta: number): void {
    this.afterimageTimer += delta;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const state = this.formMachine.state;
    const speed = state === FormState.DRAGON
      ? Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y)
      : Math.abs(body.velocity.x);

    const threshold = state === FormState.DRAGON ? 160 : (this.isAnimatingAttack ? 0 : 80);
    const interval = state === FormState.DRAGON ? 40 : (this.isAnimatingAttack ? 40 : 60);

    if (speed < threshold && !this.isAnimatingAttack) return;
    if (this.afterimageTimer < interval) return;
    this.afterimageTimer = 0;

    const ghost = this.scene.add.image(this.x, this.y, this.texture.key);
    ghost.setFlipX(this.flipX);
    ghost.setAlpha(state === FormState.DRAGON ? 0.28 : 0.35);
    ghost.setTint(state === FormState.MECHA ? 0xff5ea2 : (state === FormState.DRAGON ? 0xff0066 : 0x881111));
    ghost.setBlendMode(Phaser.BlendModes.ADD);
    ghost.setDepth(this.depth - 2);
    ghost.setScale(this.scaleX, this.scaleY);
    ghost.setAngle(this.angle);

    const targetScale = state === FormState.DRAGON ? 1.04 : 1.1;
    const duration = state === FormState.DRAGON ? 320 : 250;

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * targetScale,
      scaleY: ghost.scaleY * targetScale,
      duration: duration,
      ease: 'Power2',
      onComplete: () => ghost.destroy(),
    });
  }

  private triggerJumpJuice(): void {
    (this.scene as any).gameAudio?.playJump();
    const baseScale = this.formMachine.state === FormState.MECHA ? 1.4 : (this.formMachine.state === FormState.DRAGON ? 1.45 : 0.8);
    this.scene.tweens.add({
      targets: this,
      scaleY: baseScale * 1.25,
      scaleX: baseScale * 0.8,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private triggerLandingJuice(): void {
    (this.scene as any).gameAudio?.playLand();
    const baseScale = this.formMachine.state === FormState.MECHA ? 1.4 : (this.formMachine.state === FormState.DRAGON ? 1.45 : 0.8);
    this.scene.tweens.add({
      targets: this,
      scaleY: baseScale * 0.78,
      scaleX: baseScale * 1.22,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
    });

    const body = this.body as Phaser.Physics.Arcade.Body;
    const px = this.x;
    const py = this.y + body.height / 2;
    const isMecha = this.formMachine.state === FormState.MECHA;
    spawnLandingDust(this.scene, px, py, isMecha);

    if (isMecha) {
      this.scene.cameras.main.shake(80, 0.003);
    }
  }

  private spawnHoverParticles(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const px = this.x;
    const py = this.y + body.height / 2;
    spawnHoverThrust(this.scene, px, py);
  }

  private spawnFlightParticles(body: Phaser.Physics.Arcade.Body, virtualVx?: number, virtualVy?: number): void {
    const dir = this.facingRight ? -1 : 1;
    const rad = Phaser.Math.DegToRad(this.angle);
    const offsetX = dir * 28;
    const offsetY = 4;

    const px = this.x + (offsetX * Math.cos(rad) - offsetY * Math.sin(rad));
    const py = this.y + (offsetX * Math.sin(rad) + offsetY * Math.cos(rad));

    const isEnergist = Math.random() > 0.4;
    const tint = isEnergist
      ? [0xff0066, 0xff5ea2]
      : [0xffaa00, 0xcc3300];

    spawnDragonExhaust(this.scene, px, py, tint);
  }

  takeDamage(amount: number, knockbackDir: number): void {
    if (this.isInvincible || !this.alive) return;

    this.health -= amount;
    (this.scene as any).gameAudio?.playDamage();
    this.isInvincible = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMecha = this.formMachine.state === FormState.MECHA;
    const isDragon = this.formMachine.state === FormState.DRAGON;
    const damageType = isMecha ? 'mecha' : (isDragon ? 'fire' : 'physical');
    spawnDamageNumber(this.scene, this.x, this.y, amount, damageType as any, isMecha);
    const kbX = isMecha ? knockbackDir * 80 : knockbackDir * 220;
    const kbY = isMecha ? -60 : -150;
    body.setVelocityX(kbX);
    body.setVelocityY(kbY);

    if (isMecha) {
      this.formMachine.heat.addHeat(8);
    }

    this.scene.cameras.main.shake(120, isMecha ? 0.002 : 0.004);

    if (this.scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      const pipeline = this.scene.cameras.main.getPostPipeline('CustomPostFX') as any;
      if (pipeline) {
        pipeline.aberration = isMecha ? 0.6 : 1.2;
        this.scene.tweens.add({
          targets: pipeline,
          aberration: 0.0,
          duration: 300,
          ease: 'Sine.easeOut'
        });
      }
    }

    this.setTint(0xff0000);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });

    // Flickering invincibility effect using a repeating tween
    const flickerTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.3 },
      duration: 80,
      yoyo: true,
      repeat: Math.floor(INVINCIBILITY_DURATION / 160) - 1,
      onComplete: () => {
        if (this.active) {
          this.setAlpha(1);
        }
      },
    });

    this.scene.time.delayedCall(INVINCIBILITY_DURATION, () => {
      this.isInvincible = false;
      if (this.active) {
        this.setAlpha(1);
        flickerTween.stop();
      }
    });

    // Damage spark burst
    spawnHitParticles(this.scene, this.x, this.y, 8);

    if (this.formMachine.state === FormState.DRAGON || this.formMachine.state === FormState.MECHA) {
      this.formMachine.energy.consumeDamage();
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  private updateHeatVisuals(): void {
    if (this.formMachine.state !== FormState.MECHA) return;

    const heat = this.formMachine.heat;

    if (heat.isShutdown) {
      this.setTint(0x442222);
      return;
    }

    const level = heat.level;
    if (level === 'danger') {
      this.setTint(0xff4422);
    } else if (level === 'warning') {
      this.setTint(0xffaa44);
    } else {
      this.clearTint();
    }
  }

  private die(): void {
    this.alive = false;
    this.health = 0;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    body.allowGravity = false;
    body.setVelocity(0, 0);

    // Delegate dramatic death sequence to the GameScene
    if (typeof (this.scene as any).triggerDramaticDeath === 'function') {
      (this.scene as any).triggerDramaticDeath(this);
    } else {
      this.setTint(0x333333);
      this.scene.time.delayedCall(2000, () => {
        this.scene.scene.restart();
      });
    }
  }

  private updateVisorTrail(delta: number): void {
    if (this.formMachine.state === FormState.DRAGON) return;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;
    
    const speed = Math.abs(body.velocity.x);
    if (speed < 120) return; // Only trail when running fast
    
    this.visorTrailTimer += delta;
    if (this.visorTrailTimer < 35) return;
    this.visorTrailTimer = 0;
    
    if (!this.visorGlow) return;
    
    // Spawn a trail element at the visor glow's current position
    const isMecha = this.formMachine.state === FormState.MECHA;
    const col = isMecha ? 0xff3322 : 0x00ffcc;
    
    const trail = this.scene.add.rectangle(
      this.visorGlow.x,
      this.visorGlow.y,
      isMecha ? 14 : 10,
      isMecha ? 4 : 3,
      col
    );
    trail.setDepth(this.depth + 1);
    trail.setBlendMode(Phaser.BlendModes.ADD);
    
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 250,
      ease: 'Sine.easeOut',
      onComplete: () => trail.destroy()
    });
  }

  destroy(fromScene?: boolean): void {
    this.formMachine.destroy();
    this.combatSystem.destroy();
    if (this.visorGlowTween) this.visorGlowTween.stop();
    if (this.visorGlow) this.visorGlow.destroy();
    if (this.visorLight && this.scene && this.scene.lights) {
      this.scene.lights.removeLight(this.visorLight);
    }
    super.destroy(fromScene);
  }
}
