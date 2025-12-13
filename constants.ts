
import { TowerType, TowerConfig, Position, EnemyType, LevelConfig } from './types';

export const GRID_W = 20;
export const GRID_H = 12;
export const CELL_SIZE = 40; // Pixels (roughly, for calculation logic)
export const GAME_TICK_RATE = 1000 / 60; // 60 FPS

// --- LEVEL DEFINITIONS ---

const LEVEL_1_PATHS: Position[][] = [
  // Classic Bottom Dip
  [
    { x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 8 }, 
    { x: 10, y: 8 }, { x: 10, y: 3 }, { x: 16, y: 3 }, 
    { x: 16, y: 9 }, { x: 19, y: 9 }
  ]
];

const LEVEL_2_PATHS: Position[][] = [
  // The Zig-Zag
  [
    { x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 10 }, 
    { x: 7, y: 10 }, { x: 7, y: 1 }, { x: 11, y: 1 },
    { x: 11, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 1 },
    { x: 19, y: 1 }
  ]
];

const LEVEL_3_PATHS: Position[][] = [
  // The Pincer (Dual Spawn)
  // Top Path
  [
    { x: 0, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 5 }, { x: 19, y: 5 }
  ],
  // Bottom Path
  [
    { x: 0, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 6 }, { x: 19, y: 6 }
  ]
];

const LEVEL_4_PATHS: Position[][] = [
  // The Spiral (Center Rush)
  [
    { x: 0, y: 0 }, { x: 18, y: 0 }, { x: 18, y: 10 }, 
    { x: 2, y: 10 }, { x: 2, y: 2 }, { x: 15, y: 2 }, 
    { x: 15, y: 8 }, { x: 5, y: 8 }, { x: 5, y: 5 }, { x: 10, y: 5 }
  ]
];

const LEVEL_5_PATHS: Position[][] = [
  // The Omega (Long Winding)
  [
    { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 2 }, 
    { x: 6, y: 2 }, { x: 6, y: 9 }, { x: 10, y: 9 }, 
    { x: 10, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 10 }, 
    { x: 18, y: 10 }, { x: 18, y: 6 }, { x: 19, y: 6 }
  ]
];

export const LEVELS: LevelConfig[] = [
  {
    id: 'lvl1',
    name: '防區 Alpha',
    description: '標準訓練場地。適合測試新型武器。',
    difficulty: 'EASY',
    paths: LEVEL_1_PATHS
  },
  {
    id: 'lvl2',
    name: '蛇形走廊',
    description: '狹窄的折返路徑，考驗射程覆蓋率。',
    difficulty: 'MEDIUM',
    paths: LEVEL_2_PATHS
  },
  {
    id: 'lvl3',
    name: '雙子星匯流',
    description: '敵人從兩路夾擊。注意火力分配。',
    difficulty: 'HARD',
    paths: LEVEL_3_PATHS
  },
  {
    id: 'lvl4',
    name: '漩渦核心',
    description: '極長的螺旋路徑，但核心區域容易被突破。',
    difficulty: 'MEDIUM',
    paths: LEVEL_4_PATHS
  },
  {
    id: 'lvl5',
    name: '歐米茄迷宮',
    description: '極限長度，但敵人數量將大幅增加。',
    difficulty: 'EXTREME',
    paths: LEVEL_5_PATHS
  }
];

// Default fallback
export const DEFAULT_PATHS = LEVELS[0].paths;

export const TOWER_TYPES: Record<TowerType, TowerConfig> = {
  [TowerType.BASIC]: {
    name: '爆能槍',
    type: TowerType.BASIC,
    cost: 50,
    range: 3.5, // Grid cells
    damage: 20,
    cooldown: 800,
    color: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]',
    description: '傷害與速度平衡。'
  },
  [TowerType.RAPID]: {
    name: '機關槍',
    type: TowerType.RAPID,
    cost: 120,
    range: 2.5,
    damage: 8,
    cooldown: 150,
    color: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]',
    description: '高射速，低單發傷害。'
  },
  [TowerType.SNIPER]: {
    name: '軌道砲',
    type: TowerType.SNIPER,
    cost: 250,
    range: 7,
    damage: 100,
    cooldown: 2000,
    color: 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]',
    description: '超遠射程與高傷害，裝填慢。'
  },
  [TowerType.ICE]: {
    name: '冷凍槍',
    type: TowerType.ICE,
    cost: 150,
    range: 3,
    damage: 5,
    cooldown: 1000,
    color: 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]',
    description: '緩速敵人。'
  },
  [TowerType.LASER]: {
    name: '光稜塔',
    type: TowerType.LASER,
    cost: 180,
    range: 4.5,
    damage: 5, // Low damage per tick, but fast ticks
    cooldown: 100, // Very fast firing (acts as continuous beam)
    color: 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]',
    description: '持續性雷射，必定命中。'
  },
  [TowerType.MISSILE]: {
    name: '飛彈發射器',
    type: TowerType.MISSILE,
    cost: 350,
    range: 5.5,
    damage: 40,
    cooldown: 2500,
    color: 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.8)]',
    description: '造成大範圍爆炸傷害。'
  }
};

export const ENEMY_STATS: Record<EnemyType, { speed: number; health: number; color: string; bounty: number }> = {
  [EnemyType.NORMAL]: { speed: 2.5, health: 60, color: '#ef4444', bounty: 10 },
  [EnemyType.FAST]: { speed: 4.5, health: 30, color: '#f97316', bounty: 15 },
  [EnemyType.TANK]: { speed: 1.5, health: 200, color: '#8b5cf6', bounty: 25 },
  [EnemyType.BOSS]: { speed: 1.0, health: 1000, color: '#ec4899', bounty: 100 },
  [EnemyType.CRAWLER]: { speed: 1.5, health: 120, color: '#10b981', bounty: 18 }, // Slow, high health, green
  [EnemyType.SWARM]: { speed: 3.0, health: 50, color: '#eab308', bounty: 12 }, // Medium, spawns children, yellow
  [EnemyType.SWARMLING]: { speed: 5.0, health: 15, color: '#fde047', bounty: 2 }, // Fast, weak, tiny yellow
  [EnemyType.SPLITTER]: { speed: 2.0, health: 80, color: '#4f46e5', bounty: 20 }, // Indigo
  [EnemyType.SPLITLING]: { speed: 3.5, health: 40, color: '#818cf8', bounty: 8 }, // Light Indigo
};

export const INITIAL_STATE = {
  money: 120,
  lives: 20,
  wave: 1,
  score: 0,
  speed: 1,
  autoStart: false
};
