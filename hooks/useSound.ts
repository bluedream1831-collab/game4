
import { useRef, useCallback, useState } from 'react';
import { TowerType } from '../types';

export const useSound = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  
  // Track playing music nodes
  const musicNodesRef = useRef<AudioNode[]>([]);
  const isMusicPlayingRef = useRef(false);

  // Throttling Refs
  const lastHitTimeRef = useRef<number>(0);
  const rapidFireCounterRef = useRef<number>(0);

  // Volume States
  const [musicVolume, setMusicVolumeState] = useState(0.12);
  const [sfxVolume, setSfxVolumeState] = useState(0.25);

  const startMusic = useCallback(() => {
    if (!audioCtxRef.current || !musicGainRef.current || isMusicPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    // 1. The Pulse (Gentle Bounce)
    const beatLfo = ctx.createOscillator();
    beatLfo.type = 'sine';
    beatLfo.frequency.value = 1.5; 
    
    // 2. Bass Voice (Light & Round)
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 130.81; // C3
    
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.08; 
    
    // Modulate Bass Volume
    const bassPulseScale = ctx.createGain();
    bassPulseScale.gain.value = 0.03; 
    beatLfo.connect(bassPulseScale);
    bassPulseScale.connect(bassGain.gain);

    bassOsc.connect(bassGain);
    bassGain.connect(masterGainRef.current ? musicGainRef.current! : ctx.destination);

    // 3. The Chord Pads
    const createVoice = (freq: number, pan: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        const gain = ctx.createGain();
        gain.gain.value = 0.1; 
        osc.connect(panner);
        return { osc, gain, panner };
    };

    const v1 = createVoice(261.63, 0);    
    const v2 = createVoice(329.63, -0.3); 
    const v3 = createVoice(392.00, 0.3);  
    const v4 = createVoice(493.88, -0.6); 

    // 4. Global Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500; 
    filter.Q.value = 0.5; 

    const filterModScale = ctx.createGain();
    filterModScale.gain.value = 400; 
    beatLfo.connect(filterModScale);
    filterModScale.connect(filter.frequency);

    v1.panner.connect(filter);
    v2.panner.connect(filter);
    v3.panner.connect(filter);
    v4.panner.connect(filter);
    
    filter.connect(musicGainRef.current);

    bassOsc.start(now);
    beatLfo.start(now);
    v1.osc.start(now);
    v2.osc.start(now);
    v3.osc.start(now);
    v4.osc.start(now);

    musicNodesRef.current = [beatLfo, bassOsc, bassGain, bassPulseScale, v1.osc, v2.osc, v3.osc, v4.osc];
    isMusicPlayingRef.current = true;
  }, []);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (CtxClass) {
        const ctx = new CtxClass();
        audioCtxRef.current = ctx;
        
        const master = ctx.createGain();
        master.gain.value = 1.0;
        master.connect(ctx.destination);
        masterGainRef.current = master;

        const sfx = ctx.createGain();
        sfx.gain.value = sfxVolume;
        sfx.connect(master);
        sfxGainRef.current = sfx;

        const music = ctx.createGain();
        music.gain.value = musicVolume;
        music.connect(master);
        musicGainRef.current = music;

        // Pre-generate noise buffer for explosions
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noiseBufferRef.current = buffer;

        startMusic();
      }
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
      startMusic();
    }
  }, [musicVolume, sfxVolume, startMusic]);

  const setMusicVolume = useCallback((val: number) => {
      setMusicVolumeState(val);
      if (musicGainRef.current && audioCtxRef.current) {
          musicGainRef.current.gain.setTargetAtTime(val, audioCtxRef.current.currentTime, 0.1);
      }
  }, []);

  const setSfxVolume = useCallback((val: number) => {
      setSfxVolumeState(val);
      if (sfxGainRef.current && audioCtxRef.current) {
          sfxGainRef.current.gain.setTargetAtTime(val, audioCtxRef.current.currentTime, 0.1);
      }
  }, []);

  const connectSfx = (node: AudioNode) => {
      if (sfxGainRef.current) {
          node.connect(sfxGainRef.current);
      } else if (masterGainRef.current) {
          node.connect(masterGainRef.current);
      }
  };

  const playOscillator = (
    type: OscillatorType, 
    startFreq: number, 
    endFreq: number, 
    duration: number, 
    vol: number = 0.1
  ) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    connectSfx(gain); 
    osc.start();
    osc.stop(t + duration);
  };

  const playNoise = (duration: number, vol: number = 0.1, isHeavy: boolean = false) => {
    if (!audioCtxRef.current || !noiseBufferRef.current) return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = noiseBufferRef.current;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    // Deep heavy explosion vs sharp explosion
    filter.frequency.setValueAtTime(isHeavy ? 600 : 1000, t);
    filter.frequency.exponentialRampToValueAtTime(isHeavy ? 50 : 100, t + duration);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    connectSfx(gain); 
    src.start();
    src.stop(t + duration);
  };

  const playShoot = useCallback((type: TowerType) => {
    if (type === TowerType.RAPID) {
        rapidFireCounterRef.current += 1;
        if (rapidFireCounterRef.current % 3 !== 0) return;
    }
    
    if (type === TowerType.LASER) {
        if (Math.random() > 0.3) return; 
        playOscillator('sawtooth', 1200, 400, 0.1, 0.05);
        return;
    }

    if (type === TowerType.MISSILE) {
        // Missile launch sound "Fwoosh"
        playNoise(0.4, 0.15, true);
        playOscillator('triangle', 200, 800, 0.3, 0.1); 
        return;
    }

    switch (type) {
      case TowerType.SNIPER:
        playOscillator('sawtooth', 800, 100, 0.4, 0.2);
        break;
      case TowerType.RAPID:
        playOscillator('square', 1200, 800, 0.05, 0.05);
        break;
      case TowerType.ICE:
        playOscillator('sine', 600, 1200, 0.2, 0.15);
        break;
      case TowerType.BASIC:
      default:
        playOscillator('triangle', 880, 220, 0.1, 0.1);
        break;
    }
  }, []);

  const playHit = useCallback(() => {
    const now = Date.now();
    if (now - lastHitTimeRef.current < 200) return; 
    lastHitTimeRef.current = now;
    playOscillator('square', 200, 100, 0.05, 0.05);
  }, []);

  // Update explosion to handle heavy impact
  const playExplosion = useCallback(() => {
    // 50% chance for heavy impact noise to vary it
    const isHeavy = Math.random() > 0.5;
    playNoise(isHeavy ? 0.6 : 0.3, isHeavy ? 0.3 : 0.2, isHeavy);
  }, []);

  const playBuild = useCallback(() => {
    playOscillator('sine', 220, 880, 0.2, 0.1);
  }, []);

  const playSell = useCallback(() => {
    playOscillator('sine', 880, 440, 0.1, 0.1);
  }, []);

  const playUpgrade = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(554, t + 0.1);
    osc.frequency.setValueAtTime(659, t + 0.2);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(gain);
    connectSfx(gain); 
    osc.start();
    osc.stop(t + 0.3);
  }, []);

  const playWaveStart = useCallback(() => {
    playOscillator('sawtooth', 100, 50, 1.5, 0.3);
  }, []);

  const playUI = useCallback(() => {
    playOscillator('sine', 2000, 2000, 0.02, 0.02);
  }, []);

  const playError = useCallback(() => {
    playOscillator('sawtooth', 150, 100, 0.2, 0.1);
  }, []);

  return {
    initAudio,
    musicVolume,
    sfxVolume,
    setMusicVolume,
    setSfxVolume,
    playShoot,
    playHit,
    playExplosion,
    playBuild,
    playSell,
    playUpgrade,
    playWaveStart,
    playUI,
    playError
  };
};
