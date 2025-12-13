
import React, { useState } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GridMap from './components/GridMap';
import { TOWER_TYPES, LEVELS } from './constants';
import { TowerType, Tower } from './types';
import { getTacticalAdvice } from './services/geminiService';
import { useSound } from './hooks/useSound';

const App: React.FC = () => {
  const { 
    gameState, currentLevel, selectLevel, towers, enemies, projectiles, particles, floatingTexts,
    placeTower, startWave, restartGame, upgradeTower, sellTower, initAudio, toggleSpeed, toggleAutoStart,
    importSaveString, exportSaveString, claimDailyReward, lastSupplyClaim,
    musicVolume, sfxVolume, setMusicVolume, setSfxVolume
  } = useGameLogic();

  const { playUI, playError, playBuild } = useSound();

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [inspectedTowerId, setInspectedTowerId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string>("歡迎指揮官。戰術資料庫已連線。");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [importString, setImportString] = useState("");
  
  // Replace this with your actual blog URL
  const AUTHOR_BLOG_URL = "https://vocus.cc/user/@WUCJ";

  // Derived state for the currently inspected tower object
  const inspectedTower = towers.find((t: Tower) => t.id === inspectedTowerId) || null;
  
  // Check if next wave is a BOSS wave (multiples of 5)
  const isBossWave = gameState.wave % 5 === 0;

  const handleTileClick = (x: number, y: number) => {
    initAudio(); // Initialize audio context on interaction
    
    // 1. Check if clicked on an existing tower
    const existingTower = towers.find((t: Tower) => Math.round(t.x) === x && Math.round(t.y) === y);
    
    if (existingTower) {
        playUI();
        // If we were building, cancel build mode
        setSelectedTowerType(null);
        // Select the tower for inspection
        setInspectedTowerId(existingTower.id);
    } else {
        // 2. Empty tile clicked
        if (selectedTowerType) {
            const success = placeTower(x, y, selectedTowerType);
            if (!success) playError();
            // Optional: Deselect after placement or keep building? Let's keep building for ease.
        } else {
            // Deselect everything
            if (inspectedTowerId) playUI();
            setInspectedTowerId(null);
        }
    }
  };

  const handleAskAI = async () => {
    initAudio();
    playUI();
    
    if (loadingAdvice) return;
    
    setLoadingAdvice(true);
    setAdvice("正在檢索戰術資料庫...");
    
    // Completely offline call
    const tip = await getTacticalAdvice(gameState, towers, enemies, advice);
    setAdvice(tip);
    setLoadingAdvice(false);
  };

  const handleLevelSelect = (levelId: string) => {
      initAudio();
      playBuild(); // Use build sound as confirmation
      selectLevel(levelId);
      setShowLevelSelect(false);
  };

  const handleExport = () => {
      const str = exportSaveString();
      navigator.clipboard.writeText(str).then(() => {
          alert("存檔代碼已複製到剪貼簿！");
      });
  };

  const handleImport = () => {
      if (importString) {
          const success = importSaveString(importString);
          if (success) {
              alert("存檔讀取成功！");
              setShowSettings(false);
          } else {
              alert("無效的存檔代碼。");
          }
      }
  };

  const handleClaimReward = () => {
      const success = claimDailyReward();
      if (success) {
          playBuild();
      } else {
          playError();
      }
  };

  // Check if daily reward is available
  const canClaimDaily = (Date.now() - lastSupplyClaim) > (24 * 60 * 60 * 1000);

  // Helper to get upgrade cost
  const getUpgradeCost = (tower: Tower) => {
      const config = TOWER_TYPES[tower.type];
      return Math.floor(config.cost * 0.8 * tower.level);
  };
  
  // Helper to get sell value
  const getSellValue = (tower: Tower) => {
      const config = TOWER_TYPES[tower.type];
      return Math.floor(config.cost * 0.5 * tower.level);
  };

  // Helper to calculate next stats for preview
  const getNextStats = (tower: Tower) => {
      const isRapid = tower.type === TowerType.RAPID;
      return {
          damage: Math.round(tower.damage * 1.3),
          range: parseFloat((tower.range * 1.1).toFixed(1)),
          cooldown: isRapid ? Math.round(tower.cooldown * 0.9) : tower.cooldown
      };
  };

  const handleSelectTower = (type: TowerType) => {
      initAudio();
      if (gameState.money >= TOWER_TYPES[type].cost) {
          playUI();
          setSelectedTowerType(type);
      } else {
          playError();
      }
  };

  const handleRestart = () => {
      initAudio();
      playUI();
      restartGame();
  }

  const handleOpenLevelSelect = () => {
      initAudio();
      playUI();
      setShowLevelSelect(true);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-mono flex flex-col items-center p-2 sm:p-4 selection:bg-cyan-500/30" onClick={initAudio}>
      
      {/* Removed heavy background blur elements for performance */}

      <div className="z-10 w-full max-w-7xl flex flex-col gap-4 sm:gap-6">
        
        {/* Header HUD */}
        <header className="w-full flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl gap-4">
          <div className="w-full md:w-auto flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              霓虹防線
            </h1>
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                 <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mt-1">戰術防禦系統 v10.4 (Single Player)</p>
                 <button onClick={handleOpenLevelSelect} className="text-[10px] text-cyan-400 border border-cyan-800/50 px-2 py-0.5 rounded hover:bg-cyan-900/50 transition-colors uppercase tracking-wider">
                    切換地圖
                 </button>
                 <button onClick={() => setShowSettings(true)} className="text-[10px] text-slate-400 border border-slate-800 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors uppercase tracking-wider flex items-center gap-1">
                    ⚙ 系統設定
                 </button>
                 {/* Explicit Blog Link in Header */}
                 <a 
                   href={AUTHOR_BLOG_URL}
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-[10px] text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded hover:bg-pink-900/30 transition-colors uppercase tracking-wider flex items-center gap-1 hover:shadow-[0_0_8px_rgba(236,72,153,0.4)]"
                 >
                    ♥ 攻略與日誌
                 </a>
            </div>
          </div>
          
          {/* Stats Bar (Mobile Optimized) */}
          <div className="flex gap-4 sm:gap-8 justify-center w-full md:w-auto">
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase text-slate-500 tracking-wider">資金</span>
               <span className="text-xl sm:text-2xl font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">${Math.floor(gameState.money)}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase text-slate-500 tracking-wider">生命</span>
               <span className="text-xl sm:text-2xl font-bold text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{gameState.lives}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className={`text-[10px] uppercase tracking-wider ${isBossWave ? 'text-red-500 font-black animate-pulse' : 'text-slate-500'}`}>
                 {isBossWave ? '⚠ BOSS WAVE' : '波次'}
               </span>
               <span className={`text-xl sm:text-2xl font-bold ${isBossWave ? 'text-red-500 scale-110 drop-shadow-[0_0_15px_red]' : 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]'} transition-all duration-500`}>
                 {gameState.wave}
               </span>
             </div>
          </div>

          {/* Speed & Auto Controls */}
          <div className="flex gap-2 w-full md:w-auto justify-center">
              <button 
                onClick={toggleSpeed}
                title="Hotkey: S"
                className={`
                   px-3 py-2 sm:py-1 rounded border text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1
                   ${gameState.speed > 1 
                     ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' 
                     : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'}
                `}
              >
                  <span>{gameState.speed === 1 ? '▶' : '⏩'}</span>
                  <span>{gameState.speed}x</span>
              </button>
              <button 
                onClick={toggleAutoStart}
                className={`
                   px-3 py-2 sm:py-1 rounded border text-xs font-bold tracking-wider uppercase transition-all
                   ${gameState.autoStart 
                     ? 'bg-green-900/40 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                     : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'}
                `}
              >
                  Auto: {gameState.autoStart ? 'ON' : 'OFF'}
              </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
          
          {/* Main Viewport (Canvas) */}
          <div className="relative w-full max-w-[800px]">
             <GridMap 
               paths={currentLevel.paths}
               towers={towers}
               enemies={enemies}
               projectiles={projectiles}
               particles={particles}
               floatingTexts={floatingTexts}
               onTileClick={handleTileClick}
               selectedTowerType={selectedTowerType}
               inspectedTower={inspectedTower}
             />

             {/* SETTINGS / SAVE MODAL */}
             {showSettings && (
                 <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 sm:p-8 rounded-xl border border-slate-700">
                     <div className="w-full max-w-md space-y-6">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                             <h2 className="text-xl font-bold text-white">系統設定 & 檔案</h2>
                             <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        {/* Audio Settings */}
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700 space-y-4">
                            <h3 className="text-yellow-400 font-bold flex items-center gap-2">
                            🔊 音效設定
                            </h3>
                            
                            {/* Music Slider */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>背景音樂</span>
                                    <span>{Math.round(musicVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05"
                                    value={musicVolume}
                                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* SFX Slider */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>音效音量</span>
                                    <span>{Math.round(sfxVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05"
                                    value={sfxVolume}
                                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                                    className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        {/* Daily Reward Section */}
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                             <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                                🎁 每日戰術補給
                             </h3>
                             <p className="text-xs text-slate-400 mb-3">
                                系統每天會發送一次資金補給。金額隨波次提升。
                             </p>
                             <button 
                                onClick={handleClaimReward}
                                disabled={!canClaimDaily}
                                className={`w-full py-2 rounded text-sm font-bold tracking-wider uppercase transition-all
                                   ${canClaimDaily 
                                     ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.4)]' 
                                     : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                `}
                             >
                                {canClaimDaily ? '領取補給物資' : '補給運輸中...'}
                             </button>
                        </div>

                        {/* Save/Load Section */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-emerald-500 mb-2">● 系統已啟用自動記憶功能</p>
                                <button onClick={handleExport} className="w-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 py-2 rounded hover:bg-cyan-800/30 text-sm mb-2">
                                    匯出存檔代碼 (複製)
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                   type="text" 
                                   value={importString}
                                   onChange={(e) => setImportString(e.target.value)}
                                   placeholder="在此貼上存檔代碼..."
                                   className="flex-1 bg-black border border-slate-700 rounded px-3 text-xs text-white"
                                />
                                <button onClick={handleImport} className="bg-slate-800 border border-slate-600 text-white px-4 rounded hover:bg-slate-700 text-sm">
                                    匯入
                                </button>
                            </div>
                        </div>

                        {/* Author Link */}
                        <div className="pt-4 border-t border-slate-800 text-center">
                             <p className="text-xs text-slate-500 mb-2">想了解更多戰術技巧與開發日誌？</p>
                             <a 
                               href={AUTHOR_BLOG_URL}
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="inline-block px-4 py-2 border border-pink-500/30 text-pink-400 rounded hover:bg-pink-900/20 hover:shadow-[0_0_10px_rgba(236,72,153,0.3)] transition-all text-sm group"
                             >
                                <span className="group-hover:animate-pulse">♥</span> 訪問指揮官手冊 (部落格)
                             </a>
                        </div>
                     </div>
                 </div>
             )}
             
             {/* Level Selection Overlay */}
             {showLevelSelect && !showSettings && (
                 <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 sm:p-8 rounded-xl border border-cyan-900/50">
                    <h2 className="text-2xl sm:text-3xl font-black text-cyan-400 mb-2 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">選擇戰術區域</h2>
                    <p className="text-slate-400 mb-8 text-sm">請選擇防禦部署地點</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {LEVELS.map((level) => (
                            <button 
                                key={level.id}
                                onClick={() => handleLevelSelect(level.id)}
                                className={`
                                    relative p-5 rounded-lg border text-left group transition-all duration-300
                                    ${currentLevel.id === level.id 
                                        ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                                        : 'bg-slate-900/40 border-slate-800 hover:border-cyan-700 hover:bg-slate-800'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg group-hover:text-white ${currentLevel.id === level.id ? 'text-white' : 'text-slate-300'}`}>
                                        {level.name}
                                    </h3>
                                    <span className={`
                                        text-[10px] px-2 py-0.5 rounded font-bold
                                        ${level.difficulty === 'EASY' ? 'text-green-400 bg-green-950/30' : 
                                          level.difficulty === 'MEDIUM' ? 'text-yellow-400 bg-yellow-950/30' : 
                                          level.difficulty === 'HARD' ? 'text-orange-400 bg-orange-950/30' : 'text-red-500 bg-red-950/30'}
                                    `}>
                                        {level.difficulty}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300">{level.description}</p>
                            </button>
                        ))}
                    </div>
                 </div>
             )}

             {/* Game Over Overlay */}
             {gameState.isGameOver && !showLevelSelect && !showSettings && (
               <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-20 border border-red-900/50 p-4 text-center">
                 <h2 className="text-4xl sm:text-6xl text-red-500 font-black mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">系統崩潰</h2>
                 <p className="text-xl sm:text-2xl mb-8 text-slate-300">最終分數: <span className="text-white">{Math.floor(gameState.score)}</span></p>
                 <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                     <button 
                       onClick={handleRestart}
                       className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                     >
                       重啟戰局
                     </button>
                     <button 
                       onClick={handleOpenLevelSelect}
                       className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold tracking-widest transition-all hover:scale-105 border border-slate-600"
                     >
                       撤退至地圖室
                     </button>
                 </div>
               </div>
             )}
          </div>

          {/* Right Control Panel */}
          <div className="w-full lg:w-96 flex flex-col gap-5 pb-8">
            
            {/* Context Panel: Either Tower Inspector OR Build Menu */}
            {inspectedTower ? (() => {
                const nextStats = getNextStats(inspectedTower);
                const isMax = inspectedTower.level >= inspectedTower.maxLevel;
                const canAfford = gameState.money >= getUpgradeCost(inspectedTower);

                return (
                // --- UPGRADE PANEL ---
                <div className="bg-slate-900/80 backdrop-blur-md border border-yellow-500/30 p-5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-yellow-400 font-bold text-lg tracking-wider uppercase">
                                {TOWER_TYPES[inspectedTower.type].name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>等級 {inspectedTower.level}</span>
                                <div className="h-1 w-16 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-yellow-500" 
                                      style={{ width: `${(inspectedTower.level / inspectedTower.maxLevel) * 100}%` }}
                                    ></div>
                                </div>
                                <span>MAX {inspectedTower.maxLevel}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => { playUI(); setInspectedTowerId(null); }} 
                            className="text-slate-500 hover:text-white px-2 py-2"
                        >✕</button>
                    </div>

                    {/* Stats Comparison Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 uppercase">傷害</span>
                            <div className="flex items-center gap-1 text-sm font-bold">
                                <span className={isMax ? "text-yellow-400" : "text-white"}>{Math.round(inspectedTower.damage)}</span>
                                {!isMax && <>
                                    <span className="text-emerald-500 text-[10px]">➜</span>
                                    <span className="text-emerald-400">{nextStats.damage}</span>
                                </>}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 uppercase">射程</span>
                            <div className="flex items-center gap-1 text-sm font-bold">
                                <span className={isMax ? "text-yellow-400" : "text-white"}>{inspectedTower.range.toFixed(1)}</span>
                                {!isMax && <>
                                    <span className="text-emerald-500 text-[10px]">➜</span>
                                    <span className="text-emerald-400">{nextStats.range}</span>
                                </>}
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex flex-col items-center">
                            <span className="text-[10px] text-slate-500 uppercase">射速</span>
                            <div className="flex items-center gap-1 text-sm font-bold">
                                <span className={isMax ? "text-yellow-400" : "text-white"}>{(1000/inspectedTower.cooldown).toFixed(1)}</span>
                                {!isMax && inspectedTower.type === TowerType.RAPID && <>
                                    <span className="text-emerald-500 text-[10px]">➜</span>
                                    <span className="text-emerald-400">{(1000/nextStats.cooldown).toFixed(1)}</span>
                                </>}
                            </div>
                            <span className="text-[8px] text-slate-600">發/秒</span>
                        </div>
                    </div>

                    <div className="space-y-3 mb-2">
                         <button 
                            onClick={() => upgradeTower(inspectedTower.id)}
                            disabled={isMax || !canAfford}
                            className={`
                                w-full p-4 sm:p-3 border rounded flex justify-between items-center group transition-all relative overflow-hidden active:scale-95
                                ${isMax 
                                    ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed' 
                                    : canAfford 
                                        ? 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border-slate-600 hover:border-yellow-500/50' 
                                        : 'bg-slate-800 border-red-900/50 opacity-80 cursor-not-allowed'}
                            `}
                         >
                            <span className={`font-bold text-sm ${isMax ? 'text-slate-500' : 'text-yellow-200'}`}>
                                {isMax ? "已達最高等級" : "系統升級"}
                            </span>
                            {!isMax && (
                                <span className={`font-mono text-sm ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                                    -${getUpgradeCost(inspectedTower)}
                                </span>
                            )}
                         </button>

                         <button 
                            onClick={() => { sellTower(inspectedTower.id); setInspectedTowerId(null); }}
                            className="w-full p-4 sm:p-3 bg-red-900/10 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/40 rounded flex justify-between items-center transition-all group active:scale-95"
                         >
                            <span className="font-bold text-sm text-red-400/80 group-hover:text-red-300">拆除回收</span>
                            <span className="font-mono text-sm text-emerald-500/80 group-hover:text-emerald-400">
                                +${getSellValue(inspectedTower)}
                            </span>
                         </button>
                    </div>
                </div>
                );
            })() : (
                // --- BUILD MENU ---
                <>
                {/* AI Advisor Panel */}
                <div className={`
                    bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden group transition-all duration-700 hidden sm:block
                    ${loadingAdvice 
                      ? 'border border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.3)]' 
                      : 'border border-cyan-500/20 shadow-lg'}
                `}>
                  {loadingAdvice && (
                     <div className="absolute inset-0 bg-cyan-400/5 animate-pulse pointer-events-none"></div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${loadingAdvice ? 'bg-yellow-400 animate-ping' : 'bg-cyan-400 shadow-[0_0_8px_cyan]'}`}></div>
                        <h3 className="text-cyan-400 font-bold text-sm tracking-widest uppercase">
                           戰術分析系統
                        </h3>
                      </div>
                      <button 
                        onClick={handleAskAI}
                        disabled={loadingAdvice}
                        className="text-[10px] px-3 py-1 rounded border transition-all disabled:opacity-50 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-300 border-cyan-500/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                      >
                        {loadingAdvice ? '運算中...' : '請求情報'}
                      </button>
                  </div>
                  <div className="relative z-10 bg-black/40 p-3 rounded border border-slate-700/50 min-h-[4rem]">
                    <p className="text-sm text-slate-300 leading-relaxed italic font-light">
                      <span className="text-cyan-500 not-italic mr-2">➜</span>
                      {advice}
                    </p>
                  </div>
                </div>

                {/* Tower Selection Grid */}
                <div className="grid grid-cols-2 gap-3">
                   {Object.values(TOWER_TYPES).map((tower) => (
                     <button
                       key={tower.type}
                       onClick={() => handleSelectTower(tower.type)}
                       className={`
                         p-3 sm:p-4 rounded-xl border transition-all relative overflow-hidden text-left group active:scale-95
                         ${selectedTowerType === tower.type 
                           ? 'bg-slate-800 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] ring-1 ring-cyan-400/30' 
                           : 'bg-slate-900/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}
                         ${gameState.money < tower.cost ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                       `}
                       disabled={gameState.money < tower.cost}
                     >
                       <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                           <div className={`
                                w-3 h-3 rounded-full ${tower.color.split(' ')[0]} 
                                ${selectedTowerType === tower.type ? 'animate-pulse shadow-[0_0_8px_currentColor] scale-125' : 'opacity-80'}
                                transition-all duration-300
                           `}></div>
                           <span className={`font-bold text-sm group-hover:text-white ${selectedTowerType === tower.type ? 'text-white' : 'text-slate-300'}`}>{tower.name}</span>
                         </div>
                         <span className="text-emerald-400 font-mono text-xs bg-emerald-900/30 px-1.5 py-0.5 rounded border border-emerald-500/30">${tower.cost}</span>
                       </div>
                       <div className="text-[11px] text-slate-400 leading-tight mb-2 h-8 hidden sm:block pl-5">
                         {tower.description}
                       </div>
                       {/* Visual Indicator Bar */}
                       <div className={`w-full h-1 rounded-full bg-slate-700 overflow-hidden`}>
                          <div className={`h-full ${tower.color.split(' ')[0]} w-full origin-left transition-transform duration-300 ${selectedTowerType === tower.type ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`}></div>
                       </div>
                     </button>
                   ))}
                </div>
                </>
            )}

            {/* Launch Button */}
            <button
              onClick={startWave}
              disabled={gameState.isPlaying || gameState.isGameOver || showLevelSelect || showSettings}
              className={`
                w-full py-5 rounded-xl font-bold text-lg tracking-[0.15em] shadow-lg transition-all relative overflow-hidden group active:scale-95
                ${gameState.isPlaying 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40 hover:shadow-emerald-500/30 transform hover:-translate-y-1'}
              `}
            >
              <span className="relative z-10">{gameState.isPlaying ? '交戰中...' : '啟動波次'}</span>
              {!gameState.isPlaying && (
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              )}
            </button>

            {/* Status / Legend */}
            <div className="p-4 sm:p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 text-xs text-slate-400 flex flex-wrap gap-4 justify-between">
               <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></span> 一般</div>
               <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_orange]"></span> 快速</div>
               <div className="flex items-center gap-2"><span className="w-2 h-2 bg-violet-500 shadow-[0_0_5px_violet]"></span> 坦克</div>
               <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 shadow-[0_0_5px_emerald]"></span> 爬行者</div>
               <div className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 shadow-[0_0_5px_yellow]"></span> 蟲群</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_pink]"></span> 首領</div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Sticky Footer for Author Traffic - Enhanced Floating Button */}
      <footer className="fixed bottom-4 right-4 z-50">
          <a 
            href={AUTHOR_BLOG_URL} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="
              group flex items-center gap-3 px-5 py-3
              bg-slate-900/90 backdrop-blur-xl
              border border-pink-500/50 rounded-full
              text-pink-100 font-bold tracking-wide text-xs
              shadow-[0_0_20px_rgba(236,72,153,0.3)]
              hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]
              hover:border-pink-400
              hover:scale-105 hover:-translate-y-1
              transition-all duration-300
            "
          >
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
             </span>
             <div className="flex flex-col items-start leading-none">
                 <span className="text-[10px] text-pink-400 uppercase tracking-widest mb-0.5">Dev Log</span>
                 <span>瀏覽作者部落格</span>
             </div>
             <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
          </a>
      </footer>
    </div>
  );
};

export default App;
