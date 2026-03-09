export type Runner = {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  jumpPower: number;
  gravity: number;
  isGrounded: boolean;
  angle: number;
};

export type Obstacle = {
  x: number;
  width: number;
  height: number;
  type: 'MANAGER' | 'CABINET';
  tieColor: string;
  skinColor: string;
  hairColor: string;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

export type WeirdlingRunnerEngineParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  weirdlingImgRef: React.RefObject<HTMLImageElement | null>;
  gameOver: boolean;
  score: number;
  highScore: number;
  imageLoaded: boolean;
  setGameOver: (value: boolean) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setHighScore: (value: number) => void;
};
