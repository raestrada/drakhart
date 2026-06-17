export class GamepadSystem {
  private scene: Phaser.Scene;
  private pad: Gamepad | null = null;
  private prevButtons: boolean[] = [];

  // Exposed state
  public left = false;
  public right = false;
  public up = false;
  public down = false;
  public jumpPressed = false;
  public jumpJustDown = false;
  public attackJustDown = false;
  public attackPressed = false;
  public transformJustDown = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;

    for (const p of pads) {
      if (p) {
        this.pad = p;
        break;
      }
    }

    if (!this.pad) {
      this.resetInputs();
      return;
    }

    const b = this.pad.buttons;
    const axes = this.pad.axes;

    // Left stick / D-pad
    const lx = axes[0] || 0;
    const ly = axes[1] || 0;
    const deadZone = 0.3;

    this.left = lx < -deadZone || (b[14]?.pressed ?? false);
    this.right = lx > deadZone || (b[15]?.pressed ?? false);
    this.up = ly < -deadZone || (b[12]?.pressed ?? false);
    this.down = ly > deadZone || (b[13]?.pressed ?? false);

    // A button (0) = Jump
    const jumpDown = b[0]?.pressed ?? false;
    this.jumpJustDown = jumpDown && !(this.prevButtons[0] ?? false);
    this.jumpPressed = jumpDown;
    this.prevButtons[0] = jumpDown;

    // X button (2) = Attack
    const attackDown = b[2]?.pressed ?? false;
    this.attackJustDown = attackDown && !(this.prevButtons[2] ?? false);
    this.attackPressed = attackDown;
    this.prevButtons[2] = attackDown;

    // Y button (3) = Transform
    const transformDown = b[3]?.pressed ?? false;
    this.transformJustDown = transformDown && !(this.prevButtons[3] ?? false);
    this.prevButtons[3] = transformDown;
  }

  private resetInputs(): void {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.jumpPressed = false;
    this.jumpJustDown = false;
    this.attackJustDown = false;
    this.attackPressed = false;
    this.transformJustDown = false;
  }

  destroy(): void {
    this.pad = null;
    this.prevButtons = [];
    this.resetInputs();
  }
}
