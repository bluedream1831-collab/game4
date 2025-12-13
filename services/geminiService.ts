import { GoogleGenAI } from "@google/genai";
import { GameState, Tower, TowerType, Enemy, EnemyType } from '../types';
import { TOWER_TYPES } from '../constants';

// 離線戰術資料庫 - 純本地邏輯
const GENERAL_ADVICE = [
  "指揮官，系統運作正常，隨時準備接戰。",
  "保持冷靜，慌亂是失敗的開始。",
  "多樣化的防禦塔組合通常比單一兵種更能應對複雜波次。",
  "紅色敵人移動速度一般，是測試火力的好靶子。",
  "戰術掃描顯示：敵人會隨著波次推進而變強。",
  "別忘了，點擊已建造的塔可以查看升級選項。",
  "如果防線告急，優先消滅最接近終點的敵人。"
];

export const getTacticalAdvice = async (
  gameState: GameState,
  towers: Tower[],
  enemies: Enemy[],
  previousAdvice: string
): Promise<string> => {
  
  // Attempt to use GenAI if API Key is available
  if (process.env.API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const towerSummary = towers.length > 0 
          ? towers.map(t => `${TOWER_TYPES[t.type].name}(Lv${t.level})`).join(', ') 
          : "無防禦塔";
           
      const enemyCounts = enemies.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
      
      const enemySummary = Object.keys(enemyCounts).length > 0
          ? Object.entries(enemyCounts).map(([type, count]) => {
              let name = type;
              if(type === EnemyType.NORMAL) name = '步兵';
              else if(type === EnemyType.FAST) name = '斥候';
              else if(type === EnemyType.TANK) name = '坦克';
              else if(type === EnemyType.BOSS) name = '首領';
              else if(type === EnemyType.CRAWLER) name = '爬行者';
              else if(type === EnemyType.SWARM) name = '母艦';
              else if(type === EnemyType.SWARMLING) name = '蟲群';
              else if(type === EnemyType.SPLITTER) name = '分裂者';
              else if(type === EnemyType.SPLITLING) name = '分裂體';
              return `${name}x${count}`;
          }).join(', ')
          : "無敵人";

      const systemInstruction = `你是一位《霓虹防線》塔防遊戲的戰術顧問。
請根據提供的戰場數據，提供一句簡短、有力、像是科幻軍事指揮官的戰術建議（繁體中文，30字以內）。
請針對目前的威脅（如特定敵人）或經濟狀況提出建議。
切勿重複此建議：${previousAdvice}`;

      const prompt = `
        戰場狀態：
        波次：${gameState.wave}
        資金：${gameState.money}
        生命：${gameState.lives}
        防禦塔：${towerSummary}
        敵人：${enemySummary}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (error) {
      console.warn("GenAI Advice Failed:", error);
      // Fall through to local logic
    }
  }

  // 模擬運算延遲，增加沉浸感
  await new Promise(resolve => setTimeout(resolve, 600)); 

  const tips: string[] = [];

  // --- 1. 資金分析 ---
  if (gameState.money > 800) {
      tips.push("指揮官，資金閒置過多！請立即擴充軍備！");
  } else if (gameState.money > 400 && towers.length < 4) {
      tips.push("戰場火力密度不足，建議利用資金建立交叉火網。");
  }

  // --- 2. 生命值分析 ---
  if (gameState.lives <= 3) {
      tips.push("警報！核心護盾即將離線！這是最後一道防線！");
  } else if (gameState.lives < 10) {
      tips.push("防護罩受損，請優先攔截快速移動的單位。");
  }

  // --- 3. 戰場局勢分析 ---
  const hasSniper = towers.some(t => t.type === TowerType.SNIPER);
  const hasIce = towers.some(t => t.type === TowerType.ICE);
  const hasRapid = towers.some(t => t.type === TowerType.RAPID);
  const hasLaser = towers.some(t => t.type === TowerType.LASER);
  const hasMissile = towers.some(t => t.type === TowerType.MISSILE);

  const enemyCounts = enemies.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  // 針對特定敵人的建議
  if (enemyCounts[EnemyType.TANK] && enemyCounts[EnemyType.TANK] > 0) {
      if (!hasSniper) {
        tips.push("偵測到重裝甲坦克！建議部署「軌道砲」進行破甲攻擊。");
      } else {
        tips.push("坦克正在接近，請確保軌道砲的射界沒有被阻擋。");
      }
  }

  if ((enemyCounts[EnemyType.SWARM] || 0) + (enemyCounts[EnemyType.SWARMLING] || 0) > 5) {
      if (!hasMissile && !hasRapid) {
         tips.push("大量小型單位接近中！強烈建議建造「飛彈發射器」或「機關槍」進行範圍清掃。");
      }
  }

  if ((enemyCounts[EnemyType.FAST] || 0) > 3 && !hasIce) {
      tips.push("高速單位突破中！「冷凍槍」可以有效減緩牠們的推進速度。");
  }

  if ((enemyCounts[EnemyType.SPLITTER] || 0) > 0 && !hasMissile) {
      tips.push("分裂者死後會產生更多單位，使用「飛彈發射器」的爆炸傷害可以一次解決。");
  }

  // --- 4. 發展建議 ---
  if (gameState.wave >= 5 && !hasMissile) {
      tips.push("隨著波次增加，群體傷害將變得至關重要。考慮研發飛彈科技。");
  }
  
  if (gameState.wave >= 10 && !hasSniper) {
      tips.push("後期的 Boss 單位血量極高，你需要軌道砲的單點爆發能力。");
  }

  // 如果沒有特定建議，隨機從通用庫選取
  if (tips.length === 0 || Math.random() > 0.7) {
      const generalIndex = Math.floor(Math.random() * GENERAL_ADVICE.length);
      tips.push(GENERAL_ADVICE[generalIndex]);
  }

  // 避免重複
  let selected = tips[0];
  if (tips.length > 1) {
      const candidates = tips.filter(t => t !== previousAdvice);
      if (candidates.length > 0) {
          selected = candidates[Math.floor(Math.random() * candidates.length)];
      }
  }

  return selected;
};
