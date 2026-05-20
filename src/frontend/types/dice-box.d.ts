declare module "@3d-dice/dice-box" {
  interface DiceBoxConfig {
    assetPath?: string;
    container?: string;
    id?: string;
    offscreen?: boolean;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    onRollComplete?: (results: DiceRollResult[]) => void;
    onDieComplete?: (result: DiceRollResult) => void;
    onThemeLoaded?: () => void;
  }

  interface DiceRollResult {
    sides: number;
    value: number;
    rollId: number;
    groupId: number;
    theme?: string;
  }

  interface DiceRollInput {
    qty: number;
    sides: number;
    value?: number;
    theme?: string;
    themeColor?: string;
  }

  class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<void>;
    roll(notation: string | string[] | DiceRollInput[]): Promise<DiceRollResult[]>;
    add(notation: string | string[] | DiceRollInput[]): Promise<DiceRollResult[]>;
    clear(): this;
    hide(className?: string): this;
    show(): this;
    updateConfig(config: Partial<DiceBoxConfig>): void;
  }

  export default DiceBox;
}
