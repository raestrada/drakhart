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

const WALK_FRAME_MS = 140;
const IDLE_FRAME_MS = 180;
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
  private savedAllowGravity = true;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private facingRight = true;
  private jumpPressed = false;

  private animTimer = 0;
  private animFrame = 0;
  private animState: 'idle' | 'walk' | 'jump' | 'dragon' = 'idle';

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
  private visorGlowTween: Phaser.Tweens.Tween | null = null;
  private visorGlow: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-human');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.8);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(36, 60);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(30, 36);

    this.formMachine = new FormStateMachine(this, scene);
    this.combatSystem = new CombatSystem(scene, this);

    this.setupInput(scene);
    this.createVisorGlow(scene);
  }

  private createVisorGlow(scene: Phaser.Scene): void {
    this.visorGlow = scene.add.rectangle(this.x + 8, this.y - 18, 14, 4, 0xff3322, 0);
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
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyTransform = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    const keyAttack = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    keyTransform.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      this.formMachine.requestTransform();
    });

    keyAttack.on(Phaser.Input.Keyboard.Events.DOWN, () => {
      if (this.formMachine.state !== FormState.DRAGON) {
        this.combatSystem.attack(this.formMachine.state, this.facingRight);
      }
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

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    if (!this.inputEnabled) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(0, 0);
      }
      this.animState = 'idle';
      this.updateAnimation(delta);
      this.updateJuice(delta);
      this.updateVisorGlowPosition();
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
  }

  private updateHuman(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;

    const left = this.cursors.left?.isDown || this.keyA.isDown;
    const right = this.cursors.right?.isDown || this.keyD.isDown;
    const jump = this.cursors.up?.isDown || this.keyW.isDown;
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
      this.scene.tweens.add({
        targets: this,
        scaleY: 1.1,
        scaleX: 0.9,
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

    const left = this.cursors.left?.isDown || this.keyA.isDown;
    const right = this.cursors.right?.isDown || this.keyD.isDown;
    const jump = this.cursors.up?.isDown || this.keyW.isDown;
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

    // Shmup continuous firing: check if attack key (X) is held down
    const keyAttack = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    if (keyAttack.isDown) {
      this.combatSystem.attack(FormState.DRAGON, this.facingRight);
    }
  }

  private updateAnimation(delta: number): void {
    this.animTimer += delta;

    if (this.formMachine.state === FormState.DRAGON) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const flightSpeed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);

      // 1. Aerodynamic tilting
      const targetAngle = this.facingRight
        ? body.velocity.y * 0.04 + body.velocity.x * 0.015
        : -(body.velocity.y * 0.04 - body.velocity.x * 0.015);
      this.angle = Phaser.Math.Linear(this.angle, Phaser.Math.Clamp(targetAngle, -25, 25), 0.12);

      // 2. Dynamic flap speed
      const dynamicFlapMs = Math.max(120, DRAGON_FRAME_MS - flightSpeed * 0.3);
      if (this.animTimer >= dynamicFlapMs) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        this.setTexture(`d-fly-${this.animFrame}`);
      }

      // 3. Flight core particles
      if (flightSpeed > 50) {
        this.spawnFlightParticles(body);
      }
      return;
    }

    // Reset rotation angle for non-dragon forms
    this.angle = 0;

    // Mecha animations
    if (this.formMachine.state === FormState.MECHA) {
      if (this.animState === 'idle') {
        const frameMs = 260;
        if (this.animTimer >= frameMs) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 3;
          this.setTexture(`m-idle-${this.animFrame}`);
        }
      } else if (this.animState === 'walk') {
        const frameMs = 150;
        if (this.animTimer >= frameMs) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 4;
          this.setTexture(`m-walk-${this.animFrame}`);
        }
      } else {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y < 0) {
          this.setTexture('m-jump');
        } else {
          this.setTexture('m-fall');
        }
      }
      return;
    }

    // Human animations
    if (this.animState === 'idle') {
      if (this.animTimer >= IDLE_FRAME_MS) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        this.setTexture(`h-idle-${this.animFrame}`);
      }
    } else if (this.animState === 'walk') {
      if (this.animTimer >= WALK_FRAME_MS) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        this.setTexture(`h-walk-${this.animFrame}`);
      }
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y < 0) {
        this.setTexture('h-jump');
      } else {
        this.setTexture('h-fall');
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
  }

  private updateVisorGlowPosition(): void {
    if (!this.visorGlow) return;
    const state = this.formMachine.state;
    if (state === FormState.DRAGON) {
      this.visorGlow.setVisible(false);
      return;
    }
    this.visorGlow.setVisible(true);
    const dir = this.facingRight ? 1 : -1;
    if (state === FormState.MECHA) {
      this.visorGlow.setPosition(this.x + dir * 4, this.y - 8);
      this.visorGlow.fillColor = 0x00ffcc;
    } else {
      this.visorGlow.setPosition(this.x + dir * 8, this.y - 18);
      this.visorGlow.fillColor = 0xff3322;
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
    this.scene.tweens.add({
      targets: this,
      scaleY: 1.25,
      scaleX: 0.8,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private triggerLandingJuice(): void {
    (this.scene as any).gameAudio?.playLand();
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.78,
      scaleX: 1.22,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
    });

    const body = this.body as Phaser.Physics.Arcade.Body;
    const px = this.x;
    const py = this.y + body.height / 2;
    const isMecha = this.formMachine.state === FormState.MECHA;
    const count = isMecha ? 10 : 6;

    for (let i = 0; i < count; i++) {
      const p = this.scene.add.rectangle(
        px + Phaser.Math.Between(-18, 18),
        py,
        Phaser.Math.Between(2, isMecha ? 8 : 6),
        Phaser.Math.Between(2, 4),
        isMecha ? 0x3a4050 : 0x443325,
        0.7
      );
      p.setDepth(20);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-30, 30),
        y: p.y - Phaser.Math.Between(4, 14),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 600),
        onComplete: () => p.destroy(),
      });
    }

    if (isMecha) {
      this.scene.cameras.main.shake(80, 0.003);
    }
  }

  private spawnHoverParticles(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const px = this.x;
    const py = this.y + body.height / 2;

    for (let i = 0; i < 2; i++) {
      const col = Phaser.Math.Between(0, 1) ? 0xd61a1a : 0xffaa00; // red/orange thrusters
      const p = this.scene.add.rectangle(
        px + Phaser.Math.Between(-10, 10),
        py,
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(3, 6),
        col,
        0.85
      );
      p.setDepth(20);
      p.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-12, 12),
        y: p.y + Phaser.Math.Between(15, 30),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(200, 350),
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnFlightParticles(body: Phaser.Physics.Arcade.Body): void {
    const dir = this.facingRight ? -1 : 1;
    // Align starting point at the base of the tail/rear thruster.
    // The dragon sprite is 96x72, and since it rotates, we apply rotation offsets.
    const rad = Phaser.Math.DegToRad(this.angle);
    const offsetX = dir * 28;
    const offsetY = 4;
    
    // Rotate offset to match current dragon angle
    const px = this.x + (offsetX * Math.cos(rad) - offsetY * Math.sin(rad));
    const py = this.y + (offsetX * Math.sin(rad) + offsetY * Math.cos(rad));

    for (let i = 0; i < 2; i++) {
      const isEnergist = Math.random() > 0.4;
      const col = isEnergist 
        ? (Math.random() > 0.5 ? 0xff0066 : 0xff5ea2) // Energist pink/magenta
        : (Math.random() > 0.5 ? 0xffaa00 : 0xcc3300); // Mechanical exhaust orange/red
      
      const sz = Phaser.Math.Between(2, 5);
      const p = this.scene.add.rectangle(
        px,
        py + Phaser.Math.Between(-5, 5),
        sz, sz, col, 0.85
      );
      p.setDepth(this.depth - 1);
      p.setBlendMode(Phaser.BlendModes.ADD);

      // Eject particles backward relative to facing and velocity
      const angleRad = rad + (dir === -1 ? 0 : Math.PI);
      const spread = Phaser.Math.FloatBetween(-0.25, 0.25);
      const speedVal = Phaser.Math.Between(160, 320);
      const vx = Math.cos(angleRad + spread) * speedVal + body.velocity.x * 0.25;
      const vy = Math.sin(angleRad + spread) * speedVal + body.velocity.y * 0.25;

      this.scene.tweens.add({
        targets: p,
        x: p.x + vx * 0.2,
        y: p.y + vy * 0.2,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(220, 450),
        onComplete: () => p.destroy(),
      });
    }
  }

  takeDamage(amount: number, knockbackDir: number): void {
    if (this.isInvincible || !this.alive) return;

    this.health -= amount;
    (this.scene as any).gameAudio?.playDamage();
    this.isInvincible = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMecha = this.formMachine.state === FormState.MECHA;
    const kbX = isMecha ? knockbackDir * 80 : knockbackDir * 220;
    const kbY = isMecha ? -60 : -150;
    body.setVelocityX(kbX);
    body.setVelocityY(kbY);

    if (isMecha) {
      this.formMachine.heat.addHeat(8);
    }

    this.scene.cameras.main.shake(120, isMecha ? 0.002 : 0.004);

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
    for (let i = 0; i < 8; i++) {
      const spark = this.scene.add.rectangle(
        this.x, this.y,
        Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5),
        Math.random() > 0.5 ? 0xff3322 : 0xffaa00, 0.9
      );
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(30);
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-40, 40),
        y: spark.y + Phaser.Math.Between(-40, 40),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(200, 400),
        onComplete: () => spark.destroy(),
      });
    }

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

  destroy(fromScene?: boolean): void {
    this.formMachine.destroy();
    this.combatSystem.destroy();
    if (this.visorGlowTween) this.visorGlowTween.stop();
    if (this.visorGlow) this.visorGlow.destroy();
    super.destroy(fromScene);
  }
}
