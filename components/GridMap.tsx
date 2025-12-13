
import React, { useRef, useEffect, useState } from 'react';
import { GRID_W, GRID_H, CELL_SIZE, TOWER_TYPES } from '../constants';
import { Tower, Enemy, Projectile, Particle, FloatingText, TowerType, EnemyType, Position } from '../types';

interface GridMapProps {
  paths: Position[][];
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  onTileClick: (x: number, y: number) => void;
  selectedTowerType: TowerType | null;
  inspectedTower: Tower | null;
}

const GridMap: React.FC<GridMapProps> = ({ 
  paths, towers, enemies, projectiles, particles, floatingTexts, onTileClick, selectedTowerType, inspectedTower 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);

  // --- Drawing Helpers ---

  const drawSoldier = (ctx: CanvasRenderingContext2D, tower: Tower) => {
    const color = tower.type === TowerType.ICE ? '#67e8f9' : 
                  tower.type === TowerType.SNIPER ? '#3b82f6' : 
                  tower.type === TowerType.RAPID ? '#facc15' : 
                  tower.type === TowerType.LASER ? '#d946ef' : 
                  tower.type === TowerType.MISSILE ? '#ea580c' : '#4ade80';

    ctx.save();
    
    // Level Indicator
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for(let i=0; i < tower.level; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 12 + (i*3), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Rotate towards target
    ctx.rotate(tower.angle || 0);

    // Recoil
    const timeSinceFire = Date.now() - tower.lastFired;
    let recoil = 0;
    if (timeSinceFire < 100) {
        recoil = -3 * (1 - timeSinceFire / 100);
    }
    if (tower.type === TowerType.MISSILE && timeSinceFire < 300) {
        recoil = -6 * (1 - timeSinceFire / 300); // Slower, heavier recoil for missile
    }
    ctx.translate(recoil, 0);

    // -- Body Base --
    ctx.fillStyle = '#1e293b'; 
    ctx.beginPath();
    ctx.ellipse(-2, 0, 8, 10, 0, 0, Math.PI * 2); 
    ctx.fill();

    // -- Helmet/Core --
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -2, 4, 4); 

    // -- Weapon System --
    ctx.fillStyle = '#cbd5e1'; 

    if (tower.type === TowerType.RAPID) {
        ctx.fillStyle = '#facc15'; 
        ctx.fillRect(0, -6, 22, 4); 
        ctx.fillRect(0, 2, 22, 4); 
        ctx.fillStyle = '#475569';
        ctx.fillRect(-2, -7, 10, 14); 
    } else if (tower.type === TowerType.SNIPER) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, -1.5, 30, 3); 
        ctx.fillStyle = '#000';
        ctx.fillRect(2, -2, 10, 4); 
        // Scope
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(8, -4, 2, 0, Math.PI*2); ctx.stroke();
    } else if (tower.type === TowerType.ICE) {
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.moveTo(0, -3); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.lineTo(0, 3);
        ctx.fill();
        ctx.fillStyle = '#fff'; 
        ctx.fillRect(-8, -5, 6, 10);
    } else if (tower.type === TowerType.LASER) {
        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (tower.type === TowerType.MISSILE) {
        // Heavy Missile Launcher
        ctx.fillStyle = '#9a3412'; // Darker orange base
        // Left Pod
        ctx.fillRect(-4, -10, 16, 6);
        // Right Pod
        ctx.fillRect(-4, 4, 16, 6);
        
        // Loaded Missiles tips (if ready to fire)
        if (timeSinceFire > 500) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(12, -7, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 7, 2, 0, Math.PI*2); ctx.fill();
        }

        // Center Pivot
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, -10, 16, 6);
        ctx.strokeRect(-4, 4, 16, 6);
    } else {
        // Basic
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(2, -2, 18, 4);
        ctx.fillStyle = '#1e293b'; 
        ctx.beginPath(); 
        ctx.arc(8, 2, 3, 0, Math.PI*2); 
        ctx.arc(2, -2, 3, 0, Math.PI*2); 
        ctx.fill();
    }

    ctx.restore();
  };

  const drawEnemyCharacter = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
      const isHit = enemy.hitFlash && (Date.now() - enemy.hitFlash < 100);
      
      const baseColor = enemy.type === EnemyType.BOSS ? '#ec4899' : 
                    enemy.type === EnemyType.TANK ? '#8b5cf6' : 
                    enemy.type === EnemyType.FAST ? '#f97316' : 
                    enemy.type === EnemyType.CRAWLER ? '#10b981' :
                    enemy.type === EnemyType.SWARM ? '#eab308' :
                    enemy.type === EnemyType.SWARMLING ? '#fde047' : 
                    enemy.type === EnemyType.SPLITTER ? '#4f46e5' : 
                    enemy.type === EnemyType.SPLITLING ? '#818cf8' : '#ef4444';
      
      const color = isHit ? '#ff0000' : baseColor;

      // Find rotation angle
      const currentPath = paths[enemy.pathId] || paths[0];
      const nextNode = currentPath[enemy.pathIndex];
      let angle = 0;
      if (nextNode) {
          angle = Math.atan2(nextNode.y - enemy.y, nextNode.x - enemy.x);
      }

      ctx.save();
      ctx.rotate(angle);

      const tick = Date.now() / 150;
      const walkOffset = Math.sin(tick) * 3;

      if (enemy.type === EnemyType.TANK) {
          ctx.fillStyle = '#1e1b4b'; 
          ctx.fillRect(-8 + walkOffset, 6, 8, 8); 
          ctx.fillRect(-8 - walkOffset, -14, 8, 8); 
          ctx.fillStyle = color;
          ctx.fillRect(-12, -12, 24, 24);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(-8, -8, 16, 16);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, -4, 6, 8); // Cannon base
          ctx.fillStyle = '#f00';
          ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI*2); ctx.fill(); // Eye

      } else if (enemy.type === EnemyType.BOSS) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
          
          // Skull-ish face
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(4, -4, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(4, 4, 3, 0, Math.PI*2); ctx.fill();

      } else if (enemy.type === EnemyType.FAST) {
          ctx.scale(1.2, 0.8);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(10, 0); ctx.lineTo(-5, 6); ctx.lineTo(-5, -6);
          ctx.fill();
          // Engine flame
          ctx.fillStyle = '#facc15';
          ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, 3); ctx.lineTo(-10, -3); ctx.fill();

      } else if (enemy.type === EnemyType.CRAWLER) {
          ctx.fillStyle = '#064e3b';
          ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI*2); ctx.fill();
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          for(let i=0; i<3; i++) {
             const legOffset = Math.sin(tick + i) * 2;
             ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(10, 8 + legOffset); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-10, 8 - legOffset); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, -8 + legOffset); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-10, -8 - legOffset); ctx.stroke();
          }
      } else if (enemy.type === EnemyType.SWARM || enemy.type === EnemyType.SWARMLING) {
          ctx.fillStyle = color;
          const size = enemy.type === EnemyType.SWARM ? 10 : 5;
          ctx.beginPath();
          ctx.moveTo(size, 0);
          ctx.lineTo(-size, size/2);
          ctx.lineTo(-size/2, 0);
          ctx.lineTo(-size, -size/2);
          ctx.fill();
      } else {
          // Normal, Splitter
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
          // Eyes
          ctx.fillStyle = '#000';
          ctx.fillRect(2, -2, 2, 4);
      }

      // Health Bar
      ctx.rotate(-angle);
      const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
      ctx.fillStyle = '#333';
      ctx.fillRect(-10, -18, 20, 4);
      ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.2 ? '#eab308' : '#ef4444';
      ctx.fillRect(-10, -18, 20 * hpPercent, 4);

      ctx.restore();
  };

  const drawUpgradeEffect = (ctx: CanvasRenderingContext2D, tower: Tower) => {
      if (!tower.upgradeAnimationStart) return;
      const now = Date.now();
      const duration = 1000; 
      const elapsed = now - tower.upgradeAnimationStart;
      if (elapsed > duration) return;

      const progress = elapsed / duration;
      const alpha = 1 - progress;

      ctx.save();
      const maxRadius = CELL_SIZE * 1.5;
      const currentRadius = maxRadius * progress;

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`; 
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -CELL_SIZE * progress);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.stroke();
      ctx.restore();
  };

  // --- Main Render Loop ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // 1. Setup Canvas
      const width = GRID_W * CELL_SIZE;
      const height = GRID_H * CELL_SIZE;
      
      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.clearRect(0, 0, width, height);

      // 2. Draw Grid Background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      
      for(let x = 0; x <= GRID_W; x++) {
          ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, height); ctx.stroke();
      }
      for(let y = 0; y <= GRID_H; y++) {
          ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(width, y * CELL_SIZE); ctx.stroke();
      }

      // 3. Draw Path
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      paths.forEach((path, idx) => {
          if (path.length < 2) return;
          // Outer Glow
          ctx.beginPath();
          ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE/2, path[0].y * CELL_SIZE + CELL_SIZE/2);
          for (let i = 1; i < path.length; i++) {
              ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE/2, path[i].y * CELL_SIZE + CELL_SIZE/2);
          }
          ctx.strokeStyle = `rgba(6, 182, 212, 0.15)`; // Cyan glow
          ctx.lineWidth = CELL_SIZE * 0.6;
          ctx.stroke();

          // Inner Line
          ctx.strokeStyle = `rgba(6, 182, 212, 0.4)`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Spawn Point
          const start = path[0];
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath(); 
          ctx.arc(start.x * CELL_SIZE + CELL_SIZE/2, start.y * CELL_SIZE + CELL_SIZE/2, 6, 0, Math.PI*2); 
          ctx.fill();

          // End Point
          const end = path[path.length-1];
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath(); 
          ctx.arc(end.x * CELL_SIZE + CELL_SIZE/2, end.y * CELL_SIZE + CELL_SIZE/2, 8, 0, Math.PI*2); 
          ctx.fill();
      });

      // 4. Draw Towers
      towers.forEach(tower => {
        ctx.save();
        ctx.translate(tower.x * CELL_SIZE + CELL_SIZE/2, tower.y * CELL_SIZE + CELL_SIZE/2);
        
        // Draw selection range
        if (inspectedTower?.id === tower.id) {
            ctx.beginPath();
            ctx.arc(0, 0, tower.range * CELL_SIZE, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawSoldier(ctx, tower);
        drawUpgradeEffect(ctx, tower);
        ctx.restore();
      });

      // 5. Draw Enemies
      enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x * CELL_SIZE + CELL_SIZE/2, enemy.y * CELL_SIZE + CELL_SIZE/2);
        drawEnemyCharacter(ctx, enemy);
        ctx.restore();
      });

      // 6. Draw Projectiles
      projectiles.forEach(proj => {
        ctx.save();
        ctx.translate(proj.x * CELL_SIZE + CELL_SIZE/2, proj.y * CELL_SIZE + CELL_SIZE/2);
        
        if (proj.splashRadius && proj.splashRadius > 0) {
            // --- MISSILE VISUAL ---
            // Rotate projectile to face direction of movement
            // We need velocity or target vector. We can approximate using target or store velocity.
            // Simplified: projectiles move towards targetId.
            // For smoother visual, we'd need `vx, vy` in projectile state, but for now just draw a ball or simple rotation if we had prev pos.
            // Let's just draw a Rocket shape.
            ctx.fillStyle = '#ea580c';
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            
            // Tail/Fire
            ctx.fillStyle = '#fbbf24';
            const flicker = Math.random() * 2;
            ctx.beginPath(); ctx.arc(-4, 0, 3 + flicker, 0, Math.PI*2); ctx.fill();
        } else {
            // Standard laser/bullet
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
      });

      // 7. Draw Particles
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x * CELL_SIZE + CELL_SIZE/2, p.y * CELL_SIZE + CELL_SIZE/2);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Draw Floating Texts
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      floatingTexts.forEach(t => {
          ctx.save();
          ctx.translate(t.x * CELL_SIZE + CELL_SIZE/2, t.y * CELL_SIZE + CELL_SIZE/2);
          ctx.fillStyle = t.color;
          // Scale up for crit
          if (t.isCrit) {
             ctx.font = 'bold 18px "Courier New", monospace';
             ctx.shadowColor = t.color;
             ctx.shadowBlur = 5;
          }
          ctx.fillText(t.text, 0, 0);
          ctx.shadowBlur = 0;
          ctx.restore();
      });

      // 9. Ghost Tower (Placement Preview)
      if (selectedTowerType && hoverPos) {
          const config = TOWER_TYPES[selectedTowerType];
          const x = hoverPos.x * CELL_SIZE + CELL_SIZE/2;
          const y = hoverPos.y * CELL_SIZE + CELL_SIZE/2;

          ctx.save();
          ctx.translate(x, y);
          
          // Range Preview
          ctx.beginPath();
          ctx.arc(0, 0, config.range * CELL_SIZE, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          
          ctx.globalAlpha = 0.5;
          // Simple placeholder for ghost
          ctx.fillStyle = config.color.includes('green') ? '#4ade80' : 
                          config.color.includes('blue') ? '#3b82f6' : 
                          config.color.includes('orange') ? '#ea580c' : '#facc15';
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
          
          ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [paths, towers, enemies, projectiles, particles, floatingTexts, selectedTowerType, inspectedTower, hoverPos]);

  // Handle Mouse Interaction
  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
      
      if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
          setHoverPos({x, y});
      } else {
          setHoverPos(null);
      }
  };

  const handleClick = () => {
      if (hoverPos) {
          onTileClick(hoverPos.x, hoverPos.y);
      }
  };

  const handleMouseLeave = () => {
      setHoverPos(null);
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-[#020617]">
      <canvas
        ref={canvasRef}
        className="block touch-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default GridMap;
