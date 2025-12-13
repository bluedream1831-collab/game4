
export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  RAPID = 'RAPID',
  ICE = 'ICE',
  LASER = 'LASER',
  MISSILE = 'MISSILE'
}

export enum EnemyType {
  NORMAL = 'NORMAL',
  FAST = 'FAST',
  TANK = 'TANK',
  BOSS = 'BOSS',
  CRAWLER = 'CRAWLER',
  SWARM = 'SWARM',
  SWARMLING = 'SWARMLING',
  SPLITTER = 'SPLITTER',
  SPLITLING = 'SPLITLING'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  id: string;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number; // 0.0 to 1.0
  decay: number;
  color: string;
  size: number;
}

export interface FloatingText extends Entity {
  text: string;
  color: string;
  life: number;
  vx: number; // Add horizontal velocity
  vy: number;
  size: number;
  isCrit?: boolean; // Visual flair
}

export interface Tower extends Entity {
  type: TowerType;
  range: number;
  damage: number;
  cooldown: number;
  lastFired: number;
  targetId?: string;
  angle?: number; // Visual rotation angle in radians
  level: number;
  maxLevel: number;
  upgradeAnimationStart?: number; // Timestamp for visual effect
}

export interface Enemy extends Entity {
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number; // The index of the path node they are moving TOWARDS
  pathId: number; // The index of the path they are following
  frozen?: number; // timestamp until when they are slowed
  bounty: number;
  hitFlash?: number; // Timestamp of last hit
}

export interface Projectile extends Entity {
  targetId: string;
  speed: number;
  damage: number;
  color: string;
  hasHit: boolean;
  freezeDuration?: number; // If it's an ice projectile
  tailLength?: number;
  splashRadius?: number; // For AoE attacks
}

export interface WaveConfig {
  count: number;
  interval: number; // ms between spawns
  enemyType: EnemyType;
  healthMultiplier: number;
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  speed: number;    // 1x or 2x
  autoStart: boolean;
}

// Serializable Save Structure
export interface SaveData {
    gameState: GameState;
    towers: Tower[];
    levelId: string;
    timestamp: number;
    lastSupplyClaim?: number; // Timestamp for daily reward
    settings?: {
      musicVolume: number;
      sfxVolume: number;
    };
}

export interface TowerConfig {
  name: string;
  cost: number;
  range: number;
  damage: number;
  cooldown: number; // ms
  color: string;
  description: string;
  type: TowerType;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  paths: Position[][]; // Supports multiple spawn points/routes
}
