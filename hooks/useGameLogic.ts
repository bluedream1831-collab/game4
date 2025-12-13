
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Tower, Enemy, Projectile, Position, Particle, FloatingText,
  TowerType, EnemyType, LevelConfig, SaveData 
} from '../types';
import { 
  INITIAL_STATE, LEVELS, 
  TOWER_TYPES, ENEMY_STATS,
  GRID_W,
  GRID_H
} from '../constants';
import { useSound } from './useSound';

const SAVE_KEY = 'neon_defense_save_v1';

export const useGameLogic = () => {
  // --- Audio ---
  const { 
    initAudio, playShoot, playHit, playExplosion, 
    playBuild, playUpgrade, playSell, playWaveStart,
    musicVolume, sfxVolume, setMusicVolume, setSfxVolume
  } = useSound();

  // --- State (React State for Rendering) ---
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [gameState, setGameState] = useState<GameState>({ ...INITIAL_STATE, isPlaying: false, isGameOver: false });
  const [towers, setTowers] = useState<Tower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [lastSupplyClaim, setLastSupplyClaim] = useState<number>(0);
  
  // --- Refs (Mutable state for Game Loop) ---
  const stateRef = useRef(gameState);
  const currentLevelRef = useRef(currentLevel); // Ref for loop access
  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextRef = useRef<FloatingText[]>([]);
  const waveActiveRef = useRef(false);
  const lastTimeRef = useRef<number>(0);
  
  // Wave Management
  const waveQueueRef = useRef<EnemyType[]>([]);
  const nextSpawnTimeRef = useRef<number>(0);

  // Sync Refs to State
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // --- Helpers ---
  const getDistance = (a: Position, b: Position) => {
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const createParticles = (x: number, y: number, color: string, count: number, explosionForce: number = 1) => {
    // Reduced particle count for performance
    const safeCount = Math.max(2, Math.floor(count / 3));
    
    for (let i = 0; i < safeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 * explosionForce;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.05, // Faster decay to clean up faster
        color: color,
        size: 1 + Math.random() * 2
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, size: number = 14, isCrit: boolean = false) => {
    // Add random position offset so numbers don't stack perfectly
    const offsetX = (Math.random() - 0.5) * 0.8;
    const offsetY = (Math.random() - 0.5) * 0.8;
    
    // Add random velocity for "pop" effect
    const vx = (Math.random() - 0.5) * 2;
    const vy = -1 - Math.random() * 2; // Upward pop

    floatingTextRef.current.push({
      id: Math.random().toString(),
      x: x + offsetX,
      y: y + offsetY, 
      text,
      color,
      life: 1.0,
      vx,
      vy,
      size: isCrit ? size * 1.5 : size,
      isCrit
    });
  };

  // --- SAVE / LOAD SYSTEM ---
  
  const saveGame = useCallback(() => {
      // Don't save if game over
      if (stateRef.current.isGameOver) return;

      const data: SaveData = {
          gameState: stateRef.current,
          towers: towersRef.current,
          levelId: currentLevelRef.current.id,
          timestamp: Date.now(),
          lastSupplyClaim,
          settings: {
            musicVolume,
            sfxVolume
          }
      };
      
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Save failed", e);
      }
  }, [lastSupplyClaim, musicVolume, sfxVolume]);

  // Auto-save logic: Save when wave ends, or money changes significantly, or periodically
  useEffect(() => {
      const interval = setInterval(() => {
          if (stateRef.current.isPlaying) return; // Don't save mid-wave usually, or maybe do. Let's save.
          saveGame();
      }, 10000); // Auto save every 10 seconds
      return () => clearInterval(interval);
  }, [saveGame]);

  const loadGame = useCallback(() => {
      try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (!raw) return false;
          
          const data: SaveData = JSON.parse(raw);
          
          // Restore Level
          const level = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
          setCurrentLevel(level);
          
          // Restore State
          setGameState({
              ...data.gameState,
              isPlaying: false // Pause on load
          });
          
          // Restore Towers
          towersRef.current = data.towers;
          setTowers(data.towers);

          if (data.lastSupplyClaim) {
              setLastSupplyClaim(data.lastSupplyClaim);
          }

          // Restore Settings
          if (data.settings) {
            setMusicVolume(data.settings.musicVolume);
            setSfxVolume(data.settings.sfxVolume);
          }

          // Clear others
          enemiesRef.current = [];
          projectilesRef.current = [];
          particlesRef.current = [];
          floatingTextRef.current = [];
          setEnemies([]);
          setProjectiles([]);
          
          return true;
      } catch (e) {
          console.error("Load failed", e);
          return false;
      }
  }, [setMusicVolume, setSfxVolume]);

  // Initialize: Try load on mount once
  useEffect(() => {
     const hasSave = localStorage.getItem(SAVE_KEY);
     if (hasSave) {
         loadGame();
     }
  }, [loadGame]);

  const exportSaveString = () => {
      saveGame(); // Ensure latest
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? btoa(raw) : ""; // Base64 encode for simple obfuscation
  };

  const importSaveString = (str: string) => {
      try {
          const decoded = atob(str);
          // Validate JSON structure loosely
          const data = JSON.parse(decoded);
          if (data.gameState && data.towers) {
              localStorage.setItem(SAVE_KEY, decoded);
              loadGame();
              return true;
          }
      } catch (e) {
          console.error("Import failed", e);
      }
      return false;
  };

  const claimDailyReward = () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastSupplyClaim > oneDay) {
          const reward = 200 + (gameState.wave * 10);
          setGameState(prev => ({ ...prev, money: prev.money + reward }));
          setLastSupplyClaim(now);
          addFloatingText(GRID_W/2, GRID_H/2, `補給: +$${reward}`, '#facc15', 30, true);
          createParticles(GRID_W/2, GRID_H/2, '#facc15', 50, 4);
          saveGame();
          return true;
      }
      return false;
  };

  const selectLevel = (levelId: string) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (level) {
        restartGame(); // Reset everything
        setCurrentLevel(level);
    }
  };

  const toggleSpeed = useCallback(() => {
    setGameState(prev => ({
        ...prev,
        speed: prev.speed === 1 ? 2 : 1
    }));
  }, []);

  const toggleAutoStart = () => {
    setGameState(prev => ({
        ...prev,
        autoStart: !prev.autoStart
    }));
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'KeyS') {
            toggleSpeed();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSpeed]);

  const spawnEnemy = (type: EnemyType) => {
    const stats = ENEMY_STATS[type];
    // Randomly assign a path from the CURRENT LEVEL
    const levelPaths = currentLevelRef.current.paths;
    const pathId = Math.floor(Math.random() * levelPaths.length);
    const startPos = levelPaths[pathId][0];

    // BOSS SCALING BUFF
    let healthMultiplier = 1 + (stateRef.current.wave * 0.2); // Default scaling
    if (type === EnemyType.BOSS) {
        healthMultiplier = 1 + (stateRef.current.wave * 0.5); // Boss scales much harder
    }

    const newEnemy: Enemy = {
      id: Math.random().toString(36).substr(2, 9),
      x: startPos.x,
      y: startPos.y,
      type,
      health: stats.health * healthMultiplier,
      maxHealth: stats.health * healthMultiplier,
      speed: stats.speed,
      pathIndex: 1, 
      pathId: pathId,
      bounty: stats.bounty
    };
    enemiesRef.current.push(newEnemy);
  };

  const startWave = useCallback(() => {
    initAudio(); // Ensure audio is ready
    if (waveActiveRef.current || stateRef.current.isGameOver) return;
    
    playWaveStart();

    setGameState(prev => ({ ...prev, isPlaying: true }));
    waveActiveRef.current = true;
    
    const waveNum = stateRef.current.wave;
    const enemyCount = 5 + Math.floor(waveNum * 1.5);
    const queue: EnemyType[] = [];
    
    for (let i = 0; i < enemyCount; i++) {
      // Composition logic
      if (waveNum % 5 === 0 && i === enemyCount - 1) {
        queue.push(EnemyType.BOSS);
      } else if (waveNum > 3 && i % 6 === 0) {
        queue.push(EnemyType.SPLITTER);
      } else if (waveNum > 4 && i % 5 === 0) {
        queue.push(EnemyType.SWARM);
      } else if (waveNum > 3 && i % 4 === 0) {
        queue.push(EnemyType.TANK);
      } else if (waveNum > 2 && i % 3 === 0) {
        queue.push(EnemyType.FAST);
      } else if (waveNum > 1 && i % 4 === 2) {
        queue.push(EnemyType.CRAWLER);
      } else {
        queue.push(EnemyType.NORMAL);
      }
    }
    
    waveQueueRef.current = queue;
    nextSpawnTimeRef.current = Date.now();
  }, [playWaveStart, initAudio]);

  const placeTower = (x: number, y: number, type: TowerType) => {
    initAudio();
    const config = TOWER_TYPES[type];
    if (stateRef.current.money >= config.cost && !stateRef.current.isGameOver) {
      
      const onTower = towersRef.current.some(t => Math.round(t.x) === x && Math.round(t.y) === y);
      
      // Check collision with ALL paths in CURRENT LEVEL
      const levelPaths = currentLevelRef.current.paths;
      let onPathLine = false;
      for (const path of levelPaths) {
        // Check exact path nodes
        const onPathNode = path.some(p => Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5);
        if (onPathNode) {
            onPathLine = true;
            break;
        }

        // Check path segments
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i+1];
            // Distance from point to line segment
            const crossProduct = (y - p1.y) * (p2.x - p1.x) - (x - p1.x) * (p2.y - p1.y);
            if (Math.abs(crossProduct) < 0.1) { 
               const dotProduct = (x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y);
               const squaredLength = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
               if (dotProduct >= 0 && dotProduct <= squaredLength) {
                   onPathLine = true;
                   break;
               }
            }
        }
        if (onPathLine) break;
      }

      if (!onTower && !onPathLine) {
        const newTower: Tower = {
          id: Math.random().toString(36).substr(2, 9),
          x,
          y,
          type,
          range: config.range,
          damage: config.damage,
          cooldown: config.cooldown,
          lastFired: 0,
          angle: 0,
          level: 1,
          maxLevel: 3
        };
        
        towersRef.current.push(newTower);
        
        // Visual effect for placing
        createParticles(x, y, config.color.includes('green') ? '#4ade80' : '#60a5fa', 15, 2);
        playBuild();

        setTowers([...towersRef.current]);
        
        setGameState(prev => ({
          ...prev,
          money: prev.money - config.cost
        }));
        saveGame(); // Save on build
        return true;
      }
    }
    return false;
  };

  const upgradeTower = (towerId: string) => {
    initAudio();
    const towerIndex = towersRef.current.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;

    const tower = towersRef.current[towerIndex];
    const config = TOWER_TYPES[tower.type];
    // Cost formula: BaseCost * 0.8 * Level
    const upgradeCost = Math.floor(config.cost * 0.8 * tower.level);

    if (stateRef.current.money >= upgradeCost && tower.level < tower.maxLevel) {
       tower.level += 1;
       tower.damage *= 1.3; // +30% damage
       tower.range *= 1.1;  // +10% range
       tower.upgradeAnimationStart = Date.now(); // Trigger Animation

       if (tower.type === TowerType.RAPID) tower.cooldown *= 0.9; // Faster fire for rapid

       setGameState(prev => ({ ...prev, money: prev.money - upgradeCost }));
       setTowers([...towersRef.current]);
       
       createParticles(tower.x, tower.y, '#facc15', 30, 3); // Gold particles
       addFloatingText(tower.x, tower.y, "升級!", '#facc15', 16);
       playUpgrade();
       saveGame(); // Save on upgrade
    }
  };

  const sellTower = (towerId: string) => {
    initAudio();
    const towerIndex = towersRef.current.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;
    
    const tower = towersRef.current[towerIndex];
    const config = TOWER_TYPES[tower.type];
    // Sell value: 50% of base + 50% of upgrade costs approximately
    const sellValue = Math.floor(config.cost * 0.5 * tower.level);

    towersRef.current.splice(towerIndex, 1);
    setTowers([...towersRef.current]);
    setGameState(prev => ({ ...prev, money: prev.money + sellValue }));
    
    createParticles(tower.x, tower.y, '#fff', 10, 1);
    addFloatingText(tower.x, tower.y, `+$${sellValue}`, '#10b981', 16);
    playSell();
    saveGame();
  };

  // --- Game Loop ---
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      const dt = Math.min(deltaTime, 50) / 1000; 

      if (stateRef.current.isGameOver) return; 

      const now = Date.now();
      const speed = stateRef.current.speed;

      // 1. Spawning (Adjusted for speed)
      if (waveActiveRef.current && waveQueueRef.current.length > 0) {
        if (now >= nextSpawnTimeRef.current) {
          const nextEnemy = waveQueueRef.current.shift();
          if (nextEnemy) {
            spawnEnemy(nextEnemy);
            // Compress interval by speed
            nextSpawnTimeRef.current = now + (1200 / speed); 
          }
        }
      } else if (waveActiveRef.current && waveQueueRef.current.length === 0 && enemiesRef.current.length === 0) {
        // Wave Complete
        waveActiveRef.current = false;
        setGameState(prev => ({
          ...prev,
          wave: prev.wave + 1,
          money: prev.money + 50 + (prev.wave * 10),
          isPlaying: false
        }));
        saveGame(); // Save on wave complete
        
        // Auto Start Logic
        if (stateRef.current.autoStart && !stateRef.current.isGameOver) {
            setTimeout(() => startWave(), 500 / speed);
        }
      }

      // 2. Enemy Movement (Multiplied by speed)
      enemiesRef.current.forEach(enemy => {
        // Look up the specific path for this enemy
        const levelPaths = currentLevelRef.current.paths;
        const path = levelPaths[enemy.pathId];
        const target = path[enemy.pathIndex];
        
        if (!target) return;

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        let currentSpeed = enemy.speed;
        if (enemy.frozen && enemy.frozen > now) {
            currentSpeed *= 0.5;
            // Ice particles while frozen
            if (Math.random() > 0.8) {
               particlesRef.current.push({
                 id: Math.random().toString(),
                 x: enemy.x + (Math.random()-0.5)*0.5,
                 y: enemy.y + (Math.random()-0.5)*0.5,
                 vx: 0, vy: 0.5, life: 0.5, decay: 0.05,
                 color: '#67e8f9', size: 1
               });
            }
        }

        // --- SPEED APPLIED HERE ---
        const moveDist = currentSpeed * dt * speed;

        if (dist <= moveDist) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.pathIndex++;
          
          if (enemy.pathIndex >= path.length) {
            enemy.health = 0; 
            setGameState(prev => {
                const newLives = prev.lives - 1;
                if (newLives <= 0) return { ...prev, lives: 0, isGameOver: true };
                return { ...prev, lives: newLives };
            });
            createParticles(enemy.x, enemy.y, '#ef4444', 20, 2); // Base damage effect
            addFloatingText(enemy.x, enemy.y, "防線失守!", '#ef4444', 18);
            playExplosion();
          }
        } else {
          enemy.x += (dx / dist) * moveDist;
          enemy.y += (dy / dist) * moveDist;

          // --- TRAIL PARTICLES ---
          if (Math.random() < 0.25) {
             particlesRef.current.push({
                 id: Math.random().toString(),
                 x: enemy.x + (Math.random() - 0.5) * 0.2,
                 y: enemy.y + (Math.random() - 0.5) * 0.2,
                 vx: 0, vy: 0, // Stationary trails
                 life: 0.4,
                 decay: 0.05,
                 color: ENEMY_STATS[enemy.type].color,
                 size: enemy.type === EnemyType.BOSS ? 2.5 : 1.5
             });
          }
        }
      });
      enemiesRef.current = enemiesRef.current.filter(e => e.health > 0);

      // 3. Tower Logic
      towersRef.current.forEach(tower => {
        // Target cleanup
        if (tower.targetId) {
            const targetExists = enemiesRef.current.find(e => e.id === tower.targetId);
            if (!targetExists || getDistance(tower, targetExists) > tower.range) {
                tower.targetId = undefined;
            }
        }

        // Target acquisition
        if (!tower.targetId) {
            let closestDist = tower.range;
            let target: Enemy | null = null;
            enemiesRef.current.forEach(enemy => {
                const d = getDistance(tower, enemy);
                if (d <= tower.range && d < closestDist) {
                     closestDist = d;
                     target = enemy;
                }
            });
            if (target) tower.targetId = (target as Enemy).id;
        }

        // Rotation logic (visual)
        if (tower.targetId) {
            const target = enemiesRef.current.find(e => e.id === tower.targetId);
            if (target) {
                const dx = target.x - tower.x;
                const dy = target.y - tower.y;
                tower.angle = Math.atan2(dy, dx);
            }
        }

        // Firing (Cooldown compressed by speed)
        if (tower.targetId && now - tower.lastFired >= (tower.cooldown / speed)) {
            const target = enemiesRef.current.find(e => e.id === tower.targetId);
            if (target) {
                // SPECIAL LOGIC FOR LASER TOWER
                if (tower.type === TowerType.LASER) {
                    // Instant Hit Logic
                    target.health -= tower.damage;
                    target.hitFlash = now;
                    playShoot(tower.type);
                    tower.lastFired = now;

                    // Particle at impact
                    createParticles(target.x, target.y, '#d946ef', 2, 0.5);

                    // Check death instantly (code reuse from projectile logic)
                    if (target.health <= 0) {
                        // Handle death
                        handleEnemyDeath(target);
                    }
                } else {
                    // Standard Projectile Logic
                    const variance = (Math.random() - 0.5) * 0.1; 
                    projectilesRef.current.push({
                        id: Math.random().toString(),
                        x: tower.x,
                        y: tower.y,
                        targetId: tower.targetId,
                        speed: 15,
                        damage: tower.damage,
                        color: tower.type === TowerType.ICE ? '#67e8f9' : 
                               tower.type === TowerType.SNIPER ? '#3b82f6' : 
                               tower.type === TowerType.RAPID ? '#facc15' : 
                               tower.type === TowerType.MISSILE ? '#ea580c' : '#4ade80',
                        hasHit: false,
                        freezeDuration: tower.type === TowerType.ICE ? 2000 : 0,
                        splashRadius: tower.type === TowerType.MISSILE ? 2.5 : 0
                    });
                    tower.lastFired = now;
                    playShoot(tower.type);
                }
            }
        }
      });

      // 4. Projectiles (Speed multiplier)
      projectilesRef.current.forEach(proj => {
          const target = enemiesRef.current.find(e => e.id === proj.targetId);
          
          // Special case: Projectile target died mid-flight.
          // For Missiles, we want them to explode at the last known location or just fizzle?
          // Let's make missiles simple: if target dies, missile fizzles for now to avoid complexity of tracking dead coords.
          if (!target) {
              proj.hasHit = true; 
              createParticles(proj.x, proj.y, proj.color, 3, 0.5); 
              return;
          }

          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          const dist = Math.hypot(dx, dy);
          // --- SPEED APPLIED HERE ---
          const moveDist = proj.speed * dt * speed; 

          if (dist <= moveDist || dist < 0.5) {
              proj.hasHit = true;
              
              if (proj.splashRadius && proj.splashRadius > 0) {
                  // --- SPLASH DAMAGE LOGIC ---
                  playExplosion(); // Bigger sound for missile
                  createParticles(target.x, target.y, '#ea580c', 25, 3); // Big explosion
                  
                  // Iterate all enemies to apply splash
                  // Note: we iterate a copy or just access current state. 
                  // We need to be careful about handleEnemyDeath removing items? 
                  // No, handleEnemyDeath only sets health=0 or removes from React state/renders, 
                  // but we are operating on refs that are filtered at end of loop.
                  // Actually handleEnemyDeath DOES NOT remove from enemiesRef directly, the filter does.
                  
                  enemiesRef.current.forEach(e => {
                      const d = getDistance({x: e.x, y: e.y}, {x: target.x, y: target.y});
                      if (d <= proj.splashRadius!) {
                          e.health -= proj.damage;
                          e.hitFlash = now;
                          addFloatingText(e.x, e.y, Math.floor(proj.damage).toString(), '#ea580c', 20, true);
                          if (e.health <= 0) handleEnemyDeath(e);
                      }
                  });
              } else {
                  // --- SINGLE TARGET LOGIC ---
                  target.health -= proj.damage;
                  target.hitFlash = now;
                  
                  createParticles(target.x, target.y, proj.color, 5, 1);
                  playHit();
                  
                  const isCrit = Math.random() > 0.85; 
                  const displayDamage = Math.floor(proj.damage);
                  const damageColor = isCrit ? '#fef08a' : '#ff9999'; 
                  addFloatingText(target.x, target.y, displayDamage.toString(), damageColor, 20, isCrit);
                  
                  if (proj.freezeDuration) target.frozen = now + (proj.freezeDuration / speed); 

                  if (target.health <= 0) {
                      handleEnemyDeath(target);
                  }
              }
          } else {
              proj.x += (dx / dist) * moveDist;
              proj.y += (dy / dist) * moveDist;
              // Trail particles
              if (Math.random() > 0.5) {
                 particlesRef.current.push({
                   id: Math.random().toString(),
                   x: proj.x, y: proj.y,
                   vx: 0, vy: 0, life: 0.3, decay: 0.1,
                   color: proj.color, 
                   size: proj.splashRadius ? 2.5 : 1.5 // Bigger trail for missiles
                 });
              }
          }
      });
      projectilesRef.current = projectilesRef.current.filter(p => !p.hasHit);

      // 5. Particles (Decay multiplied by speed)
      particlesRef.current.forEach(p => {
         p.x += p.vx * dt * speed;
         p.y += p.vy * dt * speed;
         p.life -= p.decay * speed;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // 6. Floating Texts
      floatingTextRef.current.forEach(t => {
          t.x += t.vx * dt * speed; // Apply horizontal physics
          t.y += t.vy * dt * speed;
          t.vy += 2 * dt * speed; // Gravity effect
          t.life -= 1.0 * dt * speed;
      });
      floatingTextRef.current = floatingTextRef.current.filter(t => t.life > 0);

      // Render Update
      setEnemies([...enemiesRef.current]);
      setProjectiles([...projectilesRef.current]);
      setParticles([...particlesRef.current]);
      setFloatingTexts([...floatingTextRef.current]);

      lastTimeRef.current = timestamp;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Shared death logic
  const handleEnemyDeath = (target: Enemy) => {
       // Prevent double rewards if processed in same frame
       if (target.health < -999) return; 
       
       setGameState(prev => ({
           ...prev,
           money: prev.money + target.bounty,
           score: prev.score + target.bounty
       }));
       
       // Mark as definitely dead so we don't process again
       target.health = -1000; 

       // Death Explosion
       const enemyColor = ENEMY_STATS[target.type].color;
       createParticles(target.x, target.y, enemyColor, 15, 2);
       addFloatingText(target.x, target.y, `+$${target.bounty}`, '#fbbf24', 24);
       playExplosion();

       // --- SPECIAL ENEMY DEATH LOGIC ---
       if (target.type === EnemyType.SWARM) {
          // Spawn swarmlings
          for (let i = 0; i < 3; i++) {
            const offset = (Math.random() - 0.5) * 0.5;
            const swarmlingStats = ENEMY_STATS[EnemyType.SWARMLING];
            enemiesRef.current.push({
                id: Math.random().toString(36).substr(2, 9),
                x: target.x + offset,
                y: target.y + offset,
                type: EnemyType.SWARMLING,
                health: swarmlingStats.health * (1 + (stateRef.current.wave * 0.1)),
                maxHealth: swarmlingStats.health * (1 + (stateRef.current.wave * 0.1)),
                speed: swarmlingStats.speed,
                pathIndex: target.pathIndex,
                pathId: target.pathId, // Inherit path
                bounty: swarmlingStats.bounty
            });
          }
       } else if (target.type === EnemyType.SPLITTER) {
          // Spawn 2 Splitlings
          for (let i = 0; i < 2; i++) {
            const offset = (Math.random() - 0.5) * 0.5; 
            const splitlingStats = ENEMY_STATS[EnemyType.SPLITLING];
            enemiesRef.current.push({
                id: Math.random().toString(36).substr(2, 9),
                x: target.x + offset,
                y: target.y + offset,
                type: EnemyType.SPLITLING,
                health: splitlingStats.health * (1 + (stateRef.current.wave * 0.15)),
                maxHealth: splitlingStats.health * (1 + (stateRef.current.wave * 0.15)),
                speed: splitlingStats.speed,
                pathIndex: target.pathIndex,
                pathId: target.pathId,
                bounty: splitlingStats.bounty
            });
          }
       }
  };

  const restartGame = () => {
      setGameState({ ...INITIAL_STATE, isPlaying: false, isGameOver: false });
      towersRef.current = [];
      enemiesRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      floatingTextRef.current = [];
      waveQueueRef.current = [];
      setTowers([]);
      setEnemies([]);
      setProjectiles([]);
      setParticles([]);
      setFloatingTexts([]);
      saveGame(); // Save clean slate
  };

  return {
    gameState,
    currentLevel,
    selectLevel,
    towers: towersRef.current,
    enemies,
    projectiles,
    particles,
    floatingTexts,
    placeTower,
    startWave,
    restartGame,
    upgradeTower,
    sellTower,
    initAudio,
    toggleSpeed,
    toggleAutoStart,
    // New exports
    importSaveString,
    exportSaveString,
    claimDailyReward,
    lastSupplyClaim,
    // Volume
    musicVolume, 
    sfxVolume, 
    setMusicVolume, 
    setSfxVolume
  };
};
