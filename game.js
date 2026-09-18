/**
 * LAST STAND - Top-Down 2D Zombie Survival Shooter
 * Pure Vanilla JavaScript & HTML5 Canvas
 * Responsive Direct Movement, Tactical Aiming, Roguelite Upgrades,
 * Dynamic Objectives, Distinct Zombie Types, SMG Overheating & Audio Synthesizer
 */

(function () {
  'use strict';

  /* ==========================================================================
     0. ASSET MANAGEMENT & PRELOADER SYSTEM (Relative Paths for GitHub Pages)
     ========================================================================== */

  const ASSET_MANIFEST = {
    images: {
      'player': 'assets/images/player.png',
      'zombie-walker': 'assets/images/zombie-walker.png',
      'zombie-runner': 'assets/images/zombie-runner.png',
      'zombie-brute': 'assets/images/zombie-brute.png',
      'zombie-spitter': 'assets/images/zombie-spitter.png',
      'zombie-crawler': 'assets/images/zombie-crawler.png',
      'zombie-boss': 'assets/images/zombie-boss.png',
      'medkit': 'assets/images/medkit.png',
      'ammo-crate': 'assets/images/ammo-crate.png',
      'blood-splatter': 'assets/images/blood-splatter.png'
    },
    sounds: {
      'shoot': 'assets/sounds/shoot.mp3',
      'reload': 'assets/sounds/reload.mp3',
      'hit': 'assets/sounds/hit.mp3',
      'enemy-death': 'assets/sounds/enemy-death.mp3',
      'wave-start': 'assets/sounds/wave-start.mp3',
      'powerup': 'assets/sounds/powerup.mp3',
      'game-over': 'assets/sounds/game-over.mp3',
      'boss-warning': 'assets/sounds/boss-warning.mp3',
      'button-click': 'assets/sounds/button-click.mp3'
    }
  };

  class AssetManager {
    constructor(game) {
      this.game = game;
      this.images = {};
      this.sounds = {};
      this.loadedImages = new Set();
      this.loadedSounds = new Set();
      this.failedAssets = new Set();
      this.totalAssets = Object.keys(ASSET_MANIFEST.images).length + Object.keys(ASSET_MANIFEST.sounds).length;
      this.loadedCount = 0;
      this.completed = false;
      this.onCompleteCallback = null;
    }

    preload(onComplete) {
      this.onCompleteCallback = onComplete;

      // In Node.js testing or headless environments, complete immediately
      if (typeof Image === 'undefined') {
        this.finish();
        return;
      }

      // Hard safety timeout: Never allow loading screen to hang longer than 2.5 seconds
      this.timeoutId = setTimeout(() => {
        if (!this.completed) {
          console.warn('[AssetManager] Preload safety timeout reached. Proceeding with available assets.');
          this.finish();
        }
      }, 2500);

      // 1. Preload Images
      for (const [key, src] of Object.entries(ASSET_MANIFEST.images)) {
        const img = new Image();
        img.onload = () => {
          this.loadedImages.add(key);
          this.images[key] = img;
          this.stepProgress(`Loaded image: ${key}`);
        };
        img.onerror = () => {
          this.failedAssets.add(key);
          console.warn(`[AssetManager] Optional image failed to load: ${src}. Procedural canvas fallback will be used.`);
          this.stepProgress(`Fallback image: ${key}`);
        };
        img.src = src;
      }

      // 2. Preload Sounds
      for (const [key, src] of Object.entries(ASSET_MANIFEST.sounds)) {
        if (typeof Audio === 'undefined') {
          this.stepProgress(`Skipped sound: ${key}`);
          continue;
        }
        try {
          const audio = new Audio();
          audio.preload = 'auto';
          const onAudioReady = () => {
            if (!this.loadedSounds.has(key)) {
              this.loadedSounds.add(key);
              this.sounds[key] = audio;
              this.stepProgress(`Loaded audio: ${key}`);
            }
          };
          audio.addEventListener('canplaythrough', onAudioReady, { once: true });
          audio.addEventListener('loadeddata', onAudioReady, { once: true });
          audio.addEventListener('error', () => {
            this.failedAssets.add(key);
            console.warn(`[AssetManager] Optional sound failed to load: ${src}. Procedural Web Audio synthesizer fallback will be used.`);
            this.stepProgress(`Fallback sound: ${key}`);
          }, { once: true });
          audio.src = src;
          audio.load();
        } catch (e) {
          this.stepProgress(`Error sound: ${key}`);
        }
      }
    }

    stepProgress(statusMsg) {
      this.loadedCount++;
      const pct = Math.min(100, Math.round((this.loadedCount / Math.max(1, this.totalAssets)) * 100));

      const barFill = document.getElementById('loadingBarFill');
      const pctText = document.getElementById('loadingPercentText');
      const statText = document.getElementById('loadingStatusText');

      if (barFill) barFill.style.width = `${pct}%`;
      if (pctText) pctText.textContent = `${pct}%`;
      if (statText && statusMsg) statText.textContent = statusMsg.toUpperCase();

      if (this.loadedCount >= this.totalAssets && !this.completed) {
        setTimeout(() => this.finish(), 150);
      }
    }

    finish() {
      if (this.completed) return;
      this.completed = true;
      if (this.timeoutId) clearTimeout(this.timeoutId);

      const barFill = document.getElementById('loadingBarFill');
      const pctText = document.getElementById('loadingPercentText');
      if (barFill) barFill.style.width = '100%';
      if (pctText) pctText.textContent = '100%';

      const loader = document.getElementById('assetLoadingScreen');
      if (loader) {
        loader.classList.add('hidden');
        loader.classList.remove('active');
      }

      const menu = document.getElementById('mainMenuScreen');
      if (menu && this.game.state === 'menu') {
        menu.classList.remove('hidden');
        menu.classList.add('active');
      }

      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }

    hasImage(key) {
      return this.loadedImages.has(key) && !!this.images[key];
    }

    getImage(key) {
      return this.images[key] || null;
    }

    hasSound(key) {
      return this.loadedSounds.has(key) && !!this.sounds[key];
    }

    playSound(key, volume = 1.0) {
      if (!this.hasSound(key)) return false;
      try {
        const base = this.sounds[key];
        const clone = base.cloneNode();
        clone.volume = Math.max(0, Math.min(1, volume * (this.game.sound ? this.game.sound.sfxVolume * this.game.sound.masterVolume : 1)));
        const p = clone.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /* ==========================================================================
     1. AUDIO SYSTEM - Procedural Web Audio API Synthesizer
     ========================================================================== */

  class SoundManager {
    constructor(game = null) {
      this.game = game;
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.masterVolume = 0.8;
      this.sfxVolume = 0.9;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.initialized = true;
      } catch (e) {
        console.warn('Web Audio API not supported or blocked:', e);
      }
    }

    ensureContext() {
      if (!this.initialized) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setMasterVolume(val) {
      this.masterVolume = Math.max(0, Math.min(1, val));
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      }
    }

    setSfxVolume(val) {
      this.sfxVolume = Math.max(0, Math.min(1, val));
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      }
    }

    createNoiseBuffer(duration = 0.2) {
      if (!this.ctx) return null;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    playShoot(weaponKey) {
      if (this.game && this.game.assets && this.game.assets.playSound('shoot', 0.85)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (weaponKey === 'pistol') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.11);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.11);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.07);
        if (noise.buffer) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1100, now);
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.35, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.sfxGain);
          noise.start(now);
        }
      } else if (weaponKey === 'shotgun') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.24);
        if (noise.buffer) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1700, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.24);
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.8, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.sfxGain);
          noise.start(now);
        }
      } else if (weaponKey === 'smg') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (weaponKey === 'sniper') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.45);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.32);
        if (noise.buffer) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2600, now);
          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.75, now);
          nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.sfxGain);
          noise.start(now);
        }
      } else if (weaponKey === 'grenade') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.16);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    }

    playExplosion() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + 0.85);
      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.85);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(0.75);
      if (noise.buffer) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1300, now);
        filter.frequency.exponentialRampToValueAtTime(90, now + 0.75);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.9, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
      }
    }

    playReload() {
      if (this.game && this.game.assets && this.game.assets.playSound('reload', 0.8)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [0, 0.26].forEach(offset => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + offset * 400, now + offset);
        osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.05);
        gain.gain.setValueAtTime(0.35, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.05);
      });
    }

    playEmpty() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1300, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    playOverheat() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // High-pitched hiss and warning click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    playHitTick() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.035);
    }

    playZombieHit() {
      if (this.game && this.game.assets && this.game.assets.playSound('hit', 0.7)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    playZombieDeath() {
      if (this.game && this.game.assets && this.game.assets.playSound('enemy-death', 0.8)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    playAcidSplash() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    playPlayerHurt() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    playPowerup() {
      if (this.game && this.game.assets && this.game.assets.playSound('powerup', 0.85)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    }

    playCoin() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const t = now + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    }

    playWaveClear() {
      if (this.game && this.game.assets && this.game.assets.playSound('wave-start', 0.85)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chords = [
        [392.00, 493.88, 587.33],
        [523.25, 659.25, 783.99]
      ];
      chords.forEach((chord, cIdx) => {
        const tStart = now + cIdx * 0.26;
        chord.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, tStart);
          gain.gain.setValueAtTime(0.2, tStart);
          gain.gain.exponentialRampToValueAtTime(0.01, tStart + 0.38);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(tStart);
          osc.stop(tStart + 0.38);
        });
      });
    }

    playLevelUp() {
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    }

    playBossAlert() {
      if (this.game && this.game.assets && this.game.assets.playSound('boss-warning', 0.9)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(520, now + 0.55);
      osc.frequency.linearRampToValueAtTime(260, now + 1.1);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.2);
    }

    playGameOver() {
      if (this.game && this.game.assets && this.game.assets.playSound('game-over', 0.9)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [311.13, 293.66, 261.63, 207.65];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.25;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }

    playButtonClick() {
      if (this.game && this.game.assets && this.game.assets.playSound('button-click', 0.6)) return;
      this.ensureContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  }

  /* ==========================================================================
     2. CONSTANTS & CONFIGURATION
     ========================================================================== */

  const MAP_WIDTH = 2800;
  const MAP_HEIGHT = 2800;
  const STORAGE_KEY = 'last_stand_save_v1';

  /* ==========================================================================
     2b. CENTRALIZED ECONOMY CONFIGURATION
     ========================================================================== */

  const ECONOMY_CONFIG = {
    rewards: {
      walker: 10,
      runner: 15,
      spitter: 20,
      crawler: 20,
      brute: 30,
      hunter: 35,
      boss: 200,
      headshotBonus: 10,
      multiKillBonus: 8,
      waveBase: 100,
      wavePerWave: 30,
      objectiveBase: 200,
      objectivePerWave: 40,
      finalExtractionBonus: 500
    },
    pickups: {
      values: [5, 10, 25, 50],
      dropChance: 0.14,
      bossCoinsCount: 6
    },
    costs: {
      weaponUpgrades: [250, 400, 650, 950],
      playerUpgrades: [200, 350, 550, 800],
      supplies: {
        medkit: 120,
        armor: 150,
        ammo: 100,
        grenade: 140,
        fullRestock: 350
      },
      blackMarket: {
        damageSurge: 400,
        quickHands: 350,
        vampiricShots: 700,
        bountyHunter: 600,
        explosiveRounds: 900
      },
      equipment: {
        flashlight: 300,
        kevlarWeave: 450,
        coinMagnet: 400,
        quickHolster: 350,
        ammoRig: 500
      },
      weaponUnlocks: {
        shotgun: 500,
        smg: 1000,
        sniper: 1500,
        grenade: 2000
      },
      permanent: {
        survivor: [1000, 2000, 3500, 5500, 8000],
        marksman: [1500, 3000, 5000, 7500, 11000],
        athlete: [1200, 2400, 4000, 6000, 9000],
        scavenger: [2000, 4000, 7000, 11000, 16000]
      }
    }
  };

  // Base Weapon Definitions
  const WEAPON_TYPES = {
    pistol: {
      name: 'Pistol',
      icon: '🔫',
      damage: 28,
      fireRate: 0.22,
      magSize: 12,
      reserve: Infinity,
      reloadTime: 1.0,
      spread: 0.025,
      speed: 21,
      pellets: 1,
      knockback: 4,
      auto: false,
      color: '#ffdd59'
    },
    shotgun: {
      name: 'Shotgun',
      icon: '💥',
      damage: 19,
      fireRate: 0.82,
      magSize: 6,
      reserve: 48,
      reloadTime: 1.8,
      spread: 0.20,
      speed: 17,
      pellets: 8,
      knockback: 14,
      auto: false,
      color: '#ff5252'
    },
    smg: {
      name: 'SMG',
      icon: '⚡',
      damage: 17,
      fireRate: 0.085,
      magSize: 35,
      reserve: 210,
      reloadTime: 1.3,
      spread: 0.08,
      speed: 22,
      pellets: 1,
      knockback: 2.5,
      auto: true,
      color: '#00d2ff',
      hasHeat: true
    },
    sniper: {
      name: 'Sniper',
      icon: '🎯',
      damage: 185,
      fireRate: 1.25,
      magSize: 5,
      reserve: 25,
      reloadTime: 2.2,
      spread: 0.004,
      speed: 32,
      pellets: 1,
      piercing: 3,
      critMult: 3.5,
      knockback: 18,
      auto: false,
      color: '#ff0055'
    },
    grenade: {
      name: 'Grenade',
      icon: '💣',
      damage: 250,
      fireRate: 1.05,
      magSize: 1,
      reserve: 6,
      reloadTime: 1.3,
      blastRadius: 160,
      fuseTime: 1.15,
      speed: 13,
      knockback: 28,
      auto: false,
      color: '#39ff14'
    }
  };

  /* ==========================================================================
     3. PERSISTENCE & SETTINGS MANAGER
     ========================================================================== */

  class SaveManager {
    static load() {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const data = JSON.parse(raw);
            return {
              version: data.version || 1,
              bankedCoins: Math.max(0, Number(data.bankedCoins) || 0),
              permanentUpgrades: {
                survivor: Math.max(0, Math.min(5, Number(data.permanentUpgrades?.survivor) || 0)),
                marksman: Math.max(0, Math.min(5, Number(data.permanentUpgrades?.marksman) || 0)),
                athlete: Math.max(0, Math.min(5, Number(data.permanentUpgrades?.athlete) || 0)),
                scavenger: Math.max(0, Math.min(5, Number(data.permanentUpgrades?.scavenger) || 0))
              },
              weaponUnlocks: {
                pistol: true,
                shotgun: true,
                smg: true,
                sniper: true,
                grenade: true,
                ...(data.weaponUnlocks || {})
              },
              equipment: data.equipment || {},
              bestWave: Math.max(1, Number(data.bestWave) || 1),
              mostKills: Math.max(0, Number(data.mostKills) || 0),
              highScore: Math.max(0, Number(data.highScore) || 0),
              masterVol: data.masterVol !== undefined ? Number(data.masterVol) : 80,
              sfxVol: data.sfxVol !== undefined ? Number(data.sfxVol) : 90,
              screenShake: data.screenShake !== undefined ? !!data.screenShake : true,
              bloodGore: data.bloodGore !== undefined ? !!data.bloodGore : true,
              flashlight: data.flashlight !== undefined ? !!data.flashlight : true
            };
          }
        }
      } catch (e) {
        console.warn('Storage read failed:', e);
      }
      return {
        version: 1,
        bankedCoins: 0,
        permanentUpgrades: { survivor: 0, marksman: 0, athlete: 0, scavenger: 0 },
        weaponUnlocks: { pistol: true, shotgun: true, smg: true, sniper: true, grenade: true },
        equipment: {},
        bestWave: 1,
        mostKills: 0,
        highScore: 0,
        masterVol: 80,
        sfxVol: 90,
        screenShake: true,
        bloodGore: true,
        flashlight: true
      };
    }

    static save(data) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (e) {
        console.warn('Storage write failed:', e);
      }
    }
  }

  /* ==========================================================================
     4. PARTICLES & FLOATING DAMAGE NUMBERS
     ========================================================================== */

  class Particle {
    constructor(x, y, vx, vy, color, radius, lifetime, shape = 'circle', alpha = 1) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.radius = radius;
      this.lifetime = lifetime;
      this.maxLifetime = lifetime;
      this.shape = shape;
      this.alpha = alpha;
      this.dead = false;
    }

    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.lifetime -= dt;
      if (this.lifetime <= 0) this.dead = true;
    }

    draw(ctx) {
      const progress = Math.max(0, this.lifetime / this.maxLifetime);
      ctx.save();
      ctx.globalAlpha = this.alpha * progress;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      if (this.shape === 'circle') {
        ctx.arc(this.x, this.y, Math.max(0.5, this.radius * progress), 0, Math.PI * 2);
        ctx.fill();
      } else if (this.shape === 'rect') {
        const sz = Math.max(1, this.radius * 2 * progress);
        ctx.fillRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
      }
      ctx.restore();
    }
  }

  class DamageNumber {
    constructor(x, y, text, color = '#ffffff', isCrit = false, isHeadshot = false) {
      this.x = x + (Math.random() * 24 - 12);
      this.y = y - 10;
      this.text = text;
      this.color = color;
      this.isCrit = isCrit;
      this.isHeadshot = isHeadshot;
      this.vy = isCrit ? -2.4 : -1.8;
      this.alpha = 1.0;
      this.lifetime = isCrit ? 0.95 : 0.8;
      this.dead = false;
    }

    update(dt) {
      this.y += this.vy * dt * 60;
      this.vy *= 0.96;
      this.lifetime -= dt;
      if (this.lifetime < 0.3) {
        this.alpha = this.lifetime / 0.3;
      }
      if (this.lifetime <= 0) this.dead = true;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      const fontSize = this.isHeadshot ? '19px' : (this.isCrit ? '16px' : '13px');
      ctx.font = `bold ${fontSize} Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  class Decal {
    constructor(x, y, radius, color = 'rgba(160, 15, 25, 0.45)') {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.color = color;
    }

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ==========================================================================
     5. MAP & OBSTACLE SYSTEM
     ========================================================================== */

  class Obstacle {
    constructor(x, y, w, h, type = 'building', destructible = false, hp = 100) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.type = type;
      this.destructible = destructible;
      this.hp = hp;
      this.maxHp = hp;
      this.dead = false;
    }

    takeDamage(amount, game) {
      if (!this.destructible) return;
      this.hp -= amount;
      if (this.hp <= 0) {
        this.dead = true;
        game.sound.playExplosion();
        for (let i = 0; i < 16; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = Math.random() * 4.5 + 1;
          game.particles.push(new Particle(
            this.x + this.w / 2,
            this.y + this.h / 2,
            Math.cos(angle) * spd,
            Math.sin(angle) * spd,
            '#a07855',
            Math.random() * 4 + 2,
            0.6,
            'rect'
          ));
        }
        if (Math.random() < 0.45) {
          game.spawnPowerUp(this.x + this.w / 2, this.y + this.h / 2);
        } else {
          const coinVal = 25 + Math.floor(Math.random() * 20);
          game.player.addCoins(coinVal);
          game.damageNumbers.push(new DamageNumber(this.x + this.w / 2, this.y + this.h / 2, `+${coinVal} 💰`, '#ffca28'));
        }
      }
    }

    draw(ctx) {
      ctx.save();
      if (this.type === 'building') {
        ctx.fillStyle = '#141a24';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#253549';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        ctx.fillStyle = '#0c1017';
        ctx.fillRect(this.x + 8, this.y + 8, this.w - 16, this.h - 16);

        // Rooftop air vent details
        ctx.fillStyle = '#1c2534';
        ctx.fillRect(this.x + this.w / 2 - 12, this.y + this.h / 2 - 12, 24, 24);
      } else if (this.type === 'barrier') {
        ctx.fillStyle = '#374151';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        // Hazard stripes
        ctx.fillStyle = '#f59e0b';
        const isHoriz = this.w > this.h;
        if (isHoriz) {
          for (let i = 0; i < this.w; i += 16) {
            ctx.fillRect(this.x + i, this.y, 8, this.h);
          }
        } else {
          for (let i = 0; i < this.h; i += 16) {
            ctx.fillRect(this.x, this.y + i, this.w, 8);
          }
        }
      } else if (this.type === 'crate') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.w, this.y + this.h);
        ctx.moveTo(this.x + this.w, this.y);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.stroke();
      } else if (this.type === 'container') {
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        const isHoriz = this.w > this.h;
        if (isHoriz) {
          for (let x = this.x + 10; x < this.x + this.w; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, this.y);
            ctx.lineTo(x, this.y + this.h);
            ctx.stroke();
          }
        } else {
          for (let y = this.y + 10; y < this.y + this.h; y += 12) {
            ctx.beginPath();
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.w, y);
            ctx.stroke();
          }
        }
      } else if (this.type === 'car') {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 6);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(this.x + 6, this.y + 5, this.w - 12, this.h / 3);
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     COLLISION SYSTEM UTILITIES
     ========================================================================== */

  // Reliable circle vs AABB obstacle collision detection
  function checkCircleObstacleCollision(cx, cy, radius, obstacles) {
    if (!obstacles || obstacles.length === 0) return null;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ob.dead) continue;
      // Fast broad-phase reject
      if (cx + radius <= ob.x || cx - radius >= ob.x + ob.w ||
          cy + radius <= ob.y || cy - radius >= ob.y + ob.h) {
        continue;
      }
      // Narrow-phase circle to clamped box point
      const closestX = Math.max(ob.x, Math.min(cx, ob.x + ob.w));
      const closestY = Math.max(ob.y, Math.min(cy, ob.y + ob.h));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return ob;
      }
    }
    return null;
  }

  // Fast swept sub-step AABB test to prevent fast projectile tunneling through thin walls
  function bulletHitsObstacle(b, ob) {
    if (ob.dead) return false;
    const minX = Math.min(b.prevX, b.x);
    const maxX = Math.max(b.prevX, b.x);
    const minY = Math.min(b.prevY, b.y);
    const maxY = Math.max(b.prevY, b.y);
    if (maxX < ob.x || minX > ob.x + ob.w || maxY < ob.y || minY > ob.y + ob.h) {
      return false;
    }
    const checkPoint = (px, py) => px >= ob.x && px <= ob.x + ob.w && py >= ob.y && py <= ob.y + ob.h;
    if (checkPoint(b.x, b.y) || checkPoint(b.prevX, b.prevY)) return true;
    const midX = (b.prevX + b.x) * 0.5;
    const midY = (b.prevY + b.y) * 0.5;
    if (checkPoint(midX, midY)) return true;
    const q1X = (b.prevX + midX) * 0.5;
    const q1Y = (b.prevY + midY) * 0.5;
    if (checkPoint(q1X, q1Y)) return true;
    const q3X = (midX + b.x) * 0.5;
    const q3Y = (midY + b.y) * 0.5;
    if (checkPoint(q3X, q3Y)) return true;
    return false;
  }

  // Push an entity cleanly out of obstacles and arena boundaries
  function resolveEntityObstacleCollisions(entity, obstacles) {
    if (!entity || !obstacles || obstacles.length === 0) return;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ob.dead) continue;
      if (entity.x + entity.radius <= ob.x || entity.x - entity.radius >= ob.x + ob.w ||
          entity.y + entity.radius <= ob.y || entity.y - entity.radius >= ob.y + ob.h) {
        continue;
      }
      const closestX = Math.max(ob.x, Math.min(entity.x, ob.x + ob.w));
      const closestY = Math.max(ob.y, Math.min(entity.y, ob.y + ob.h));
      const distX = entity.x - closestX;
      const distY = entity.y - closestY;
      const dSq = distX * distX + distY * distY;
      if (dSq < entity.radius * entity.radius) {
        const d = Math.sqrt(dSq);
        if (d > 0.0001) {
          const push = entity.radius - d;
          entity.x += (distX / d) * push;
          entity.y += (distY / d) * push;
        } else {
          const dL = Math.abs(entity.x - ob.x);
          const dR = Math.abs(entity.x - (ob.x + ob.w));
          const dT = Math.abs(entity.y - ob.y);
          const dB = Math.abs(entity.y - (ob.y + ob.h));
          const minD = Math.min(dL, dR, dT, dB);
          if (minD === dL) entity.x = ob.x - entity.radius;
          else if (minD === dR) entity.x = ob.x + ob.w + entity.radius;
          else if (minD === dT) entity.y = ob.y - entity.radius;
          else entity.y = ob.y + ob.h + entity.radius;
        }
      }
    }
    // Arena boundary containment
    entity.x = Math.max(entity.radius + 42, Math.min(MAP_WIDTH - entity.radius - 42, entity.x));
    entity.y = Math.max(entity.radius + 42, Math.min(MAP_HEIGHT - entity.radius - 42, entity.y));
  }

  // Smooth, non-penetrating separation between Player and Enemies
  function resolvePlayerEnemyCollisions(player, zombies, obstacles) {
    if (!player || player.dead || !zombies || zombies.length === 0) return;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < zombies.length; i++) {
        const z = zombies[i];
        if (z.dead) continue;

        let dx = z.x - player.x;
        let dy = z.y - player.y;
        const minDist = player.radius + z.radius;

        // Broad-phase reject
        if (Math.abs(dx) >= minDist || Math.abs(dy) >= minDist) continue;

        let dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          // Handle degenerate edge case: identical position
          if (dist < 0.001) {
            const fallbackAngle = (player.angle !== undefined && !isNaN(player.angle)) ?
              player.angle : (i * 0.77 + 0.5);
            dx = Math.cos(fallbackAngle);
            dy = Math.sin(fallbackAngle);
            dist = 0.001;
          }

          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Mass weighting: Boss (8.0), Brute (2.5), Standard (1.0), Player (1.0)
          const zMass = z.isBoss ? 8.0 : (z.type === 'brute' ? 2.5 : 1.0);
          const pMass = 1.0;
          const totalMass = pMass + zMass;
          const pRatio = zMass / totalMass;
          const zRatio = pMass / totalMass;

          // Separate positions
          player.x -= nx * (overlap * pRatio);
          player.y -= ny * (overlap * pRatio);
          z.x += nx * (overlap * zRatio);
          z.y += ny * (overlap * zRatio);

          // If player was pushed into an obstacle/boundary, transfer obstacle counter-push to zombie
          const prevPX = player.x;
          const prevPY = player.y;
          resolveEntityObstacleCollisions(player, obstacles);
          const pCorrX = player.x - prevPX;
          const pCorrY = player.y - prevPY;
          if (pCorrX !== 0 || pCorrY !== 0) {
            z.x += pCorrX;
            z.y += pCorrY;
          }

          // If zombie was pushed into an obstacle/boundary, transfer obstacle counter-push to player
          const prevZX = z.x;
          const prevZY = z.y;
          resolveEntityObstacleCollisions(z, obstacles);
          const zCorrX = z.x - prevZX;
          const zCorrY = z.y - prevZY;
          if (zCorrX !== 0 || zCorrY !== 0) {
            player.x += zCorrX;
            player.y += zCorrY;
            resolveEntityObstacleCollisions(player, obstacles);
          }

          // Velocity cancellation: eliminate only the inward motion along collision normal
          // Leaves tangential velocity untouched so player/enemy can slide around each other smoothly
          const pInward = player.vx * nx + player.vy * ny;
          if (pInward > 0) {
            player.vx -= pInward * nx;
            player.vy -= pInward * ny;
          }

          const zInward = z.vx * (-nx) + z.vy * (-ny);
          if (zInward > 0) {
            z.vx -= zInward * (-nx);
            z.vy -= zInward * (-ny);
          }
        }
      }

      // Re-verify wall & boundary clamping so separation never pushes anyone into a wall
      resolveEntityObstacleCollisions(player, obstacles);
      for (let i = 0; i < zombies.length; i++) {
        if (!zombies[i].dead) {
          resolveEntityObstacleCollisions(zombies[i], obstacles);
        }
      }
    }
  }

  // Inter-zombie separation to prevent enemy stacking/clumping
  function resolveZombieZombieCollisions(zombies, obstacles) {
    if (!zombies || zombies.length < 2) return;
    const len = zombies.length;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < len; i++) {
        const z1 = zombies[i];
        if (z1.dead) continue;

        for (let j = i + 1; j < len; j++) {
          const z2 = zombies[j];
          if (z2.dead) continue;

          let zdx = z2.x - z1.x;
          let zdy = z2.y - z1.y;
          const minZDist = z1.radius + z2.radius + 0.5;

          if (Math.abs(zdx) >= minZDist || Math.abs(zdy) >= minZDist) continue;

          let zDist = Math.hypot(zdx, zdy);
          if (zDist < minZDist) {
            if (zDist < 0.001) {
              const fallbackAngle = (i + j) * 0.93;
              zdx = Math.cos(fallbackAngle);
              zdy = Math.sin(fallbackAngle);
              zDist = 0.001;
            }

            const zOverlap = minZDist - zDist;
            const znx = zdx / zDist;
            const zny = zdy / zDist;

            const m1 = z1.isBoss ? 8.0 : (z1.type === 'brute' ? 2.5 : 1.0);
            const m2 = z2.isBoss ? 8.0 : (z2.type === 'brute' ? 2.5 : 1.0);
            const tm = m1 + m2;
            const r1 = m2 / tm;
            const r2 = m1 / tm;

            z1.x -= znx * (zOverlap * r1);
            z1.y -= zny * (zOverlap * r1);
            z2.x += znx * (zOverlap * r2);
            z2.y += zny * (zOverlap * r2);

            // Neutralize inward velocities
            const v1Inward = z1.vx * znx + z1.vy * zny;
            if (v1Inward > 0) {
              z1.vx -= v1Inward * znx;
              z1.vy -= v1Inward * zny;
            }
            const v2Inward = z2.vx * (-znx) + z2.vy * (-zny);
            if (v2Inward > 0) {
              z2.vx -= v2Inward * (-znx);
              z2.vy -= v2Inward * (-zny);
            }
          }
        }
      }

      if (obstacles && obstacles.length > 0) {
        for (let i = 0; i < len; i++) {
          if (!zombies[i].dead) {
            resolveEntityObstacleCollisions(zombies[i], obstacles);
          }
        }
      }
    }
  }

  /* ==========================================================================
     6. WEAPONS, PROJECTILES & HAZARDS
     ========================================================================== */

  class Bullet {
    constructor(x, y, angle, weapon, isCrit = false, isHeadshot = false) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      this.angle = angle + (Math.random() * weapon.spread * 2 - weapon.spread);
      this.speed = weapon.speed;
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.damage = weapon.damage;
      this.isCrit = isCrit;
      this.isHeadshot = isHeadshot;
      if (isCrit) this.damage = Math.round(this.damage * (weapon.critMult || 2.0));
      if (isHeadshot) this.damage = Math.round(this.damage * 1.6);
      this.knockback = weapon.knockback || 5;
      this.piercingLeft = weapon.piercing || 1;
      this.color = weapon.color || '#ffdd59';
      this.length = weapon.name === 'Sniper' ? 26 : 14;
      this.traveled = 0;
      this.maxRange = 1300;
      this.dead = false;
    }

    update(dt) {
      const step = this.speed * dt * 60;
      this.prevX = this.x;
      this.prevY = this.y;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.traveled += step;
      if (this.traveled >= this.maxRange) this.dead = true;
    }

    draw(ctx) {
      ctx.save();
      ctx.strokeStyle = this.isHeadshot ? '#ff0055' : (this.isCrit ? '#ffb703' : this.color);
      ctx.lineWidth = this.isHeadshot ? 3.5 : (this.isCrit ? 3 : 2.2);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
      ctx.stroke();
      ctx.restore();
    }
  }

  class GrenadeProjectile {
    constructor(x, y, targetX, targetY, weapon) {
      this.x = x;
      this.y = y;
      const angle = Math.atan2(targetY - y, targetX - x);
      const dist = Math.min(480, Math.hypot(targetX - x, targetY - y));
      const speed = dist / 26;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.fuse = weapon.fuseTime || 1.15;
      this.damage = weapon.damage;
      this.blastRadius = weapon.blastRadius || 160;
      this.knockback = weapon.knockback || 28;
      this.radius = 6;
      this.friction = 0.94;
      this.dead = false;
      this.blinkTimer = 0;
    }

    update(dt, game) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.fuse -= dt;
      this.blinkTimer += dt * 12;

      // Bounce off obstacles
      game.obstacles.forEach(ob => {
        if (this.x + this.radius > ob.x && this.x - this.radius < ob.x + ob.w &&
            this.y + this.radius > ob.y && this.y - this.radius < ob.y + ob.h) {
          this.vx *= -0.6;
          this.vy *= -0.6;
        }
      });

      if (this.fuse <= 0) {
        this.explode(game);
      }
    }

    explode(game) {
      this.dead = true;
      game.sound.playExplosion();
      game.triggerScreenShake(14);

      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 8.5 + 2;
        game.particles.push(new Particle(
          this.x, this.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          Math.random() > 0.5 ? '#ff3344' : '#ffb703',
          Math.random() * 6 + 3,
          0.7
        ));
      }

      game.zombies.forEach(z => {
        const dist = Math.hypot(z.x - this.x, z.y - this.y);
        if (dist <= this.blastRadius) {
          const falloff = 1 - (dist / this.blastRadius) * 0.45;
          const dmg = Math.round(this.damage * falloff);
          const kbAngle = Math.atan2(z.y - this.y, z.x - this.x);
          z.takeDamage(dmg, kbAngle, this.knockback, game, true);
        }
      });

      game.obstacles.forEach(ob => {
        const cx = ob.x + ob.w / 2;
        const cy = ob.y + ob.h / 2;
        if (Math.hypot(cx - this.x, cy - this.y) <= this.blastRadius) {
          ob.takeDamage(this.damage, game);
        }
      });
    }

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (Math.floor(this.blinkTimer) % 2 === 0) {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class AcidProjectile {
    constructor(x, y, targetX, targetY) {
      this.x = x;
      this.y = y;
      this.targetX = targetX;
      this.targetY = targetY;
      const angle = Math.atan2(targetY - y, targetX - x);
      this.speed = 8.5;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.radius = 8;
      this.distToTarget = Math.hypot(targetX - x, targetY - y);
      this.traveled = 0;
      this.dead = false;
    }

    update(dt, game) {
      const step = this.speed * dt * 60;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.traveled += step;

      // Trailing venom droplets
      if (Math.random() < 0.4) {
        game.particles.push(new Particle(
          this.x, this.y,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          '#10b981',
          Math.random() * 3 + 2,
          0.3
        ));
      }

      // Check obstacle collisions (detonates against walls/barriers)
      if (checkCircleObstacleCollision(this.x, this.y, this.radius, game.obstacles)) {
        this.splash(game);
        return;
      }

      // Check hit player
      if (Math.hypot(game.player.x - this.x, game.player.y - this.y) <= game.player.radius + this.radius) {
        game.player.takeDamage(20);
        this.splash(game);
        return;
      }

      // Arrived at target or max range
      if (this.traveled >= this.distToTarget || this.traveled >= 800) {
        this.splash(game);
      }
    }

    splash(game) {
      this.dead = true;
      game.sound.playAcidSplash();
      // Spawn lingering acid puddle
      game.acidPuddles.push(new AcidPuddle(this.x, this.y));

      for (let i = 0; i < 15; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 1;
        game.particles.push(new Particle(
          this.x, this.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          '#34d399',
          Math.random() * 4 + 2,
          0.5
        ));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class AcidPuddle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 36;
      this.lifetime = 6.0;
      this.maxLifetime = 6.0;
      this.damageTimer = 0;
      this.dead = false;
    }

    update(dt, game) {
      this.lifetime -= dt;
      if (this.lifetime <= 0) {
        this.dead = true;
        return;
      }

      // Periodic bubble particle
      if (Math.random() < 0.15) {
        const ox = (Math.random() - 0.5) * this.radius * 1.5;
        const oy = (Math.random() - 0.5) * this.radius * 1.5;
        game.particles.push(new Particle(
          this.x + ox, this.y + oy,
          0, -0.6,
          '#6ee7b7',
          Math.random() * 2 + 1.5,
          0.35
        ));
      }

      // Damage player if standing inside puddle
      this.damageTimer -= dt;
      if (this.damageTimer <= 0) {
        if (Math.hypot(game.player.x - this.x, game.player.y - this.y) <= this.radius + game.player.radius) {
          game.player.takeDamage(12);
          this.damageTimer = 0.5; // damage tick every 0.5s
        }
      }
    }

    draw(ctx) {
      const alpha = Math.min(0.65, this.lifetime / 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ==========================================================================
     7. POWER-UPS
     ========================================================================== */

  class PowerUp {
    constructor(x, y, type, game = null) {
      this.x = x;
      this.y = y;
      this.type = type; // 'medkit', 'rapid_fire', 'shield', 'ammo_box', 'damage_boost', 'speed_boost'
      this.game = game;
      this.radius = 16;
      this.lifetime = 25;
      this.animOffset = Math.random() * 10;
      this.dead = false;
    }

    update(dt) {
      this.lifetime -= dt;
      this.animOffset += dt * 3;
      if (this.lifetime <= 0) this.dead = true;
    }

    draw(ctx) {
      const bob = Math.sin(this.animOffset) * 4;
      const alpha = this.lifetime < 4 ? (Math.floor(this.lifetime * 6) % 2 === 0 ? 0.3 : 1) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      const glowColors = {
        medkit: '#00e676',
        rapid_fire: '#ff9100',
        shield: '#00d2ff',
        ammo_box: '#ffb703',
        damage_boost: '#ff1744',
        speed_boost: '#eab308'
      };
      const color = glowColors[this.type] || '#ffffff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bob, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(14, 18, 27, 0.88)';
      ctx.fill();

      let drawnSprite = false;
      if (this.game && this.game.assets) {
        let imgKey = null;
        if (this.type === 'medkit' && this.game.assets.hasImage('medkit')) imgKey = 'medkit';
        else if (this.type === 'ammo_box' && this.game.assets.hasImage('ammo-crate')) imgKey = 'ammo-crate';

        if (imgKey) {
          const img = this.game.assets.getImage(imgKey);
          const iconSize = this.radius * 1.5;
          ctx.drawImage(img, this.x - iconSize / 2, this.y + bob - iconSize / 2, iconSize, iconSize);
          drawnSprite = true;
        }
      }

      if (!drawnSprite) {
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const symbols = {
          medkit: '❤️',
          rapid_fire: '⚡',
          shield: '🛡️',
          ammo_box: '💥',
          damage_boost: '🔥',
          speed_boost: '👟'
        };
        ctx.fillText(symbols[this.type] || '?', this.x, this.y + bob);
      }
      ctx.restore();
    }
  }

  /* ==========================================================================
     7b. COIN PICKUPS SYSTEM
     ========================================================================== */

  class CoinPickup {
    constructor(x, y, value = 10) {
      this.x = x;
      this.y = y;
      this.value = Math.max(1, Number(value) || 10);
      this.radius = 12;
      this.lifetime = 24.0;
      this.age = 0;
      this.dead = false;
      this.animTime = Math.random() * 10;
    }

    update(dt, player, game) {
      if (this.dead) return;
      this.age += dt;
      this.animTime += dt;
      if (this.age >= this.lifetime) {
        this.dead = true;
        return;
      }

      if (!player) return;

      // Magnet pull toward player if within range (enhanced by coinMagnet equipment)
      const magnetDist = (player.equipment && player.equipment.coinMagnet) ? 180 : 90;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < magnetDist && dist > 1) {
        const pull = (magnetDist - dist) * 5.2;
        this.x += ((player.x - this.x) / dist) * pull * dt;
        this.y += ((player.y - this.y) / dist) * pull * dt;
      }

      if (dist <= player.radius + this.radius) {
        this.collect(game);
      }
    }

    collect(game) {
      if (this.dead) return;
      this.dead = true;
      if (game && game.player) {
        game.player.addCoins(this.value);
        if (game.sound) game.sound.playCoin();
        game.damageNumbers.push(new DamageNumber(this.x, this.y - 14, `+${this.value} 🪙`, '#ffca28', true));

        // Spawn gold sparkles
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = Math.random() * 3 + 1;
          game.particles.push(new Particle(
            this.x, this.y,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd,
            '#ffca28',
            Math.random() * 2.5 + 1.5,
            0.35,
            'circle',
            0.9
          ));
        }
      }
    }

    draw(ctx) {
      if (this.dead) return;
      // Blink when near expiration
      if (this.lifetime - this.age < 3.0) {
        if (Math.floor(this.age * 9) % 2 === 0) return;
      }

      ctx.save();
      ctx.translate(this.x, this.y);

      // Gentle floating bob
      const bob = Math.sin(this.animTime * 4.2) * 3.5;
      ctx.translate(0, bob);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 11 - bob * 0.5, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal 3D rotation scale
      const cosVal = Math.cos(this.animTime * 3.2);
      const scaleX = Math.abs(cosVal) < 0.18 ? 0.18 : cosVal;
      ctx.scale(scaleX, 1);

      // Outer gold disc
      const grad = ctx.createLinearGradient(-9, -9, 9, 9);
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.4, '#ffca28');
      grad.addColorStop(1, '#b45309');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner rim
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Inner symbol
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 8px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.5);

      ctx.restore();
    }

    render(ctx) {
      this.draw(ctx);
    }
  }

  /* ==========================================================================
     8. OBJECTIVES SYSTEM
     ========================================================================== */

  class ObjectiveManager {
    constructor(game) {
      this.game = game;
      this.active = false;
      this.type = null; // 'supply_run', 'rescue', 'generator', 'extraction', 'defense'
      this.title = '';
      this.progressText = '';
      this.timer = 0;
      this.maxTimer = 0;
      this.targetX = 0;
      this.targetY = 0;

      // Objective Specifics
      this.supplyCrates = [];
      this.cratesCollected = 0;
      this.survivorNpc = null;
      this.generatorCharge = 0;
      this.defenseTimer = 0;
      this.defenseRadius = 120;
    }

    startRandomObjective(waveNum) {
      const types = ['supply_run', 'rescue', 'generator', 'extraction', 'defense'];
      this.type = types[Math.floor(Math.random() * types.length)];
      this.active = true;

      const p = this.game.player;

      if (this.type === 'supply_run') {
        this.title = 'SUPPLY RUN';
        this.cratesCollected = 0;
        this.supplyCrates = [];
        // Spawn 3 crates in different areas away from obstacles
        for (let i = 0; i < 3; i++) {
          const angle = (i * (Math.PI * 2 / 3)) + Math.random() * 0.5;
          const dist = 450 + Math.random() * 350;
          let cx = Math.max(120, Math.min(MAP_WIDTH - 120, p.x + Math.cos(angle) * dist));
          let cy = Math.max(120, Math.min(MAP_HEIGHT - 120, p.y + Math.sin(angle) * dist));
          this.supplyCrates.push({ x: cx, y: cy, radius: 22, collected: false });
        }
        this.targetX = this.supplyCrates[0].x;
        this.targetY = this.supplyCrates[0].y;
        this.progressText = 'Crates: 0 / 3';
        this.timer = 0;
      } else if (this.type === 'rescue') {
        this.title = 'PROTECT SURVIVOR';
        this.timer = 40;
        this.maxTimer = 40;
        const angle = Math.random() * Math.PI * 2;
        const dist = 360;
        const nx = Math.max(160, Math.min(MAP_WIDTH - 160, p.x + Math.cos(angle) * dist));
        const ny = Math.max(160, Math.min(MAP_HEIGHT - 160, p.y + Math.sin(angle) * dist));
        this.survivorNpc = { x: nx, y: ny, hp: 220, maxHp: 220, radius: 18 };
        this.targetX = nx;
        this.targetY = ny;
        this.progressText = `Timer: ${Math.ceil(this.timer)}s | HP: 100%`;
      } else if (this.type === 'generator') {
        this.title = 'ACTIVATE GENERATOR';
        this.generatorCharge = 0;
        this.targetX = 1400;
        this.targetY = 1400;
        this.progressText = 'Stand near generator: 0%';
        this.timer = 0;
      } else if (this.type === 'extraction') {
        this.title = 'REACH EXTRACTION ZONE';
        this.timer = 45;
        this.maxTimer = 45;
        // Place extraction zone at landmark
        this.targetX = 2100;
        this.targetY = 2100;
        this.progressText = `Time Remaining: ${Math.ceil(this.timer)}s`;
      } else if (this.type === 'defense') {
        this.title = 'HOLD DEFENSIVE PERIMETER';
        this.defenseTimer = 35;
        this.maxTimer = 35;
        this.targetX = p.x;
        this.targetY = p.y;
        this.progressText = `Hold zone: ${Math.ceil(this.defenseTimer)}s`;
      }

      this.updateHud();
    }

    update(dt) {
      if (!this.active) return;
      const p = this.game.player;

      if (this.type === 'supply_run') {
        this.supplyCrates.forEach((crate, idx) => {
          if (!crate.collected && Math.hypot(p.x - crate.x, p.y - crate.y) <= p.radius + crate.radius) {
            crate.collected = true;
            this.cratesCollected++;
            this.game.sound.playCoin();
            this.game.damageNumbers.push(new DamageNumber(crate.x, crate.y, 'CRATE SECURED!', '#ffb703', true));
            if (this.cratesCollected >= 3) {
              this.completeObjective();
            } else {
              // Update target coords to next uncollected crate
              const next = this.supplyCrates.find(c => !c.collected);
              if (next) {
                this.targetX = next.x;
                this.targetY = next.y;
              }
            }
          }
        });
        this.progressText = `Crates: ${this.cratesCollected} / 3`;
      } else if (this.type === 'rescue') {
        this.timer -= dt;
        const npc = this.survivorNpc;
        // Check zombie damage to NPC
        this.game.zombies.forEach(z => {
          if (Math.hypot(z.x - npc.x, z.y - npc.y) <= z.radius + npc.radius) {
            npc.hp -= z.damage * dt * 0.8;
            if (Math.random() < 0.1) this.game.sound.playPlayerHurt();
          }
        });

        if (npc.hp <= 0) {
          this.failObjective('SURVIVOR PERISHED');
          return;
        }

        const pct = Math.max(0, Math.round((npc.hp / npc.maxHp) * 100));
        this.progressText = `Timer: ${Math.ceil(this.timer)}s | Survivor: ${pct}%`;

        if (this.timer <= 0) {
          this.completeObjective();
        }
      } else if (this.type === 'generator') {
        const dist = Math.hypot(p.x - this.targetX, p.y - this.targetY);
        if (dist <= 80) {
          this.generatorCharge += dt * 13; // ~7.5 seconds of standing
          if (Math.random() < 0.2) {
            this.game.particles.push(new Particle(
              this.targetX + (Math.random() - 0.5) * 30,
              this.targetY + (Math.random() - 0.5) * 30,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              '#00d2ff', 2.5, 0.3
            ));
          }
        }
        const pct = Math.min(100, Math.floor(this.generatorCharge));
        this.progressText = `Repairing: ${pct}%`;
        if (this.generatorCharge >= 100) {
          this.completeObjective();
        }
      } else if (this.type === 'extraction') {
        this.timer -= dt;
        const dist = Math.hypot(p.x - this.targetX, p.y - this.targetY);
        this.progressText = `Time: ${Math.ceil(this.timer)}s | Dist: ${Math.round(dist)}px`;
        if (dist <= 75) {
          this.completeObjective();
        } else if (this.timer <= 0) {
          this.failObjective('EXTRACTION WINDOW EXPIRED');
        }
      } else if (this.type === 'defense') {
        const dist = Math.hypot(p.x - this.targetX, p.y - this.targetY);
        if (dist <= this.defenseRadius) {
          this.defenseTimer -= dt;
          this.progressText = `Hold Zone: ${Math.ceil(this.defenseTimer)}s`;
        } else {
          this.progressText = '⚠️ RETURN TO DEFENSE ZONE!';
        }
        if (this.defenseTimer <= 0) {
          this.completeObjective();
        }
      }

      this.updateHud();
    }

    completeObjective() {
      this.active = false;
      this.game.sound.playWaveClear();
      let bonusCoins = ECONOMY_CONFIG.rewards.objectiveBase + this.game.currentWave * ECONOMY_CONFIG.rewards.objectivePerWave;
      if (this.type === 'extraction') {
        bonusCoins += ECONOMY_CONFIG.rewards.finalExtractionBonus;
      }
      const bonusXp = 350 + this.game.currentWave * 50;

      this.game.player.addCoins(bonusCoins);
      this.game.player.addXp(bonusXp);
      this.game.player.applyBuff('damage_boost', 15);

      this.game.damageNumbers.push(new DamageNumber(this.game.player.x, this.game.player.y - 30, `OBJECTIVE COMPLETE! +${bonusCoins} 🪙`, '#ffca28', true));

      const panel = document.getElementById('objectivePanel');
      if (panel) panel.classList.add('hidden');
    }

    failObjective(reason) {
      this.active = false;
      this.game.sound.playEmpty();
      this.game.damageNumbers.push(new DamageNumber(this.game.player.x, this.game.player.y - 30, `OBJECTIVE FAILED: ${reason}`, '#ff3344', true));
      const panel = document.getElementById('objectivePanel');
      if (panel) panel.classList.add('hidden');
    }

    updateHud() {
      const panel = document.getElementById('objectivePanel');
      const titleEl = document.getElementById('objTitle');
      const progEl = document.getElementById('objProgress');
      const timerEl = document.getElementById('objTimer');

      if (!panel || !this.active) {
        if (panel) panel.classList.add('hidden');
        return;
      }

      panel.classList.remove('hidden');
      if (titleEl) titleEl.textContent = this.title;
      if (progEl) progEl.textContent = this.progressText;
      if (timerEl) {
        if (this.timer > 0) timerEl.textContent = `${Math.ceil(this.timer)}s`;
        else timerEl.textContent = '';
      }
    }

    draw(ctx) {
      if (!this.active) return;
      ctx.save();

      // Render world-space markers
      if (this.type === 'supply_run') {
        this.supplyCrates.forEach((c, idx) => {
          if (!c.collected) {
            ctx.fillStyle = '#ffca28';
            ctx.shadowColor = '#ffca28';
            ctx.shadowBlur = 12;
            ctx.fillRect(c.x - 14, c.y - 14, 28, 28);
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 3;
            ctx.strokeRect(c.x - 14, c.y - 14, 28, 28);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', c.x, c.y);
          }
        });
      } else if (this.type === 'rescue' && this.survivorNpc) {
        const npc = this.survivorNpc;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.stroke();

        // NPC HP bar
        const hpPct = Math.max(0, npc.hp / npc.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(npc.x - 20, npc.y - npc.radius - 12, 40, 5);
        ctx.fillStyle = '#00e676';
        ctx.fillRect(npc.x - 20, npc.y - npc.radius - 12, 40 * hpPct, 5);
      } else if (this.type === 'generator') {
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, 80, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.targetX - 22, this.targetY - 22, 44, 44);
        ctx.fillStyle = '#00d2ff';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', this.targetX, this.targetY);
      } else if (this.type === 'extraction') {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, 75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 30px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', this.targetX, this.targetY);
      } else if (this.type === 'defense') {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, this.defenseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.fill();
      }

      ctx.restore();
    }

    drawCompassArrow(ctx, screenW, screenH, camX, camY) {
      if (!this.active) return;
      const p = this.game.player;
      if (!p) return;

      const screenTargetX = this.targetX - camX;
      const screenTargetY = this.targetY - camY;

      // Only draw pointer if offscreen
      const isOffscreen = screenTargetX < 40 || screenTargetX > screenW - 40 ||
                         screenTargetY < 40 || screenTargetY > screenH - 40;
      if (!isOffscreen) return;

      const pScreenX = p.x - camX;
      const pScreenY = p.y - camY;
      const angle = Math.atan2(this.targetY - p.y, this.targetX - p.x);

      const radius = Math.min(screenW, screenH) * 0.38;
      const arrowX = pScreenX + Math.cos(angle) * radius;
      const arrowY = pScreenY + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);

      ctx.fillStyle = '#ffca28';
      ctx.shadowColor = '#ffca28';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  /* ==========================================================================
     9. ROGUELITE UPGRADE MANAGER
     ========================================================================== */

  const UPGRADE_POOL = [
    { id: 'damage', name: 'HEAVY HITTER', icon: '💥', stat: '+25% Damage', desc: 'High-caliber kinetic munitions enhance stopping power across all weapons.', max: 6 },
    { id: 'fireRate', name: 'GUNSLINGER', icon: '⚡', stat: '+20% Fire Rate', desc: 'Precision-tuned firing mechanisms dramatically accelerate cyclic fire rates.', max: 5 },
    { id: 'moveSpeed', name: 'RUNNER', icon: '👟', stat: '+15% Move Speed', desc: 'Lightweight tactical combat boots enhance agile maneuvers and sprint speed.', max: 5 },
    { id: 'maxHealth', name: 'JUGGERNAUT', icon: '❤️', stat: '+35 Max HP', desc: 'Reinforced ballistic trauma plates increase maximum health and restore 35 HP.', max: 6 },
    { id: 'reloadSpeed', name: 'FAST HANDS', icon: '🔄', stat: '+25% Reload Speed', desc: 'Mag-drop drills and dual mag-couplers shorten reload downtime.', max: 4 },
    { id: 'magSize', name: 'EXTENDED MAGS', icon: '🔋', stat: '+30% Magazine', desc: 'Extended drum magazines expand round capacity before reloading.', max: 4 },
    { id: 'critChance', name: 'DEADEYE', icon: '🎯', stat: '+7% Crit Chance', desc: 'Holographic tactical sights maximize probability of landing lethal critical shots.', max: 5 },
    { id: 'critDmg', name: 'EXECUTIONER', icon: '☠️', stat: '+45% Crit Damage', desc: 'Hollow-point core expansion causes devastating critical damage.', max: 4 },
    { id: 'lifesteal', name: 'VAMPIRE', icon: '🩸', stat: '+4 HP on Kill', desc: 'Nanite biovampiric siphon restores survivor health on every enemy eliminated.', max: 3 },
    { id: 'armor', name: 'KEVLAR PLATING', icon: '🛡️', stat: '-15% Dmg Taken', desc: 'Hardened composite body armor absorbs direct blunt and biting trauma.', max: 3 },
    { id: 'sprintStamina', name: 'ADRENALINE', icon: '⚡', stat: '+35 Max Stamina', desc: 'Enhanced cardio conditioning increases sprint stamina pool and recharge speed.', max: 4 },
    { id: 'bounty', name: 'BOUNTY HUNTER', icon: '💰', stat: '+35% Coins & XP', desc: 'Tactical bounty telemetry increases gold bounty and XP yields.', max: 3 }
  ];

  class UpgradeManager {
    constructor(game) {
      this.game = game;
      this.activeChoices = [];
    }

    presentChoices(title = 'CHOOSE AN UPGRADE', subtitle = 'Select a tactical upgrade') {
      const modal = document.getElementById('upgradeChoiceModal');
      const titleEl = document.getElementById('upgradeChoiceTitle');
      const subEl = document.getElementById('upgradeChoiceSubtitle');
      const cardsWrap = document.getElementById('upgradeChoiceCards');

      if (!modal || !cardsWrap) return;

      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = subtitle;

      // Filter available upgrades by max level
      const p = this.game.player;
      const available = UPGRADE_POOL.filter(u => (p.upgrades[u.id] || 1) <= u.max);

      // Shuffle and take 3
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      this.activeChoices = shuffled.slice(0, 3);

      cardsWrap.innerHTML = '';

      this.activeChoices.forEach(choice => {
        const card = document.createElement('div');
        card.className = 'uc-card';
        card.innerHTML = `
          <span class="uc-icon">${choice.icon}</span>
          <span class="uc-name">${choice.name}</span>
          <span class="uc-stat">${choice.stat}</span>
          <p class="uc-desc">${choice.desc}</p>
        `;

        card.addEventListener('click', () => {
          this.applyUpgrade(choice.id);
          this.closeChoices();
        });

        cardsWrap.appendChild(card);
      });

      const skipBtn = document.getElementById('btnSkipUpgrade');
      if (skipBtn) {
        skipBtn.onclick = () => this.closeChoices();
      }

      this.game.state = 'upgrades';
      modal.classList.remove('hidden');
      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.game.touchActive = false;
      this.game.touchMoveX = 0;
      this.game.touchMoveY = 0;
      this.game.rightTouchAiming = false;
      this.game.updateCursorState();
    }

    applyUpgrade(upgradeId) {
      const p = this.game.player;
      p.upgrades[upgradeId] = (p.upgrades[upgradeId] || 1) + 1;

      if (upgradeId === 'maxHealth') {
        p.maxHealth += 35;
        p.health = Math.min(p.maxHealth, p.health + 35);
      }

      this.game.sound.playPowerup();
      this.game.updateHud();
    }

    closeChoices() {
      const modal = document.getElementById('upgradeChoiceModal');
      if (modal) modal.classList.add('hidden');

      // If wave cleared, transition to the Sector Secured / Armory intermission dialog
      if (this.game.waveManager.waveClearedPending) {
        this.game.showWaveClearedDialog();
      } else {
        this.game.state = 'playing';
        this.game.lastTime = performance.now();
        this.game.updateCursorState();
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024) {
          const mob = document.getElementById('mobileControls');
          if (mob) mob.classList.remove('hidden');
        }
      }
    }
  }

  /* ==========================================================================
     9b. ARMORY & SHOP ECONOMY MANAGER
     ========================================================================== */

  class ArmoryManager {
    constructor(game) {
      this.game = game;
      this.currentCategory = 'weapons'; // 'weapons', 'player', 'permanent', 'supplies', 'blackMarket'
      this.activeBlackMarket = [];
      this.lastBmRotationWave = 0;
      this.rotateBlackMarket(1);
      this.initEventListeners();
    }

    initEventListeners() {
      // Tab switching
      document.querySelectorAll('.armory-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.armory-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentCategory = btn.dataset.category;
          this.game.sound.playButtonClick();
          this.render();
        });
      });

      // Close buttons
      const closeBtn = document.getElementById('btnCloseArmory');
      const closeX = document.getElementById('btnCloseArmoryX');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());
      if (closeX) closeX.addEventListener('click', () => this.close());

      // Wave Cleared dialog buttons
      const btnOpenArmoryWave = document.getElementById('btnOpenArmoryWave');
      const btnContinueWave = document.getElementById('btnContinueWave');
      if (btnOpenArmoryWave) {
        btnOpenArmoryWave.addEventListener('click', () => {
          this.game.sound.playButtonClick();
          const wcModal = document.getElementById('waveClearedModal');
          if (wcModal) wcModal.classList.add('hidden');
          this.open('weapons');
        });
      }
      if (btnContinueWave) {
        btnContinueWave.addEventListener('click', () => {
          this.game.sound.playButtonClick();
          const wcModal = document.getElementById('waveClearedModal');
          if (wcModal) wcModal.classList.add('hidden');
          this.game.resumeAfterWaveIntermission();
        });
      }

      // Menu and Pause Armory buttons
      const btnMenuArmory = document.getElementById('btnMenuArmory');
      if (btnMenuArmory) {
        btnMenuArmory.addEventListener('click', () => {
          this.game.sound.playButtonClick();
          this.open('permanent');
        });
      }
      const btnPauseArmory = document.getElementById('btnPauseArmory');
      if (btnPauseArmory) {
        btnPauseArmory.addEventListener('click', () => {
          this.game.sound.playButtonClick();
          const pModal = document.getElementById('pauseModal');
          if (pModal) pModal.classList.add('hidden');
          this.open('weapons');
        });
      }
      const btnGameOverArmory = document.getElementById('btnGameOverArmory');
      if (btnGameOverArmory) {
        btnGameOverArmory.addEventListener('click', () => {
          this.game.sound.playButtonClick();
          this.open('permanent');
        });
      }
    }

    checkBlackMarketRotation(wave) {
      if (wave >= this.lastBmRotationWave + 2) {
        this.rotateBlackMarket(wave);
      }
    }

    rotateBlackMarket(wave) {
      this.lastBmRotationWave = wave;
      const allDeals = [
        { key: 'damageSurge', name: 'DAMAGE SURGE', icon: '🔥', desc: '+20% kinetic damage across all weapons for this run', cost: ECONOMY_CONFIG.costs.blackMarket.damageSurge },
        { key: 'quickHands', name: 'QUICK HANDS', icon: '⚡', desc: '+25% universal reload speed enhancement for this run', cost: ECONOMY_CONFIG.costs.blackMarket.quickHands },
        { key: 'vampiricShots', name: 'VAMPIRIC SHOTS', icon: '🩸', desc: 'Restores +3 HP on every zombie eliminated for this run', cost: ECONOMY_CONFIG.costs.blackMarket.vampiricShots },
        { key: 'bountyHunter', name: 'BOUNTY HUNTER', icon: '💰', desc: '+25% increased coin rewards from all sources for this run', cost: ECONOMY_CONFIG.costs.blackMarket.bountyHunter },
        { key: 'explosiveRounds', name: 'EXPLOSIVE ROUNDS', icon: '💥', desc: '22% chance for munitions to cause kinetic splash damage', cost: ECONOMY_CONFIG.costs.blackMarket.explosiveRounds }
      ];
      const shuffled = [...allDeals].sort(() => Math.random() - 0.5);
      this.activeBlackMarket = shuffled.slice(0, 3);
    }

    open(initialCategory = null) {
      this.previousState = this.game.state;
      this.game.state = 'armory';

      if (initialCategory) {
        this.currentCategory = initialCategory;
        document.querySelectorAll('.armory-tab-btn').forEach(btn => {
          if (btn.dataset.category === initialCategory) btn.classList.add('active');
          else btn.classList.remove('active');
        });
      }

      // Hide mobile controls during shopping
      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.game.touchActive = false;
      this.game.touchMoveX = 0;
      this.game.touchMoveY = 0;
      this.game.rightTouchAiming = false;
      this.game.input.isShooting = false;
      this.game.input.isSprinting = false;
      this.game.updateCursorState();

      const modal = document.getElementById('armoryModal');
      if (modal) modal.classList.remove('hidden');

      this.updateHeaderStats();
      this.render();
    }

    close() {
      const modal = document.getElementById('armoryModal');
      if (modal) modal.classList.add('hidden');

      if (this.previousState === 'intermission' || this.game.waveManager.waveClearedPending) {
        this.game.resumeAfterWaveIntermission();
      } else if (this.previousState === 'paused') {
        this.game.state = 'paused';
        const pModal = document.getElementById('pauseModal');
        if (pModal) pModal.classList.remove('hidden');
      } else if (this.previousState === 'gameover') {
        this.game.state = 'gameover';
        const goModal = document.getElementById('gameOverModal');
        if (goModal) goModal.classList.remove('hidden');
      } else if (this.previousState === 'menu') {
        this.game.state = 'menu';
        const mModal = document.getElementById('mainMenuScreen');
        if (mModal) mModal.classList.remove('hidden');
      } else {
        this.game.state = 'playing';
        this.game.lastTime = performance.now();
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024) {
          const mob = document.getElementById('mobileControls');
          if (mob) mob.classList.remove('hidden');
        }
      }
      this.game.updateCursorState();
    }

    updateHeaderStats() {
      const runCoins = document.getElementById('armoryRunCoins');
      const bankedCoins = document.getElementById('armoryBankedCoins');
      const waveEl = document.getElementById('armoryWaveNum');
      const hpEl = document.getElementById('armoryHpVal');
      const wName = document.getElementById('armoryWeaponVal');

      const p = this.game.player;
      if (runCoins) runCoins.textContent = (this.game.stats.coins || 0).toLocaleString();
      if (bankedCoins) bankedCoins.textContent = (this.game.settings.bankedCoins || 0).toLocaleString();
      if (waveEl) waveEl.textContent = this.game.currentWave;
      if (hpEl) hpEl.textContent = p ? `${Math.round(p.health)} / ${p.maxHealth}` : '100 / 100';
      if (wName && p) {
        const curW = p.weapons[p.currentWeaponIndex];
        wName.textContent = curW ? curW.key.toUpperCase() : 'PISTOL';
      }
    }

    showNotification(msg) {
      const el = document.getElementById('armoryNotification');
      if (!el) return;
      el.textContent = msg;
      el.classList.remove('hidden');
      if (this.notifTimer) clearTimeout(this.notifTimer);
      this.notifTimer = setTimeout(() => {
        el.classList.add('hidden');
      }, 2500);
    }

    render() {
      this.updateHeaderStats();
      const grid = document.getElementById('armoryCardsGrid');
      const subTitle = document.getElementById('armoryCategoryTitle');
      const subDesc = document.getElementById('armoryCategoryDesc');
      if (!grid) return;
      grid.innerHTML = '';

      switch (this.currentCategory) {
        case 'weapons':
          if (subTitle) subTitle.textContent = 'WEAPON CALIBRATION & ARSENAL';
          if (subDesc) subDesc.textContent = 'Upgrade damage, rate of fire, magazine capacity, and reload speeds';
          this.renderWeaponsTab(grid);
          break;
        case 'player':
          if (subTitle) subTitle.textContent = 'SURVIVOR CONDITIONING (RUN UPGRADES)';
          if (subDesc) subDesc.textContent = 'Enhance vitality, tactical mobility, critical precision, and bounty yield';
          this.renderPlayerTab(grid);
          break;
        case 'equipment':
          if (subTitle) subTitle.textContent = 'TACTICAL COMBAT EQUIPMENT';
          if (subDesc) subDesc.textContent = 'Special gear enhancements and utility attachments for active field operations';
          this.renderEquipmentTab(grid);
          break;
        case 'permanent':
          if (subTitle) subTitle.textContent = 'PERMANENT BASE UPGRADES (BANKED COINS)';
          if (subDesc) subDesc.textContent = 'Permanent survivor traits that persist across all runs via local persistence';
          this.renderPermanentTab(grid);
          break;
        case 'supplies':
          if (subTitle) subTitle.textContent = 'TACTICAL FIELD SUPPLIES';
          if (subDesc) subDesc.textContent = 'Emergency medical trauma kits, ballistic armor repairs, and ammunition drops';
          this.renderSuppliesTab(grid);
          break;
        case 'blackMarket':
          if (subTitle) subTitle.textContent = 'UNDERGROUND BLACK MARKET (SPECIAL DEALS)';
          if (subDesc) subDesc.textContent = 'Rare tactical prototypes rotating every 2 waves. Single-purchase per run.';
          this.renderBlackMarketTab(grid);
          break;
      }
    }

    renderWeaponsTab(container) {
      const p = this.game.player;
      if (!p) {
        container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;">Enter combat to calibrate survivor weapons.</p>';
        return;
      }

      const weaponDefinitions = [
        {
          key: 'pistol', name: 'PISTOL', icon: '🔫',
          upgrades: [
            { key: 'damage', name: 'Damage', desc: 'Stopping power per round', getVal: (lv) => 28 + (lv - 1) * 6, unit: ' DMG' },
            { key: 'fireRate', name: 'Fire Rate', desc: 'Trigger cyclic rate', getVal: (lv) => (0.22 - (lv - 1) * 0.02).toFixed(2), unit: 's delay' },
            { key: 'magSize', name: 'Magazine', desc: 'Rounds per magazine', getVal: (lv) => 12 + (lv - 1) * 3, unit: ' rds' },
            { key: 'reloadSpeed', name: 'Reload Speed', desc: 'Tactical mag cycle speed', getVal: (lv) => (1.0 - (lv - 1) * 0.1).toFixed(1), unit: 's' },
            { key: 'critChance', name: 'Crit Chance', desc: 'Holographic sight alignment', getVal: (lv) => (5 + (lv - 1) * 5), unit: '%' }
          ]
        },
        {
          key: 'shotgun', name: 'SHOTGUN', icon: '💥',
          upgrades: [
            { key: 'damage', name: 'Damage', desc: 'Pellet kinetic trauma', getVal: (lv) => 19 + (lv - 1) * 3, unit: ' DMG/pellet' },
            { key: 'pellets', name: 'Pellet Count', desc: 'Chamber buckshot count', getVal: (lv) => 8 + (lv - 1) * 1, unit: ' pellets' },
            { key: 'magSize', name: 'Magazine', desc: 'Tube magazine extension', getVal: (lv) => 6 + (lv - 1) * 1, unit: ' shells' },
            { key: 'reloadSpeed', name: 'Reload Speed', desc: 'Speed loader tube feed', getVal: (lv) => (1.8 - (lv - 1) * 0.17).toFixed(2), unit: 's' },
            { key: 'spread', name: 'Spread Control', desc: 'Choke barrel constriction', getVal: (lv) => (0.20 - (lv - 1) * 0.02).toFixed(2), unit: ' spread' }
          ]
        },
        {
          key: 'smg', name: 'SMG', icon: '⚡',
          upgrades: [
            { key: 'damage', name: 'Damage', desc: 'High-velocity 9mm rounds', getVal: (lv) => 17 + (lv - 1) * 3, unit: ' DMG' },
            { key: 'fireRate', name: 'Fire Rate', desc: 'Recoil spring tuning', getVal: (lv) => (0.085 - (lv - 1) * 0.007).toFixed(3), unit: 's delay' },
            { key: 'magSize', name: 'Magazine', desc: 'Extended drum capacity', getVal: (lv) => 35 + (lv - 1) * 6, unit: ' rds' },
            { key: 'reloadSpeed', name: 'Reload Speed', desc: 'Quick-drop magazine latch', getVal: (lv) => (1.3 - (lv - 1) * 0.12).toFixed(2), unit: 's' },
            { key: 'accuracy', name: 'Accuracy', desc: 'Compensator recoil brake', getVal: (lv) => (0.08 - (lv - 1) * 0.009).toFixed(3), unit: ' spread' }
          ]
        },
        {
          key: 'sniper', name: 'SNIPER', icon: '🎯',
          upgrades: [
            { key: 'damage', name: 'Damage', desc: '.50 BMG armor-piercing core', getVal: (lv) => 185 + (lv - 1) * 45, unit: ' DMG' },
            { key: 'critDmg', name: 'Critical Damage', desc: 'Devastating headshot lethality', getVal: (lv) => (3.5 + (lv - 1) * 0.5).toFixed(1), unit: 'x crit' },
            { key: 'reloadSpeed', name: 'Reload Speed', desc: 'Polished bolt-action cycle', getVal: (lv) => (2.2 - (lv - 1) * 0.22).toFixed(2), unit: 's' },
            { key: 'magSize', name: 'Magazine', desc: 'Reinforced box mag', getVal: (lv) => 5 + (lv - 1) * 1, unit: ' rds' },
            { key: 'piercing', name: 'Piercing Rounds', desc: 'Line-penetrating kinetic punch', getVal: (lv) => 3 + (lv - 1) * 1, unit: ' targets' }
          ]
        },
        {
          key: 'grenade', name: 'GRENADE', icon: '💣',
          upgrades: [
            { key: 'damage', name: 'Blast Damage', desc: 'Military thermobaric explosive', getVal: (lv) => 250 + (lv - 1) * 60, unit: ' DMG' },
            { key: 'radius', name: 'Blast Radius', desc: 'Shrapnel dispersion perimeter', getVal: (lv) => 160 + (lv - 1) * 20, unit: 'px radius' },
            { key: 'maxCap', name: 'Capacity', desc: 'Tactical pouch harness storage', getVal: (lv) => 4 + (lv - 1) * 1, unit: ' grenades' },
            { key: 'fuse', name: 'Fuse Calibration', desc: 'Detonation responsiveness', getVal: (lv) => (1.15 - (lv - 1) * 0.12).toFixed(2), unit: 's fuse' }
          ]
        }
      ];

      weaponDefinitions.forEach(wDef => {
        // Weapon Category Header Card showing ownership/unlock status
        const wHeader = document.createElement('div');
        wHeader.className = 'armory-card weapon-header-card';
        wHeader.style.gridColumn = '1 / -1';
        wHeader.style.background = 'linear-gradient(90deg, rgba(20, 29, 47, 0.95), rgba(12, 18, 28, 0.95))';
        wHeader.style.borderColor = 'rgba(0, 210, 255, 0.35)';

        const wEntry = p.weapons.find(w => w.key === wDef.key);
        const isUnlocked = wEntry ? (wEntry.unlocked !== false) : true;
        const unlockCost = (ECONOMY_CONFIG.costs.weaponUnlocks && ECONOMY_CONFIG.costs.weaponUnlocks[wDef.key]) || 0;
        const canUnlock = !isUnlocked && (this.game.stats.coins >= unlockCost);

        wHeader.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:26px;">${wDef.icon}</span>
              <div>
                <h3 style="font-family:'Orbitron',monospace;font-size:15px;color:#fff;margin:0;">${wDef.name} CALIBRATION</h3>
                <span style="font-size:12px;color:#94a3b8;">Level 1–5 performance modifications</span>
              </div>
            </div>
            <div>
              ${isUnlocked
                ? '<span style="font-family:\'Orbitron\',monospace;font-size:11px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);padding:6px 12px;border:1px solid rgba(16,185,129,0.4);border-radius:4px;">✓ UNLOCKED / OWNED</span>'
                : `<button class="ac-buy-btn ${canUnlock ? 'can-buy' : 'no-funds'}" id="btnUnlock_${wDef.key}">🔒 LOCKED · UNLOCK (${unlockCost} 🪙)</button>`
              }
            </div>
          </div>
        `;

        if (!isUnlocked && canUnlock) {
          const uBtn = wHeader.querySelector(`#btnUnlock_${wDef.key}`);
          if (uBtn) {
            uBtn.addEventListener('click', () => {
              if (p.spendCoins(unlockCost)) {
                if (wEntry) wEntry.unlocked = true;
                if (this.game.settings) {
                  this.game.settings.weaponUnlocks = this.game.settings.weaponUnlocks || {};
                  this.game.settings.weaponUnlocks[wDef.key] = true;
                  SaveManager.save(this.game.settings);
                }
                this.game.sound.playPowerup();
                this.showNotification(`✓ UNLOCKED ${wDef.name}`);
                this.render();
                this.game.updateHud();
              }
            });
          }
        }
        container.appendChild(wHeader);

        wDef.upgrades.forEach(upg => {
          const curLv = (p.weaponUpgrades[wDef.key] && p.weaponUpgrades[wDef.key][upg.key]) || 1;
          const isMax = curLv >= 5;
          const cost = isMax ? 0 : ECONOMY_CONFIG.costs.weaponUpgrades[curLv - 1];
          const canAfford = !isMax && (this.game.stats.coins >= cost);

          const card = document.createElement('div');
          card.className = 'armory-card';

          let pipsHtml = '';
          for (let i = 1; i <= 5; i++) {
            const cls = i <= curLv ? (isMax ? 'pip filled maxed' : 'pip filled') : 'pip';
            pipsHtml += `<div class="${cls}"></div>`;
          }

          const curStatText = `${upg.getVal(curLv)}${upg.unit}`;
          const nextStatText = isMax ? 'MAXED' : `${upg.getVal(curLv + 1)}${upg.unit}`;

          card.innerHTML = `
            <div class="ac-header">
              <div class="ac-icon">${wDef.icon}</div>
              <div class="ac-info">
                <h4 class="ac-title">${wDef.name} · ${upg.name.toUpperCase()}</h4>
                <p class="ac-desc">${upg.desc}</p>
                <div class="ac-pips-row">
                  <span class="ac-pips-label">LV ${curLv}/5</span>
                  <div class="ac-pips-track">${pipsHtml}</div>
                </div>
              </div>
            </div>
            <div class="ac-stat-box">
              <span class="stat-curr">${curStatText}</span>
              <span class="stat-arrow">➔</span>
              <span class="stat-next">${nextStatText}</span>
            </div>
            <div class="ac-footer">
              <div class="ac-cost-wrap">
                ${isMax ? '<span style="color:#00d2ff;font-size:12px;">★ ELITE TIER</span>' : `<span>🪙</span> <span>${cost.toLocaleString()}</span>`}
              </div>
              <button class="ac-buy-btn ${isMax ? 'maxed' : (canAfford ? 'can-buy' : 'no-funds')}">
                ${isMax ? 'MAX LEVEL' : (canAfford ? 'UPGRADE' : `NEED ${cost} 🪙`)}
              </button>
            </div>
          `;

          const btn = card.querySelector('.ac-buy-btn');
          if (canAfford && !isMax) {
            btn.addEventListener('click', () => {
              if (p.spendCoins(cost)) {
                p.weaponUpgrades[wDef.key][upg.key]++;
                this.game.sound.playCoin();
                this.showNotification(`✓ UPGRADED ${wDef.name} ${upg.name.toUpperCase()} TO LV ${p.weaponUpgrades[wDef.key][upg.key]}`);
                this.render();
                this.game.updateHud();
              }
            });
          }

          container.appendChild(card);
        });
      });
    }

    renderPlayerTab(container) {
      const p = this.game.player;
      if (!p) {
        container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;">Enter combat to calibrate survivor attributes.</p>';
        return;
      }

      const playerDefs = [
        {
          key: 'maxHp', name: 'MAX HEALTH', icon: '❤️', desc: 'Reinforced vitality and cellular trauma resilience',
          levels: [100, 115, 130, 150, 175], unit: ' HP',
          onApply: (p, lv) => {
            const oldMax = p.maxHealth;
            p.maxHealth = playerDefs[0].levels[lv - 1] + (p.game.settings.permanentUpgrades?.survivor || 0) * 5 + (p.upgrades.maxHealth - 1) * 35;
            p.health = Math.min(p.maxHealth, p.health + (p.maxHealth - oldMax));
          }
        },
        {
          key: 'maxArmor', name: 'ARMOR PLATING', icon: '🛡️', desc: 'Composite ballistic plating mitigates direct trauma',
          levels: [0, 7, 13, 19, 25], unit: '% reduction',
          onApply: () => {}
        },
        {
          key: 'moveSpeed', name: 'MOVEMENT SPEED', icon: '🏃', desc: 'Lightweight combat boots and agile evasion stride',
          levels: [3.9, 4.15, 4.35, 4.55, 4.8], unit: ' spd',
          onApply: () => {}
        },
        {
          key: 'stamina', name: 'SPRINT STAMINA', icon: '⚡', desc: 'Cardiovascular conditioning expands tactical sprint pool',
          levels: [100, 115, 130, 145, 160], unit: ' stamina',
          onApply: (p, lv) => {
            const permAth = (p.game.settings.permanentUpgrades?.athlete || 0) * 0.05;
            p.maxStamina = Math.round(playerDefs[3].levels[lv - 1] * (1 + permAth)) + (p.upgrades.sprintStamina - 1) * 35;
          }
        },
        {
          key: 'reloadSpeed', name: 'RELOAD SPEED', icon: '🔄', desc: 'Speed drills shorten magazine downtime across all firearms',
          levels: [0, 8, 16, 25, 35], unit: '% faster',
          onApply: () => {}
        },
        {
          key: 'critChance', name: 'CRITICAL CHANCE', icon: '🎯', desc: 'Target acquisition training increases vital hit probability',
          levels: [0, 3, 6, 10, 15], unit: '% crit',
          onApply: () => {}
        },
        {
          key: 'xpGain', name: 'XP HARVEST', icon: '⭐', desc: 'Tactical analysis accelerates survivor leveling yields',
          levels: [0, 8, 15, 22, 30], unit: '% bonus XP',
          onApply: () => {}
        },
        {
          key: 'coinGain', name: 'BOUNTY YIELD', icon: '💰', desc: 'Encrypted bounty transponder increases coin earnings',
          levels: [0, 8, 15, 22, 30], unit: '% bonus coins',
          onApply: () => {}
        }
      ];

      playerDefs.forEach(pDef => {
        const curLv = (p.playerUpgrades && p.playerUpgrades[pDef.key]) || 1;
        const isMax = curLv >= 5;
        const cost = isMax ? 0 : ECONOMY_CONFIG.costs.playerUpgrades[curLv - 1];
        const canAfford = !isMax && (this.game.stats.coins >= cost);

        const card = document.createElement('div');
        card.className = 'armory-card';

        let pipsHtml = '';
        for (let i = 1; i <= 5; i++) {
          const cls = i <= curLv ? (isMax ? 'pip filled maxed' : 'pip filled') : 'pip';
          pipsHtml += `<div class="${cls}"></div>`;
        }

        const curStatText = `${pDef.levels[curLv - 1]}${pDef.unit}`;
        const nextStatText = isMax ? 'MAXED' : `${pDef.levels[curLv]}${pDef.unit}`;

        card.innerHTML = `
          <div class="ac-header">
            <div class="ac-icon">${pDef.icon}</div>
            <div class="ac-info">
              <h4 class="ac-title">${pDef.name}</h4>
              <p class="ac-desc">${pDef.desc}</p>
              <div class="ac-pips-row">
                <span class="ac-pips-label">LV ${curLv}/5</span>
                <div class="ac-pips-track">${pipsHtml}</div>
              </div>
            </div>
          </div>
          <div class="ac-stat-box">
            <span class="stat-curr">${curStatText}</span>
            <span class="stat-arrow">➔</span>
            <span class="stat-next">${nextStatText}</span>
          </div>
          <div class="ac-footer">
            <div class="ac-cost-wrap">
              ${isMax ? '<span style="color:#00d2ff;font-size:12px;">★ MAX LEVEL</span>' : `<span>🪙</span> <span>${cost.toLocaleString()}</span>`}
            </div>
            <button class="ac-buy-btn ${isMax ? 'maxed' : (canAfford ? 'can-buy' : 'no-funds')}">
              ${isMax ? 'MAX LEVEL' : (canAfford ? 'UPGRADE' : `NEED ${cost} 🪙`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('.ac-buy-btn');
        if (canAfford && !isMax) {
          btn.addEventListener('click', () => {
            if (p.spendCoins(cost)) {
              p.playerUpgrades[pDef.key]++;
              pDef.onApply(p, p.playerUpgrades[pDef.key]);
              this.game.sound.playCoin();
              this.showNotification(`✓ UPGRADED ${pDef.name} TO LV ${p.playerUpgrades[pDef.key]}`);
              this.render();
              this.game.updateHud();
            }
          });
        }

        container.appendChild(card);
      });
    }

    renderPermanentTab(container) {
      const perm = this.game.settings.permanentUpgrades || { survivor: 0, marksman: 0, athlete: 0, scavenger: 0 };
      const bankedCoins = this.game.settings.bankedCoins || 0;

      const permDefs = [
        {
          key: 'survivor', name: 'SURVIVOR FORTITUDE', icon: '❤️', desc: '+5 Maximum Health permanently applied at the start of every mission',
          costs: ECONOMY_CONFIG.costs.permanent.survivor,
          getStat: (rank) => `+${rank * 5} Max HP`
        },
        {
          key: 'marksman', name: 'MARKSMAN EXPERTISE', icon: '🎯', desc: '+2% Critical hit chance permanently added across all weapons',
          costs: ECONOMY_CONFIG.costs.permanent.marksman,
          getStat: (rank) => `+${rank * 2}% Crit Chance`
        },
        {
          key: 'athlete', name: 'ATHLETE ENDURANCE', icon: '⚡', desc: '+5% Sprint stamina capacity and recovery rate permanently unlocked',
          costs: ECONOMY_CONFIG.costs.permanent.athlete,
          getStat: (rank) => `+${rank * 5}% Stamina`
        },
        {
          key: 'scavenger', name: 'SCAVENGER MASTERY', icon: '💰', desc: '+5% Bonus gold bounties awarded from all infected and mission objectives',
          costs: ECONOMY_CONFIG.costs.permanent.scavenger,
          getStat: (rank) => `+${rank * 5}% Coin Bounty`
        }
      ];

      permDefs.forEach(pDef => {
        const curRank = perm[pDef.key] || 0;
        const isMax = curRank >= 5;
        const cost = isMax ? 0 : pDef.costs[curRank];
        const canAfford = !isMax && (bankedCoins >= cost);

        const card = document.createElement('div');
        card.className = 'armory-card';

        let pipsHtml = '';
        for (let i = 1; i <= 5; i++) {
          const cls = i <= curRank ? (isMax ? 'pip filled maxed' : 'pip filled') : 'pip';
          pipsHtml += `<div class="${cls}"></div>`;
        }

        const curStatText = curRank === 0 ? 'Base' : pDef.getStat(curRank);
        const nextStatText = isMax ? 'MAX RANK' : pDef.getStat(curRank + 1);

        card.innerHTML = `
          <div class="ac-header">
            <div class="ac-icon">${pDef.icon}</div>
            <div class="ac-info">
              <h4 class="ac-title">${pDef.name}</h4>
              <p class="ac-desc">${pDef.desc}</p>
              <div class="ac-pips-row">
                <span class="ac-pips-label">RANK ${curRank}/5</span>
                <div class="ac-pips-track">${pipsHtml}</div>
              </div>
            </div>
          </div>
          <div class="ac-stat-box">
            <span class="stat-curr">${curStatText}</span>
            <span class="stat-arrow">➔</span>
            <span class="stat-next">${nextStatText}</span>
          </div>
          <div class="ac-footer">
            <div class="ac-cost-wrap">
              ${isMax ? '<span style="color:#00d2ff;font-size:12px;">★ MAX RANK</span>' : `<span>🏦</span> <span>${cost.toLocaleString()}</span>`}
            </div>
            <button class="ac-buy-btn ${isMax ? 'maxed' : (canAfford ? 'can-buy' : 'no-funds')}">
              ${isMax ? 'MAX RANK' : (canAfford ? 'TRAIN RANK' : `NEED ${cost} 🏦`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('.ac-buy-btn');
        if (canAfford && !isMax) {
          btn.addEventListener('click', () => {
            this.game.settings.bankedCoins -= cost;
            this.game.settings.permanentUpgrades[pDef.key] = (this.game.settings.permanentUpgrades[pDef.key] || 0) + 1;
            SaveManager.save(this.game.settings);

            if (this.game.player) {
              this.game.player.applyPermanentStats();
            }

            this.game.sound.playCoin();
            this.showNotification(`✓ TRAINED ${pDef.name} RANK ${this.game.settings.permanentUpgrades[pDef.key]}`);
            this.render();
            this.game.updateHud();
          });
        }

        container.appendChild(card);
      });
    }

    renderSuppliesTab(container) {
      const p = this.game.player;
      if (!p) {
        container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;">Enter combat to acquire field supplies.</p>';
        return;
      }

      const supplyDefs = [
        {
          key: 'medkit', name: 'TRAUMA MEDKIT', icon: '💉', desc: 'Restores +40% of maximum health immediately. Capped at max HP.',
          cost: ECONOMY_CONFIG.costs.supplies.medkit,
          isUsable: () => p.health < p.maxHealth,
          apply: () => p.addHealth(Math.round(p.maxHealth * 0.40))
        },
        {
          key: 'armor', name: 'BALLISTIC SHIELD REPAIR', icon: '🛡️', desc: 'Restores high-impact Kevlar protective barrier for 25 seconds.',
          cost: ECONOMY_CONFIG.costs.supplies.armor,
          isUsable: () => p.buffs.shield <= 5,
          apply: () => p.applyBuff('shield', 25)
        },
        {
          key: 'ammo', name: 'TACTICAL AMMO PACK', icon: '🎒', desc: 'Refills current weapon magazine and restores reserves across all guns.',
          cost: ECONOMY_CONFIG.costs.supplies.ammo,
          isUsable: () => true,
          apply: () => p.refillAmmo()
        },
        {
          key: 'grenade', name: 'FRAG GRENADE (+1)', icon: '💣', desc: 'Supplies 1 additional fragmentation grenade up to maximum pouch harness.',
          cost: ECONOMY_CONFIG.costs.supplies.grenade,
          isUsable: () => {
            const gw = p.weapons.find(w => w.key === 'grenade') || p.weapons[4];
            const maxG = 4 + ((p.weaponUpgrades?.grenade?.maxCap || 1) - 1);
            return gw && (gw.mag + (gw.reserve === Infinity ? 0 : gw.reserve)) < maxG;
          },
          apply: () => {
            const gw = p.weapons.find(w => w.key === 'grenade') || p.weapons[4];
            if (gw) {
              if (gw.mag === 0) gw.mag = 1;
              else gw.reserve++;
            }
          }
        },
        {
          key: 'fullRestock', name: 'FULL REARM & RESTOCK', icon: '📦', desc: 'Fully restores health, supplies armor barrier, and replenishes all ammo & grenades.',
          cost: ECONOMY_CONFIG.costs.supplies.fullRestock,
          isUsable: () => true,
          apply: () => {
            p.health = p.maxHealth;
            p.applyBuff('shield', 25);
            p.refillAmmo();
            const gw = p.weapons.find(w => w.key === 'grenade') || p.weapons[4];
            const maxG = 4 + ((p.weaponUpgrades?.grenade?.maxCap || 1) - 1);
            if (gw) {
              gw.mag = 1;
              gw.reserve = maxG - 1;
            }
          }
        }
      ];

      supplyDefs.forEach(sDef => {
        const cost = sDef.cost;
        const usable = sDef.isUsable();
        const canAfford = (this.game.stats.coins >= cost) && usable;

        const card = document.createElement('div');
        card.className = 'armory-card';

        card.innerHTML = `
          <div class="ac-header">
            <div class="ac-icon">${sDef.icon}</div>
            <div class="ac-info">
              <h4 class="ac-title">${sDef.name}</h4>
              <p class="ac-desc">${sDef.desc}</p>
            </div>
          </div>
          <div class="ac-footer">
            <div class="ac-cost-wrap">
              <span>🪙</span> <span>${cost.toLocaleString()}</span>
            </div>
            <button class="ac-buy-btn ${!usable ? 'owned' : (canAfford ? 'can-buy' : 'no-funds')}">
              ${!usable ? 'FULL' : (canAfford ? 'PURCHASE' : `NEED ${cost} 🪙`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('.ac-buy-btn');
        if (canAfford && usable) {
          btn.addEventListener('click', () => {
            if (p.spendCoins(cost)) {
              sDef.apply();
              this.game.sound.playPowerup();
              this.showNotification(`✓ PURCHASED ${sDef.name}`);
              this.render();
              this.game.updateHud();
            }
          });
        }

        container.appendChild(card);
      });
    }

    renderBlackMarketTab(container) {
      const p = this.game.player;
      if (!p) {
        container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;">Enter combat to access black market brokers.</p>';
        return;
      }

      this.activeBlackMarket.forEach(deal => {
        const isOwned = p.blackMarketBuffs && p.blackMarketBuffs[deal.key];
        const cost = deal.cost;
        const canAfford = !isOwned && (this.game.stats.coins >= cost);

        const card = document.createElement('div');
        card.className = 'armory-card';

        card.innerHTML = `
          <div class="ac-header">
            <div class="ac-icon">${deal.icon}</div>
            <div class="ac-info">
              <h4 class="ac-title">${deal.name}</h4>
              <p class="ac-desc">${deal.desc}</p>
            </div>
          </div>
          <div class="ac-footer">
            <div class="ac-cost-wrap">
              ${isOwned ? '<span style="color:#10b981;font-size:12px;">✓ RUN ACTIVE</span>' : `<span>🪙</span> <span>${cost.toLocaleString()}</span>`}
            </div>
            <button class="ac-buy-btn ${isOwned ? 'owned' : (canAfford ? 'can-buy' : 'no-funds')}">
              ${isOwned ? 'ACTIVE' : (canAfford ? 'ACQUIRE DEAL' : `NEED ${cost} 🪙`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('.ac-buy-btn');
        if (canAfford && !isOwned) {
          btn.addEventListener('click', () => {
            if (p.spendCoins(cost)) {
              p.blackMarketBuffs[deal.key] = true;
              this.game.sound.playPowerup();
              this.showNotification(`✓ CONTRACT SECURED: ${deal.name}`);
              this.render();
              this.game.updateHud();
            }
          });
        }

        container.appendChild(card);
      });
    }

    renderEquipmentTab(container) {
      const p = this.game.player;
      if (!p) {
        container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;">Enter combat to acquire tactical equipment.</p>';
        return;
      }

      const eqDefs = [
        {
          key: 'flashlight', name: 'HIGH-BEAM FLASHLIGHT', icon: '🔦',
          desc: 'High-lumen tactical emitter. Expands illumination cone width by +40% in darkness.',
          cost: ECONOMY_CONFIG.costs.equipment.flashlight,
          effect: '+40% Night Vision Cone'
        },
        {
          key: 'kevlarWeave', name: 'KEVLAR REINFORCEMENT', icon: '🛡️',
          desc: 'Ultra-dense composite weave. Grants an additional +15% damage mitigation on top of armor.',
          cost: ECONOMY_CONFIG.costs.equipment.kevlarWeave,
          effect: '+15% Damage Reduction'
        },
        {
          key: 'coinMagnet', name: 'MAGNETIC RETRIEVER', icon: '🧲',
          desc: 'Electromagnetic transponder. Doubles collection magnet radius for coins and supply drops.',
          cost: ECONOMY_CONFIG.costs.equipment.coinMagnet,
          effect: '+100% Pickup Magnet Range'
        },
        {
          key: 'quickHolster', name: 'TACTICAL QUICK-HOLSTER', icon: '⚡',
          desc: 'Ergonomic combat draw rig. Weapon swapping is instant and sprint stamina regenerates +25% faster.',
          cost: ECONOMY_CONFIG.costs.equipment.quickHolster,
          effect: '+25% Stamina Regen & Fast Draw'
        },
        {
          key: 'ammoRig', name: 'EXTENDED COMBAT RIG', icon: '🎒',
          desc: 'High-capacity tactical chest rig. Increases reserve ammo capacity across all firearms by +50%.',
          cost: ECONOMY_CONFIG.costs.equipment.ammoRig,
          effect: '+50% Reserve Ammo Capacity'
        }
      ];

      eqDefs.forEach(eq => {
        const isOwned = !!(p.equipment && p.equipment[eq.key]);
        const cost = eq.cost;
        const canAfford = !isOwned && (this.game.stats.coins >= cost);

        const card = document.createElement('div');
        card.className = 'armory-card';
        card.innerHTML = `
          <div class="ac-header">
            <div class="ac-icon">${eq.icon}</div>
            <div class="ac-info">
              <h4 class="ac-title">${eq.name}</h4>
              <p class="ac-desc">${eq.desc}</p>
            </div>
          </div>
          <div class="ac-stat-box">
            <span class="stat-curr" style="color:#00d2ff;">${eq.effect}</span>
            <span class="stat-next" style="color:#10b981;">${isOwned ? 'ACTIVE' : 'READY'}</span>
          </div>
          <div class="ac-footer">
            <div class="ac-cost-wrap">
              ${isOwned ? '<span style="color:#10b981;font-size:12px;">✓ EQUIPPED</span>' : `<span>🪙</span> <span>${cost.toLocaleString()}</span>`}
            </div>
            <button class="ac-buy-btn ${isOwned ? 'owned' : (canAfford ? 'can-buy' : 'no-funds')}">
              ${isOwned ? 'ACTIVE' : (canAfford ? 'EQUIP GEAR' : `NEED ${cost} 🪙`)}
            </button>
          </div>
        `;

        const btn = card.querySelector('.ac-buy-btn');
        if (canAfford && !isOwned) {
          btn.addEventListener('click', () => {
            if (p.spendCoins(cost)) {
              p.equipment[eq.key] = true;
              if (this.game.settings) {
                this.game.settings.equipment = this.game.settings.equipment || {};
                this.game.settings.equipment[eq.key] = true;
                SaveManager.save(this.game.settings);
              }
              this.game.sound.playPowerup();
              this.showNotification(`✓ EQUIPPED ${eq.name}`);
              this.render();
              this.game.updateHud();
            }
          });
        }

        container.appendChild(card);
      });
    }
  }

  /* ==========================================================================
     10. PLAYER CLASS
     ========================================================================== */

  class Player {
    constructor(x, y, game) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.radius = 18;
      this.angle = 0;
      this.vx = 0;
      this.vy = 0;

      // Field Armory Weapon Upgrades (Levels 1 to 5)
      this.weaponUpgrades = {
        pistol: { damage: 1, fireRate: 1, magSize: 1, reloadSpeed: 1, critChance: 1 },
        shotgun: { damage: 1, pellets: 1, magSize: 1, reloadSpeed: 1, spread: 1 },
        smg: { damage: 1, fireRate: 1, magSize: 1, reloadSpeed: 1, accuracy: 1 },
        sniper: { damage: 1, critDmg: 1, reloadSpeed: 1, magSize: 1, piercing: 1 },
        grenade: { damage: 1, radius: 1, maxCap: 1, fuse: 1 }
      };

      // Field Armory Player Upgrades (Levels 1 to 5)
      this.playerUpgrades = {
        maxHp: 1,
        maxArmor: 1,
        moveSpeed: 1,
        stamina: 1,
        reloadSpeed: 1,
        critChance: 1,
        xpGain: 1,
        coinGain: 1
      };

      // Run Black Market Contracts
      this.blackMarketBuffs = {
        damageSurge: false,
        quickHands: false,
        vampiricShots: false,
        bountyHunter: false,
        explosiveRounds: false
      };

      // Tactical Equipment
      this.equipment = {
        flashlight: false,
        kevlarWeave: false,
        coinMagnet: false,
        quickHolster: false,
        ammoRig: false,
        ...(game.settings.equipment || {})
      };

      // Vitality & Movement Stats
      this.maxHealth = 100;
      this.health = 100;
      this.baseSpeed = 3.9;
      this.sprintSpeed = 6.2;
      this.stamina = 100;
      this.maxStamina = 100;
      this.isSprinting = false;

      // Roguelite Leveling & XP
      this.level = 1;
      this.xp = 0;
      this.xpNeeded = 100;

      // Roguelite Wave Upgrades State
      this.upgrades = {
        damage: 1,
        fireRate: 1,
        moveSpeed: 1,
        maxHealth: 1,
        reloadSpeed: 1,
        magSize: 1,
        critChance: 1,
        critDmg: 1,
        lifesteal: 1,
        armor: 1,
        sprintStamina: 1,
        bounty: 1
      };

      // Apply initial permanent upgrades from save
      this.applyPermanentStats();

      // Weapons Inventory
      this.weapons = [
        { key: 'pistol', unlocked: true, mag: 12, reserve: Infinity, nextFireTime: 0, heat: 0, overheated: false },
        { key: 'shotgun', unlocked: true, mag: 6, reserve: 48, nextFireTime: 0, heat: 0, overheated: false },
        { key: 'smg', unlocked: true, mag: 35, reserve: 210, nextFireTime: 0, heat: 0, overheated: false },
        { key: 'sniper', unlocked: true, mag: 5, reserve: 25, nextFireTime: 0, heat: 0, overheated: false },
        { key: 'grenade', unlocked: true, mag: 1, reserve: 6, nextFireTime: 0, heat: 0, overheated: false }
      ];
      this.currentWeaponIndex = 0;

      // Reloading & Weapon Recoil
      this.isReloading = false;
      this.reloadTimer = 0;
      this.reloadDuration = 1.0;
      this.recoil = 0;

      // Active Temporary Buffs
      this.buffs = {
        shield: 0,
        rapid_fire: 0,
        damage_boost: 0,
        speed_boost: 0
      };

      this.invulnerableTimer = 0;
      this.muzzleFlash = 0;
      this.dead = false;
    }

    applyPermanentStats() {
      const perm = this.game.settings.permanentUpgrades || { survivor: 0, marksman: 0, athlete: 0, scavenger: 0 };
      const baseHp = [100, 115, 130, 150, 175][(this.playerUpgrades?.maxHp || 1) - 1];
      const bonusHp = (perm.survivor || 0) * 5 + (this.upgrades.maxHealth - 1) * 35;
      this.maxHealth = baseHp + bonusHp;
      this.health = Math.min(this.maxHealth, this.health || this.maxHealth);

      const baseStam = [100, 115, 130, 145, 160][(this.playerUpgrades?.stamina || 1) - 1];
      const permAth = (perm.athlete || 0) * 0.05;
      this.maxStamina = Math.round(baseStam * (1 + permAth)) + (this.upgrades.sprintStamina - 1) * 35;
      this.stamina = Math.min(this.maxStamina, this.stamina || this.maxStamina);
    }

    getCurrentWeaponConfig() {
      const wEntry = this.weapons[this.currentWeaponIndex];
      const base = WEAPON_TYPES[wEntry.key];
      const wUp = this.weaponUpgrades[wEntry.key] || {};
      const perm = this.game.settings.permanentUpgrades || {};

      let dmgMultiplier = (1 + (this.upgrades.damage - 1) * 0.25) * (this.buffs.damage_boost > 0 ? 2.0 : 1.0);
      if (this.blackMarketBuffs && this.blackMarketBuffs.damageSurge) dmgMultiplier *= 1.20;

      const fireRateMultiplier = (1 / (1 + (this.upgrades.fireRate - 1) * 0.20)) * (this.buffs.rapid_fire > 0 ? 0.55 : 1.0);

      const pReloadBonus = [0, 0.08, 0.16, 0.25, 0.35][(this.playerUpgrades?.reloadSpeed || 1) - 1];
      let reloadSpeedMultiplier = 1 / (1 + (this.upgrades.reloadSpeed - 1) * 0.25 + pReloadBonus);
      if (this.blackMarketBuffs && this.blackMarketBuffs.quickHands) reloadSpeedMultiplier *= 0.75;

      const magSizeMultiplier = 1 + (this.upgrades.magSize - 1) * 0.30;

      let finalDamage = base.damage;
      let finalFireRate = base.fireRate;
      let finalMagSize = base.magSize;
      let finalReloadTime = base.reloadTime;
      let finalCritChance = 0.05 + (this.upgrades.critChance - 1) * 0.07;
      let finalCritMult = (base.critMult || 2.0) + (this.upgrades.critDmg - 1) * 0.45;
      let finalSpread = base.spread;
      let finalPellets = base.pellets || 1;
      let finalPiercing = base.piercing || 1;
      let finalBlastRadius = base.blastRadius || 160;
      let finalFuseTime = base.fuseTime || 1.15;

      const pCritBonus = [0, 0.03, 0.06, 0.10, 0.15][(this.playerUpgrades?.critChance || 1) - 1] + (perm.marksman || 0) * 0.02;
      finalCritChance += pCritBonus;

      if (wEntry.key === 'pistol') {
        finalDamage += ((wUp.damage || 1) - 1) * 6;
        finalFireRate = Math.max(0.12, base.fireRate - ((wUp.fireRate || 1) - 1) * 0.02);
        finalMagSize += ((wUp.magSize || 1) - 1) * 3;
        finalReloadTime = Math.max(0.5, base.reloadTime - ((wUp.reloadSpeed || 1) - 1) * 0.1);
        finalCritChance += ((wUp.critChance || 1) - 1) * 0.05;
      } else if (wEntry.key === 'shotgun') {
        finalDamage += ((wUp.damage || 1) - 1) * 3;
        finalPellets += ((wUp.pellets || 1) - 1) * 1;
        finalMagSize += ((wUp.magSize || 1) - 1) * 1;
        finalReloadTime = Math.max(0.9, base.reloadTime - ((wUp.reloadSpeed || 1) - 1) * 0.17);
        finalSpread = Math.max(0.11, base.spread - ((wUp.spread || 1) - 1) * 0.02);
      } else if (wEntry.key === 'smg') {
        finalDamage += ((wUp.damage || 1) - 1) * 3;
        finalFireRate = Math.max(0.05, base.fireRate - ((wUp.fireRate || 1) - 1) * 0.007);
        finalMagSize += ((wUp.magSize || 1) - 1) * 6;
        finalReloadTime = Math.max(0.7, base.reloadTime - ((wUp.reloadSpeed || 1) - 1) * 0.12);
        finalSpread = Math.max(0.04, base.spread - ((wUp.accuracy || 1) - 1) * 0.009);
      } else if (wEntry.key === 'sniper') {
        finalDamage += ((wUp.damage || 1) - 1) * 45;
        finalCritMult += ((wUp.critDmg || 1) - 1) * 0.5;
        finalReloadTime = Math.max(1.1, base.reloadTime - ((wUp.reloadSpeed || 1) - 1) * 0.22);
        finalMagSize += ((wUp.magSize || 1) - 1) * 1;
        finalPiercing += ((wUp.piercing || 1) - 1) * 1;
      } else if (wEntry.key === 'grenade') {
        finalDamage += ((wUp.damage || 1) - 1) * 60;
        finalBlastRadius += ((wUp.radius || 1) - 1) * 20;
        finalFuseTime = Math.max(0.65, base.fuseTime - ((wUp.fuse || 1) - 1) * 0.12);
      }

      return {
        ...base,
        damage: Math.round(finalDamage * dmgMultiplier),
        fireRate: Math.max(0.035, finalFireRate * fireRateMultiplier),
        reloadTime: Math.max(0.35, finalReloadTime * reloadSpeedMultiplier),
        magSize: Math.round(finalMagSize * magSizeMultiplier),
        critChance: Math.min(0.85, finalCritChance),
        critMult: finalCritMult,
        spread: finalSpread,
        pellets: finalPellets,
        piercing: finalPiercing,
        blastRadius: finalBlastRadius,
        fuseTime: finalFuseTime
      };
    }

    switchWeapon(index) {
      if (index < 0 || index >= this.weapons.length) return;
      if (this.currentWeaponIndex === index) return;
      this.currentWeaponIndex = index;
      this.isReloading = false;
      this.reloadTimer = 0;
      const rInd = document.getElementById('reloadIndicator');
      if (rInd) rInd.classList.add('hidden');
      this.game.sound.playButtonClick();
      this.game.updateHud();
    }

    reload() {
      const cur = this.weapons[this.currentWeaponIndex];
      const cfg = this.getCurrentWeaponConfig();

      if (cur.mag >= cfg.magSize || cur.reserve <= 0 || this.isReloading) return;
      this.isReloading = true;
      this.reloadTimer = 0;
      this.reloadDuration = cfg.reloadTime;
      this.game.sound.playReload();
    }

    shoot(targetX, targetY) {
      if (this.isReloading) return;
      const cur = this.weapons[this.currentWeaponIndex];
      const cfg = this.getCurrentWeaponConfig();
      const now = performance.now() / 1000;

      // Check SMG Overheat lock
      if (cur.overheated) {
        this.game.sound.playEmpty();
        return;
      }

      if (now < cur.nextFireTime) return;

      if (cur.mag <= 0) {
        this.game.sound.playEmpty();
        this.reload();
        return;
      }

      // Decrement ammo
      cur.mag--;
      cur.nextFireTime = now + cfg.fireRate;
      this.recoil = cur.key === 'sniper' ? 12 : (cur.key === 'shotgun' ? 10 : 5);
      this.muzzleFlash = 0.08;

      // Handle SMG Heating
      if (cfg.hasHeat) {
        cur.heat = Math.min(100, cur.heat + 2.8);
        if (cur.heat >= 100) {
          cur.overheated = true;
          this.game.sound.playOverheat();
          this.game.damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'OVERHEATED!', '#ef4444', true));
        }
      }

      // Sound & Screen Shake
      this.game.sound.playShoot(cur.key);
      const shakeAmt = cur.key === 'sniper' ? 7 : (cur.key === 'shotgun' ? 8 : (cur.key === 'grenade' ? 12 : 2.5));
      this.game.triggerScreenShake(shakeAmt);

      const barrelX = this.x + Math.cos(this.angle) * 26;
      const barrelY = this.y + Math.sin(this.angle) * 26;
      const fireAngle = (targetX !== undefined && targetY !== undefined)
        ? Math.atan2(targetY - barrelY, targetX - barrelX)
        : this.angle;

      if (cur.key === 'grenade') {
        this.game.grenades.push(new GrenadeProjectile(barrelX, barrelY, targetX, targetY, cfg));
      } else {
        for (let i = 0; i < cfg.pellets; i++) {
          const isCrit = Math.random() < cfg.critChance;
          const isHeadshot = Math.random() < 0.12;
          this.game.bullets.push(new Bullet(barrelX, barrelY, fireAngle, cfg, isCrit, isHeadshot));
        }

        // Eject brass casing
        const caseAngle = this.angle + Math.PI / 2 + (Math.random() * 0.4 - 0.2);
        this.game.particles.push(new Particle(
          this.x, this.y,
          Math.cos(caseAngle) * 2.5,
          Math.sin(caseAngle) * 2.5,
          '#ffd700', 1.8, 0.5, 'rect'
        ));
      }

      this.game.stats.shotsFired++;
      this.game.updateHud();

      if (cur.mag === 0 && cur.reserve > 0) {
        this.reload();
      }
    }

    takeDamage(amount) {
      if (this.dead || this.invulnerableTimer > 0) return;

      // Shield buff absorption
      if (this.buffs.shield > 0) {
        this.game.damageNumbers.push(new DamageNumber(this.x, this.y - 20, 'SHIELD ABSORB', '#00d2ff'));
        this.game.sound.playPowerup();
        return;
      }

      // Armor damage reduction (Armory Player upgrade + roguelite perk + equipment kevlar)
      const pArmor = [0, 0.07, 0.13, 0.19, 0.25][(this.playerUpgrades?.maxArmor || 1) - 1];
      const rogueArmor = (this.upgrades.armor - 1) * 0.15;
      const eqArmor = this.equipment?.kevlarWeave ? 0.15 : 0;
      const totalArmor = Math.min(0.85, pArmor + rogueArmor + eqArmor);
      const netDmg = Math.max(1, Math.round(amount * (1 - totalArmor)));

      this.health -= netDmg;
      this.invulnerableTimer = 0.35;
      this.game.sound.playPlayerHurt();
      this.game.triggerScreenShake(8);
      this.game.showDamageFlash();

      if (this.health <= 0) {
        this.health = 0;
        this.dead = true;
        this.game.onPlayerDeath();
      }
      this.game.updateHud();
    }

    addHealth(amount) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      this.game.damageNumbers.push(new DamageNumber(this.x, this.y - 20, `+${amount} HP`, '#00e676'));
      this.game.updateHud();
    }

    addCoins(amount) {
      if (!amount || amount <= 0 || isNaN(amount)) return;
      const perm = this.game.settings.permanentUpgrades || {};
      const pCoinBonus = [0, 0.08, 0.15, 0.22, 0.30][(this.playerUpgrades?.coinGain || 1) - 1];
      const permBonus = (perm.scavenger || 0) * 0.05;
      const rogueBonus = (this.upgrades.bounty - 1) * 0.35;
      const bmBonus = this.blackMarketBuffs?.bountyHunter ? 0.25 : 0;
      const mult = 1 + pCoinBonus + permBonus + rogueBonus + bmBonus;

      const earned = Math.max(1, Math.round(amount * mult));
      this.game.stats.coins = Math.max(0, (this.game.stats.coins || 0) + earned);
      this.game.stats.totalCoinsEarned = (this.game.stats.totalCoinsEarned || 0) + earned;

      this.game.showCoinDelta(earned, true);
      this.game.updateHud();
    }

    spendCoins(amount) {
      amount = Math.max(0, Number(amount) || 0);
      if (amount <= 0) return false;
      if ((this.game.stats.coins || 0) < amount) return false;

      this.game.stats.coins -= amount;
      this.game.stats.totalCoinsSpent = (this.game.stats.totalCoinsSpent || 0) + amount;

      this.game.showCoinDelta(amount, false);
      this.game.updateHud();
      return true;
    }

    addXp(amount) {
      const pXpBonus = [0, 0.08, 0.15, 0.22, 0.30][(this.playerUpgrades?.xpGain || 1) - 1];
      const mult = 1 + (this.upgrades.bounty - 1) * 0.35 + pXpBonus;
      const earned = Math.max(1, Math.round(amount * mult));
      this.xp += earned;

      if (this.xp >= this.xpNeeded) {
        this.xp -= this.xpNeeded;
        this.level++;
        this.xpNeeded = Math.round(100 * Math.pow(1.35, this.level - 1));
        this.game.sound.playLevelUp();

        // Show level up notification via queue
        this.game.notifQueue.enqueue('levelUp', 'LEVEL UP!', `LEVEL ${this.level}`, 2000);

        // Present 3-choice upgrade modal
        this.game.upgradeManager.presentChoices(`⭐ LEVEL UP: LEVEL ${this.level}!`, 'Select a permanent tactical advantage');
      }

      this.game.updateHud();
    }

    refillAmmo() {
      const reserveMult = (this.equipment && this.equipment.ammoRig) ? 1.5 : 1.0;
      this.weapons.forEach(w => {
        const base = WEAPON_TYPES[w.key];
        w.mag = base.magSize;
        w.reserve = base.reserve === Infinity ? Infinity : Math.round(base.reserve * reserveMult);
      });
      this.game.sound.playPowerup();
      this.game.updateHud();
    }

    applyBuff(type, duration = 10) {
      this.buffs[type] = duration;
      this.game.sound.playPowerup();
      this.game.updateBuffsHud();
    }

    update(dt, input) {
      if (this.dead) return;

      // Update Buffs
      for (const key in this.buffs) {
        if (this.buffs[key] > 0) {
          this.buffs[key] -= dt;
          if (this.buffs[key] <= 0) {
            this.buffs[key] = 0;
            this.game.updateBuffsHud();
          }
        }
      }

      if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
      if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

      // SMG Heat cooling when not shooting
      this.weapons.forEach(w => {
        if (WEAPON_TYPES[w.key].hasHeat) {
          if (!input.isShooting || this.currentWeaponIndex !== 2) {
            w.heat = Math.max(0, w.heat - 35 * dt);
          }
          if (w.overheated && w.heat <= 20) {
            w.overheated = false;
          }
        }
      });

      // Reloading Logic
      if (this.isReloading) {
        this.reloadTimer += dt;
        const progress = Math.min(1, this.reloadTimer / this.reloadDuration);
        const reloadBar = document.getElementById('reloadProgress');
        const reloadIndicator = document.getElementById('reloadIndicator');
        if (reloadBar && reloadIndicator) {
          reloadIndicator.classList.remove('hidden');
          reloadBar.style.width = `${progress * 100}%`;
        }

        if (this.reloadTimer >= this.reloadDuration) {
          this.isReloading = false;
          const cur = this.weapons[this.currentWeaponIndex];
          const cfg = this.getCurrentWeaponConfig();
          const needed = cfg.magSize - cur.mag;
          const toAdd = Math.min(needed, cur.reserve);
          cur.mag += toAdd;
          if (cur.reserve !== Infinity) {
            cur.reserve -= toAdd;
          }
          if (reloadIndicator) reloadIndicator.classList.add('hidden');
          this.game.updateHud();
        }
      }

      // ==========================================
      // RESPONSIVE DIRECT MOVEMENT (Zero Slipping)
      // ==========================================
      let mx = input.moveX;
      let my = input.moveY;

      // Immediately stop character when input is released
      if (mx === 0 && my === 0) {
        this.vx = 0;
        this.vy = 0;
      } else {
        // Normalize 8-way diagonal vector
        const len = Math.hypot(mx, my);
        if (len > 0) {
          mx /= len;
          my /= len;
        }

        // Sprint and Stamina
        const wantsSprint = input.isSprinting;
        const baseStam = [100, 115, 130, 145, 160][(this.playerUpgrades?.stamina || 1) - 1];
        const permAth = (this.game.settings.permanentUpgrades?.athlete || 0) * 0.05;
        this.maxStamina = Math.round(baseStam * (1 + permAth)) + (this.upgrades.sprintStamina - 1) * 35;

        if (wantsSprint && this.stamina > 3) {
          this.isSprinting = true;
          this.stamina = Math.max(0, this.stamina - 32 * dt);
        } else {
          this.isSprinting = false;
          const stamRechargeMult = (this.equipment && this.equipment.quickHolster) ? 1.25 : 1.0;
          this.stamina = Math.min(this.maxStamina, this.stamina + 24 * stamRechargeMult * dt);
        }

        // Speed calculation with Armory moveSpeed upgrade
        const pSpeed = [3.9, 4.15, 4.35, 4.55, 4.8][(this.playerUpgrades?.moveSpeed || 1) - 1];
        this.baseSpeed = pSpeed;
        this.sprintSpeed = pSpeed * 1.58;
        const speedMult = (1 + (this.upgrades.moveSpeed - 1) * 0.12) * (this.buffs.speed_boost > 0 ? 1.35 : 1.0);
        const currentSpeed = (this.isSprinting ? this.sprintSpeed : this.baseSpeed) * speedMult;

        this.vx = mx * currentSpeed;
        this.vy = my * currentSpeed;
      }

      // ==========================================
      // SMOOTH CIRCLE-TO-AABB OBSTACLE SLIDING
      // ==========================================
      const stepX = this.vx * dt * 60;
      const stepY = this.vy * dt * 60;

      // Step X and resolve
      if (stepX !== 0 && !isNaN(stepX)) {
        this.x += stepX;
        for (let i = 0; i < this.game.obstacles.length; i++) {
          const ob = this.game.obstacles[i];
          if (ob.dead) continue;
          if (this.x + this.radius <= ob.x || this.x - this.radius >= ob.x + ob.w ||
              this.y + this.radius <= ob.y || this.y - this.radius >= ob.y + ob.h) {
            continue;
          }
          const closestX = Math.max(ob.x, Math.min(this.x, ob.x + ob.w));
          const closestY = Math.max(ob.y, Math.min(this.y, ob.y + ob.h));
          const distX = this.x - closestX;
          const distY = this.y - closestY;
          if (distX * distX + distY * distY < this.radius * this.radius) {
            if (stepX > 0 && distX < 0) {
              this.x = ob.x - this.radius;
              this.vx = 0;
            } else if (stepX < 0 && distX > 0) {
              this.x = ob.x + ob.w + this.radius;
              this.vx = 0;
            }
          }
        }
      }

      // Step Y and resolve
      if (stepY !== 0 && !isNaN(stepY)) {
        this.y += stepY;
        for (let i = 0; i < this.game.obstacles.length; i++) {
          const ob = this.game.obstacles[i];
          if (ob.dead) continue;
          if (this.x + this.radius <= ob.x || this.x - this.radius >= ob.x + ob.w ||
              this.y + this.radius <= ob.y || this.y - this.radius >= ob.y + ob.h) {
            continue;
          }
          const closestX = Math.max(ob.x, Math.min(this.x, ob.x + ob.w));
          const closestY = Math.max(ob.y, Math.min(this.y, ob.y + ob.h));
          const distX = this.x - closestX;
          const distY = this.y - closestY;
          if (distX * distX + distY * distY < this.radius * this.radius) {
            if (stepY > 0 && distY < 0) {
              this.y = ob.y - this.radius;
              this.vy = 0;
            } else if (stepY < 0 && distY > 0) {
              this.y = ob.y + ob.h + this.radius;
              this.vy = 0;
            }
          }
        }
      }

      // Map bounds clamping (strict containment)
      this.x = Math.max(this.radius + 42, Math.min(MAP_WIDTH - this.radius - 42, this.x));
      this.y = Math.max(this.radius + 42, Math.min(MAP_HEIGHT - this.radius - 42, this.y));

      // Aiming Angle
      if (input.aimAngle !== null && input.aimAngle !== undefined) {
        this.angle = input.aimAngle;
      }

      this.recoil *= 0.85;
    }

    draw(ctx) {
      if (this.dead) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Shield Aura
      if (this.buffs.shield > 0) {
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render Asset Sprite if available, or fall back to procedural Canvas drawing
      const playerSprite = (this.game && this.game.assets && this.game.assets.hasImage('player'))
        ? this.game.assets.getImage('player')
        : null;

      if (playerSprite) {
        const pSize = this.radius * 2.4;
        ctx.drawImage(playerSprite, -pSize / 2, -pSize / 2, pSize, pSize);
      } else {
        // Body / Tactical Vest
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Shoulders
        ctx.fillStyle = '#475569';
        ctx.fillRect(-8, -16, 10, 6);
        ctx.fillRect(-8, 10, 10, 6);

        // Weapon sprite & Hands
        const cur = this.weapons[this.currentWeaponIndex];
        ctx.fillStyle = '#334155';
        ctx.fillRect(8 - this.recoil, -4, 18, 8);

        if (cur.key === 'shotgun') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(10 - this.recoil, -3, 14, 6);
        } else if (cur.key === 'sniper') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(6 - this.recoil, -2, 28, 4);
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(12 - this.recoil, -5, 8, 3);
        } else if (cur.key === 'smg') {
          ctx.fillStyle = cur.overheated ? '#ef4444' : '#0284c7';
          ctx.fillRect(12 - this.recoil, -3, 10, 6);
        }

        // Hands
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(10 - this.recoil, -8, 4, 0, Math.PI * 2);
        ctx.arc(14 - this.recoil, 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Muzzle Flash
      if (this.muzzleFlash > 0) {
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(28, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     11. ZOMBIE ENEMIES (Walkers, Runners, Brutes, Spitters, Crawlers, Boss)
     ========================================================================== */

  class Zombie {
    constructor(x, y, type, wave, game) {
      this.x = x;
      this.y = y;
      this.type = type; // 'walker', 'runner', 'brute', 'spitter', 'crawler', 'boss'
      this.game = game;
      this.dead = false;
      this.rewardAwarded = false;

      const waveMult = 1 + (wave - 1) * 0.16;
      const speedMult = Math.min(1.5, 1 + (wave - 1) * 0.035);

      if (type === 'walker') {
        this.maxHp = Math.round(55 * waveMult);
        this.speed = (2.1 + Math.random() * 0.3) * speedMult;
        this.damage = Math.round(12 * waveMult);
        this.radius = 18;
        this.coinReward = ECONOMY_CONFIG.rewards.walker;
        this.xpReward = 18;
        this.color = '#4ade80';
        this.shirtColor = '#1e3a5f';
      } else if (type === 'runner') {
        this.maxHp = Math.round(38 * waveMult);
        this.speed = (4.1 + Math.random() * 0.4) * speedMult;
        this.damage = Math.round(10 * waveMult);
        this.radius = 14;
        this.coinReward = ECONOMY_CONFIG.rewards.runner;
        this.xpReward = 22;
        this.color = '#f87171';
        this.shirtColor = '#7f1d1d';
        this.zigZagTimer = Math.random() * 10;
      } else if (type === 'brute') {
        this.maxHp = Math.round(360 * waveMult);
        this.speed = 1.45 * speedMult;
        this.damage = Math.round(26 * waveMult);
        this.radius = 28;
        this.coinReward = ECONOMY_CONFIG.rewards.brute;
        this.xpReward = 70;
        this.color = '#52796f';
        this.shirtColor = '#2f3e46';
        this.knockbackResistance = 0.82;
      } else if (type === 'spitter') {
        this.maxHp = Math.round(75 * waveMult);
        this.speed = 2.2 * speedMult;
        this.damage = Math.round(16 * waveMult);
        this.radius = 17;
        this.coinReward = ECONOMY_CONFIG.rewards.spitter;
        this.xpReward = 35;
        this.color = '#10b981';
        this.shirtColor = '#064e3b';
        this.spitCooldown = 2.8;
      } else if (type === 'crawler') {
        this.maxHp = Math.round(42 * waveMult);
        this.speed = 3.6 * speedMult;
        this.damage = Math.round(14 * waveMult);
        this.radius = 12;
        this.coinReward = ECONOMY_CONFIG.rewards.crawler;
        this.xpReward = 24;
        this.color = '#fb923c';
        this.shirtColor = '#7c2d12';
        this.burstTimer = Math.random() * 3;
        this.isBursting = false;
      } else if (type === 'hunter') {
        this.maxHp = Math.round(95 * waveMult);
        this.speed = (3.5 + Math.random() * 0.4) * speedMult;
        this.damage = Math.round(18 * waveMult);
        this.radius = 16;
        this.coinReward = ECONOMY_CONFIG.rewards.hunter;
        this.xpReward = 38;
        this.color = '#c084fc';
        this.shirtColor = '#581c87';
        this.lungeTimer = Math.random() * 3 + 2;
        this.isLunging = false;
      } else if (type === 'boss') {
        this.isBoss = true;
        this.bossTier = Math.floor(wave / 5);
        this.maxHp = Math.round((1900 + this.bossTier * 1100) * waveMult);
        this.speed = 1.9 * speedMult;
        this.damage = Math.round(36 * waveMult);
        this.radius = 44;
        this.coinReward = ECONOMY_CONFIG.rewards.boss;
        this.xpReward = 450;
        this.color = '#dc2626';
        this.shirtColor = '#450a0a';
        this.knockbackResistance = 0.95;

        // Multi-phase Boss abilities
        this.stompCooldown = 5.5;
        this.chargeCooldown = 8.5;
        this.chargeTimer = 0;
        this.isCharging = false;
        this.summonCooldown = 13.0;
        this.phase = 1; // 1: Standard + Minions, 2: Charge + Stomp, 3: Enraged frenzy
      }

      this.hp = this.maxHp;
      this.angle = 0;
      this.vx = 0;
      this.vy = 0;
      this.attackCooldown = 0;
      this.hitFlash = 0;
      this.stuckTimer = 0;
      this.escapeTimer = 0;
      this.escapeAngle = 0;
    }

    takeDamage(amount, knockbackAngle, knockbackDist, game, isCrit = false, isHeadshot = false) {
      if (this.dead) return;
      this.hp -= amount;
      this.hitFlash = 0.1;

      // Knockback with boundary and obstacle safety
      const res = this.knockbackResistance || 0;
      const effectiveKb = knockbackDist * (1 - res);
      if (effectiveKb > 0) {
        this.x += Math.cos(knockbackAngle) * effectiveKb;
        this.y += Math.sin(knockbackAngle) * effectiveKb;

        // Keep inside playable map bounds
        this.x = Math.max(this.radius + 42, Math.min(MAP_WIDTH - this.radius - 42, this.x));
        this.y = Math.max(this.radius + 42, Math.min(MAP_HEIGHT - this.radius - 42, this.y));

        // Push out of obstacles if knocked into one
        for (let i = 0; i < game.obstacles.length; i++) {
          const ob = game.obstacles[i];
          if (ob.dead) continue;
          if (this.x + this.radius <= ob.x || this.x - this.radius >= ob.x + ob.w ||
              this.y + this.radius <= ob.y || this.y - this.radius >= ob.y + ob.h) {
            continue;
          }
          const closestX = Math.max(ob.x, Math.min(this.x, ob.x + ob.w));
          const closestY = Math.max(ob.y, Math.min(this.y, ob.y + ob.h));
          const distX = this.x - closestX;
          const distY = this.y - closestY;
          if (distX * distX + distY * distY < this.radius * this.radius) {
            const d = Math.hypot(distX, distY);
            if (d > 0.001) {
              const push = this.radius - d;
              this.x += (distX / d) * push;
              this.y += (distY / d) * push;
            } else {
              this.x -= Math.cos(knockbackAngle) * effectiveKb;
              this.y -= Math.sin(knockbackAngle) * effectiveKb;
            }
          }
        }
      }

      game.damageNumbers.push(new DamageNumber(this.x, this.y - 12, isHeadshot ? `${amount} HEADSHOT!` : `${amount}`, isHeadshot ? '#ff0055' : (isCrit ? '#ffb703' : '#ffffff'), isCrit, isHeadshot));
      game.sound.playZombieHit();
      game.sound.playHitTick();

      // Blood splatter
      for (let i = 0; i < 6; i++) {
        const angle = knockbackAngle + (Math.random() * 1.2 - 0.6);
        const spd = Math.random() * 3.5 + 1;
        game.particles.push(new Particle(
          this.x, this.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          this.type === 'spitter' ? '#10b981' : '#b91c1c',
          Math.random() * 3.5 + 1.5,
          0.45
        ));
      }

      if (game.settings.bloodGore && Math.random() < 0.35) {
        game.addBloodDecal(this.x, this.y, Math.random() * 10 + 7);
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        game.triggerHitMarker(isCrit || isHeadshot, true);
        this.onDeath(game, isHeadshot, isCrit);
      } else {
        game.triggerHitMarker(isCrit || isHeadshot, false);
      }
    }

    onDeath(game, isHeadshot = false, isCrit = false) {
      if (this.rewardAwarded) return;
      this.rewardAwarded = true;

      game.sound.playZombieDeath();
      game.stats.kills++;

      // Base Kill Coin Reward from ECONOMY_CONFIG
      const coinsToAward = this.coinReward || (ECONOMY_CONFIG.rewards[this.type] || 10);
      game.player.addCoins(coinsToAward);

      // Headshot / Critical Bonus Coin Reward
      if (isHeadshot) {
        const hsBonus = ECONOMY_CONFIG.rewards.headshotBonus || 10;
        game.player.addCoins(hsBonus);
        game.damageNumbers.push(new DamageNumber(this.x, this.y - 32, `+${hsBonus} 🪙 HEADSHOT`, '#ffca28', true, true));
      }

      game.player.addXp(this.xpReward);

      // Black Market Vampiric Shots contract (+3 HP per kill)
      if (game.player.blackMarketBuffs && game.player.blackMarketBuffs.vampiricShots) {
        game.player.addHealth(3);
      }

      // Lifesteal perk check
      if (game.player.upgrades.lifesteal > 1) {
        const heal = (game.player.upgrades.lifesteal - 1) * 4;
        game.player.addHealth(heal);
      }

      game.registerKillCombo();

      if (game.settings.bloodGore) {
        game.addBloodDecal(this.x, this.y, this.radius * 1.2);
      }

      // Boss Defeat Special Handling
      if (this.isBoss) {
        game.notifQueue.enqueue('bossDefeated', 'BOSS DEFEATED!', `+${ECONOMY_CONFIG.rewards.boss} 🪙 BOUNTY SECURED`, 3000);
        game.sound.playWaveClear();

        // Spawn 6 scattered coin pickups around boss
        const coinVals = [10, 25, 50, 10, 25, 50];
        for (let i = 0; i < (ECONOMY_CONFIG.pickups.bossCoinsCount || 6); i++) {
          const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
          const dist = 35 + Math.random() * 45;
          const cx = this.x + Math.cos(ang) * dist;
          const cy = this.y + Math.sin(ang) * dist;
          game.spawnCoinPickup(cx, cy, coinVals[i % coinVals.length]);
        }
      } else {
        // Normal Zombie occasional Coin Pickup drop
        if (Math.random() < ECONOMY_CONFIG.pickups.dropChance) {
          const vals = ECONOMY_CONFIG.pickups.values || [5, 10, 25, 50];
          const val = vals[Math.floor(Math.random() * vals.length)];
          game.spawnCoinPickup(this.x, this.y, val);
        }
      }

      // Drop Power-up
      const dropChance = this.isBoss ? 1.0 : (this.type === 'brute' ? 0.3 : 0.09);
      if (Math.random() < dropChance) {
        game.spawnPowerUp(this.x, this.y);
      }

      game.updateHud();
    }

    update(dt, player, obstacles, game) {
      if (this.dead) return;

      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.attackCooldown > 0) this.attackCooldown -= dt;

      // Determine target (Player or Objective Survivor NPC)
      let targetX = player.x;
      let targetY = player.y;

      if (game.objectiveManager.active && game.objectiveManager.type === 'rescue' && game.objectiveManager.survivorNpc) {
        const distToNpc = Math.hypot(game.objectiveManager.survivorNpc.x - this.x, game.objectiveManager.survivorNpc.y - this.y);
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (distToNpc < distToPlayer * 0.9) {
          targetX = game.objectiveManager.survivorNpc.x;
          targetY = game.objectiveManager.survivorNpc.y;
        }
      }

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.hypot(dx, dy);

      this.angle = Math.atan2(dy, dx);
      let currentSpeed = this.speed;

      // When reaching player's collision boundary, stop driving directly into player center
      const contactDist = this.radius + player.radius;
      if (dist <= contactDist + 8 && targetX === player.x && targetY === player.y) {
        const tangentSign = ((Math.floor(this.x) + Math.floor(this.y)) % 2 === 0) ? 1 : -1;
        this.angle = Math.atan2(dy, dx) + (tangentSign * 0.75);
        currentSpeed = Math.min(currentSpeed * 0.35, 0.9);
      }

      // Type-specific behaviors
      if (this.type === 'runner') {
        this.zigZagTimer += dt * 5;
        this.angle += Math.sin(this.zigZagTimer) * 0.45;
      } else if (this.type === 'spitter') {
        this.spitCooldown -= dt;
        // Keep 280-360px distance
        if (dist < 260) {
          currentSpeed = -this.speed * 0.8; // back up
        } else if (dist > 380) {
          currentSpeed = this.speed; // move closer
        } else {
          currentSpeed = 0.5; // strafe
        }

        if (this.spitCooldown <= 0 && dist < 500) {
          this.spitCooldown = 3.2;
          game.acidProjectiles.push(new AcidProjectile(this.x, this.y, player.x, player.y));
        }
      } else if (this.type === 'crawler') {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.isBursting = !this.isBursting;
          this.burstTimer = this.isBursting ? 0.9 : 1.8;
        }
        currentSpeed = this.isBursting ? this.speed * 1.55 : this.speed * 0.7;
      } else if (this.type === 'hunter') {
        this.lungeTimer -= dt;
        if (this.lungeTimer <= 0) {
          this.isLunging = !this.isLunging;
          this.lungeTimer = this.isLunging ? 0.75 : 2.5;
        }
        if (this.isLunging) {
          currentSpeed = this.speed * 1.7; // Fast aggressive lunge
        } else {
          this.angle += 0.35; // Flanking angle
          currentSpeed = this.speed * 0.85;
        }
      } else if (this.isBoss) {
        const hpPct = this.hp / this.maxHp;
        this.phase = hpPct > 0.65 ? 1 : (hpPct > 0.3 ? 2 : 3);

        this.stompCooldown -= dt;
        this.chargeCooldown -= dt;
        this.summonCooldown -= dt;

        // Ground Stomp Shockwave
        if (this.stompCooldown <= 0 && dist < 230) {
          this.stompCooldown = this.phase === 3 ? 4.5 : 6.0;
          game.sound.playExplosion();
          game.triggerScreenShake(16);
          for (let a = 0; a < Math.PI * 2; a += 0.25) {
            game.particles.push(new Particle(
              this.x, this.y,
              Math.cos(a) * 6, Math.sin(a) * 6,
              '#ff1744', 6, 0.5
            ));
          }
          if (dist < 190) player.takeDamage(this.damage);
        }

        // Bull Charge Rush
        if (this.chargeCooldown <= 0 && (this.phase >= 2)) {
          this.chargeCooldown = this.phase === 3 ? 7.0 : 9.0;
          this.isCharging = true;
          this.chargeTimer = 1.4;
        }

        if (this.isCharging) {
          this.chargeTimer -= dt;
          currentSpeed = this.speed * 2.8;
          if (this.chargeTimer <= 0) this.isCharging = false;
        }

        // Summon Minions (with safe obstacle spawn check)
        if (this.summonCooldown <= 0) {
          this.summonCooldown = 14.0;
          game.sound.playBossAlert();
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            let sx = this.x + Math.cos(angle) * 70;
            let sy = this.y + Math.sin(angle) * 70;
            if (checkCircleObstacleCollision(sx, sy, 20, obstacles)) {
              sx = this.x;
              sy = this.y;
            }
            const minionType = this.phase === 3 ? 'crawler' : 'runner';
            game.zombies.push(new Zombie(sx, sy, minionType, game.currentWave, game));
          }
        }

        // Phase 3 Enraged Frenzy: acid burst
        if (this.phase === 3 && Math.random() < 0.015) {
          game.acidProjectiles.push(new AcidProjectile(this.x, this.y, player.x, player.y));
        }
      }

      // ==========================================
      // ENEMY OBSTACLE AVOIDANCE & CORNER ESCAPE
      // ==========================================
      const baseAngle = this.angle;
      let moveAngle = baseAngle;

      // Handle corner escape maneuver if active
      if (this.escapeTimer > 0) {
        this.escapeTimer -= dt;
        moveAngle = this.escapeAngle;
      } else {
        // Feeler raycast: probe if path directly ahead is blocked by an obstacle
        const feelerDist = this.radius + Math.max(16, currentSpeed * 9);
        const feelerX = this.x + Math.cos(baseAngle) * feelerDist;
        const feelerY = this.y + Math.sin(baseAngle) * feelerDist;

        if (checkCircleObstacleCollision(feelerX, feelerY, this.radius * 0.75, obstacles)) {
          // Obstacle detected ahead! Test side angles to steer around obstacle toward target
          const testAngles = [0.6, -0.6, 1.15, -1.15, 1.7, -1.7, 2.2, -2.2];
          let bestAngle = null;
          let bestDist = Infinity;

          for (let i = 0; i < testAngles.length; i++) {
            const candAngle = baseAngle + testAngles[i];
            const cx = this.x + Math.cos(candAngle) * feelerDist;
            const cy = this.y + Math.sin(candAngle) * feelerDist;

            if (!checkCircleObstacleCollision(cx, cy, this.radius * 0.7, obstacles)) {
              const candTargetDist = Math.hypot(targetX - cx, targetY - cy);
              if (candTargetDist < bestDist) {
                bestDist = candTargetDist;
                bestAngle = candAngle;
              }
            }
          }

          if (bestAngle !== null) {
            moveAngle = bestAngle;
          }
        }
      }

      this.angle = moveAngle;

      // ==========================================
      // FLOCKING SEPARATION FORCE (Prevent Clumping)
      // ==========================================
      let sepX = 0;
      let sepY = 0;
      let sepCount = 0;
      const zombies = game.zombies;
      const zCount = zombies.length;

      for (let j = 0; j < zCount; j++) {
        const other = zombies[j];
        if (other === this || other.dead) continue;
        const zdx = this.x - other.x;
        const zdy = this.y - other.y;
        const minSep = this.radius + other.radius + 4;
        if (Math.abs(zdx) > minSep || Math.abs(zdy) > minSep) continue;
        const distSq = zdx * zdx + zdy * zdy;
        if (distSq > 0.0001 && distSq < minSep * minSep) {
          const d = Math.sqrt(distSq);
          const push = (minSep - d) / minSep;
          sepX += (zdx / d) * push;
          sepY += (zdy / d) * push;
          sepCount++;
          if (sepCount >= 4) break;
        }
      }

      let vx = Math.cos(moveAngle) * currentSpeed;
      let vy = Math.sin(moveAngle) * currentSpeed;

      if (sepCount > 0) {
        vx += (sepX / sepCount) * currentSpeed * 0.55;
        vy += (sepY / sepCount) * currentSpeed * 0.55;
        const vLen = Math.hypot(vx, vy);
        const maxV = currentSpeed * 1.3;
        if (vLen > maxV) {
          vx = (vx / vLen) * maxV;
          vy = (vy / vLen) * maxV;
        }
      }

      this.vx = vx;
      this.vy = vy;

      // ==========================================
      // RELIABLE AXIS-SEPARATED CIRCLE-TO-AABB SLIDING
      // ==========================================
      const stepX = this.vx * dt * 60;
      const stepY = this.vy * dt * 60;
      const startX = this.x;
      const startY = this.y;
      let hitWallX = false;
      let hitWallY = false;

      // Step X and resolve
      if (stepX !== 0 && !isNaN(stepX)) {
        this.x += stepX;
        for (let i = 0; i < obstacles.length; i++) {
          const ob = obstacles[i];
          if (ob.dead) continue;
          if (this.x + this.radius <= ob.x || this.x - this.radius >= ob.x + ob.w ||
              this.y + this.radius <= ob.y || this.y - this.radius >= ob.y + ob.h) {
            continue;
          }
          const closestX = Math.max(ob.x, Math.min(this.x, ob.x + ob.w));
          const closestY = Math.max(ob.y, Math.min(this.y, ob.y + ob.h));
          const distX = this.x - closestX;
          const distY = this.y - closestY;
          if (distX * distX + distY * distY < this.radius * this.radius) {
            if (stepX > 0 && distX < 0) {
              hitWallX = true;
              this.x = ob.x - this.radius;
              this.vx = 0;
            } else if (stepX < 0 && distX > 0) {
              hitWallX = true;
              this.x = ob.x + ob.w + this.radius;
              this.vx = 0;
            }
          }
        }
      }

      // Step Y and resolve
      if (stepY !== 0 && !isNaN(stepY)) {
        this.y += stepY;
        for (let i = 0; i < obstacles.length; i++) {
          const ob = obstacles[i];
          if (ob.dead) continue;
          if (this.x + this.radius <= ob.x || this.x - this.radius >= ob.x + ob.w ||
              this.y + this.radius <= ob.y || this.y - this.radius >= ob.y + ob.h) {
            continue;
          }
          const closestX = Math.max(ob.x, Math.min(this.x, ob.x + ob.w));
          const closestY = Math.max(ob.y, Math.min(this.y, ob.y + ob.h));
          const distX = this.x - closestX;
          const distY = this.y - closestY;
          if (distX * distX + distY * distY < this.radius * this.radius) {
            if (stepY > 0 && distY < 0) {
              hitWallY = true;
              this.y = ob.y - this.radius;
              this.vy = 0;
            } else if (stepY < 0 && distY > 0) {
              hitWallY = true;
              this.y = ob.y + ob.h + this.radius;
              this.vy = 0;
            }
          }
        }
      }

      // Strict Map Boundary Clamping (Never exit playable arena)
      this.x = Math.max(this.radius + 42, Math.min(MAP_WIDTH - this.radius - 42, this.x));
      this.y = Math.max(this.radius + 42, Math.min(MAP_HEIGHT - this.radius - 42, this.y));

      // Stuck / Corner Trapping Detection & Recovery
      const distMoved = Math.hypot(this.x - startX, this.y - startY);
      const expectedMinDist = Math.max(0.1, Math.abs(currentSpeed) * dt * 20);

      if ((hitWallX || hitWallY) && distMoved < expectedMinDist && Math.abs(currentSpeed) > 0.4) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.35 && this.escapeTimer <= 0) {
          this.escapeTimer = 0.65;
          const turn = Math.random() < 0.5 ? 1 : -1;
          if (hitWallX && !hitWallY) {
            this.escapeAngle = (Math.PI / 2) * turn;
          } else if (!hitWallX && hitWallY) {
            this.escapeAngle = turn > 0 ? 0 : Math.PI;
          } else {
            this.escapeAngle = baseAngle + Math.PI + (Math.random() * 0.8 - 0.4);
          }
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
      }

      // Attack player on contact (tested with safe boundary margin)
      const curDistToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (curDistToPlayer <= this.radius + player.radius + 6 && this.attackCooldown <= 0) {
        player.takeDamage(this.damage);
        this.attackCooldown = 0.8;
      }
    }

    draw(ctx) {
      if (this.dead) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      const imageKey = this.isBoss ? 'zombie-boss' : ('zombie-' + this.type);
      const zombieSprite = (this.game && this.game.assets && this.game.assets.hasImage(imageKey))
        ? this.game.assets.getImage(imageKey)
        : null;

      if (zombieSprite) {
        const zSize = this.radius * 2.4;
        if (this.hitFlash > 0) {
          ctx.globalAlpha = 0.6;
        }
        ctx.drawImage(zombieSprite, -zSize / 2, -zSize / 2, zSize, zSize);
        ctx.globalAlpha = 1.0;
      } else {
        if (this.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = this.color;
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.shirtColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Arms / Claws
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.radius * 0.8, -this.radius * 0.5, 4, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.8, this.radius * 0.5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Spitter toxic glow sacs
        if (this.type === 'spitter') {
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(-4, -6, 5, 0, Math.PI * 2);
          ctx.arc(-4, 6, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Boss extra visual adornments & phase aura
      if (this.isBoss) {
        ctx.strokeStyle = this.phase === 3 ? '#ef4444' : '#ff1744';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // Health bar overhead for Brute & Boss
      if (this.type === 'brute' || this.isBoss) {
        const hpPct = Math.max(0, this.hp / this.maxHp);
        const barW = this.radius * 2;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, 5);
        ctx.fillStyle = this.isBoss ? (this.phase === 3 ? '#dc2626' : '#ff1744') : '#00e676';
        ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * hpPct, 5);
        ctx.restore();
      }
    }
  }

  /* ==========================================================================
     12. WAVE MANAGER & PROGRESSION
     ========================================================================== */

  class WaveManager {
    constructor(game) {
      this.game = game;
      this.wave = 1;
      this.zombiesToSpawn = [];
      this.spawnTimer = 0;
      this.spawnInterval = 1.0;
      this.waveActive = false;
      this.bossActive = false;
      this.waveClearedPending = false;
      this.specialWaveType = null;
    }

    startWave(waveNum) {
      this.wave = waveNum;
      this.waveActive = true;
      this.bossActive = false;
      this.waveClearedPending = false;
      this.zombiesToSpawn = [];

      const isBossWave = waveNum % 5 === 0;

      // Special wave themes
      this.specialWaveType = null;
      if (!isBossWave && waveNum > 1) {
        const roll = Math.random();
        if (roll < 0.2) this.specialWaveType = 'RUNNER SWARM';
        else if (roll < 0.35 && waveNum >= 3) this.specialWaveType = 'BRUTE SIEGE';
        else if (roll < 0.50 && waveNum >= 4) this.specialWaveType = 'TOXIC OUTBREAK';
        else if (roll < 0.65 && waveNum >= 3) this.specialWaveType = 'CRAWLER NEST';
      }

      const badge = document.getElementById('waveTypeBadge');
      const badgeLabel = document.getElementById('waveTypeLabel');
      if (badge && badgeLabel) {
        if (this.specialWaveType) {
          badgeLabel.textContent = this.specialWaveType;
          badge.classList.remove('hidden');
        } else if (isBossWave) {
          badgeLabel.textContent = 'BOSS HORDE';
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      // Boss encounter handling
      if (isBossWave) {
        this.bossActive = true;
        this.zombiesToSpawn.push('boss');
        this.game.sound.playBossAlert();
        this.game.notifQueue.enqueue('bossIncoming', 'BOSS INCOMING', 'THE ABOMINATION AWAKENS', 2200);
      }

      // Wave Enemy Count Formula
      const count = 6 + (waveNum - 1) * 4;

      for (let i = 0; i < count; i++) {
        if (this.specialWaveType === 'RUNNER SWARM') {
          this.zombiesToSpawn.push(Math.random() < 0.8 ? 'runner' : 'walker');
        } else if (this.specialWaveType === 'BRUTE SIEGE') {
          this.zombiesToSpawn.push(Math.random() < 0.5 ? 'brute' : 'walker');
        } else if (this.specialWaveType === 'TOXIC OUTBREAK') {
          this.zombiesToSpawn.push(Math.random() < 0.6 ? 'spitter' : 'runner');
        } else if (this.specialWaveType === 'CRAWLER NEST') {
          this.zombiesToSpawn.push(Math.random() < 0.7 ? 'crawler' : 'runner');
        } else {
          if (waveNum === 1) {
            this.zombiesToSpawn.push('walker');
          } else if (waveNum === 2) {
            this.zombiesToSpawn.push(Math.random() < 0.65 ? 'walker' : 'runner');
          } else if (waveNum === 3) {
            const r = Math.random();
            if (r < 0.5) this.zombiesToSpawn.push('walker');
            else if (r < 0.75) this.zombiesToSpawn.push('runner');
            else if (r < 0.9) this.zombiesToSpawn.push('crawler');
            else this.zombiesToSpawn.push('brute');
          } else {
            const r = Math.random();
            if (r < 0.25) this.zombiesToSpawn.push('walker');
            else if (r < 0.45) this.zombiesToSpawn.push('runner');
            else if (r < 0.60) this.zombiesToSpawn.push('crawler');
            else if (r < 0.75) this.zombiesToSpawn.push('spitter');
            else if (r < 0.88) this.zombiesToSpawn.push('hunter');
            else this.zombiesToSpawn.push('brute');
          }
        }
      }

      this.spawnInterval = Math.max(0.3, 1.1 - waveNum * 0.04);

      // Random Tactical Objective every few waves (e.g., wave 2, 4, 7, 9, not boss waves)
      if (!isBossWave && (waveNum === 2 || waveNum === 4 || waveNum % 3 === 1)) {
        this.game.objectiveManager.startRandomObjective(waveNum);
      }

      this.game.updateHud();
    }

    update(dt) {
      if (!this.waveActive) return;

      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval && this.zombiesToSpawn.length > 0) {
        this.spawnTimer = 0;
        const type = this.zombiesToSpawn.shift();
        this.spawnZombie(type);
        this.game.updateHud();
      }

      if (this.zombiesToSpawn.length === 0 && this.game.zombies.length === 0 && this.waveActive) {
        this.waveActive = false;
        this.onWaveCleared();
      }
    }

    spawnZombie(type) {
      const player = this.game.player;
      let sx = 1400;
      let sy = 650;
      let valid = false;
      const zRadius = (type === 'boss') ? 44 : (type === 'brute' ? 28 : 18);

      for (let attempts = 0; attempts < 60; attempts++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 520 + Math.random() * 380;
        const testX = Math.max(zRadius + 60, Math.min(MAP_WIDTH - zRadius - 60, player.x + Math.cos(angle) * dist));
        const testY = Math.max(zRadius + 60, Math.min(MAP_HEIGHT - zRadius - 60, player.y + Math.sin(angle) * dist));

        if (!checkCircleObstacleCollision(testX, testY, zRadius + 16, this.game.obstacles)) {
          sx = testX;
          sy = testY;
          valid = true;
          break;
        }
      }

      if (!valid) {
        // Guaranteed open fallback along the open east-west avenue (y = 650 or y = 1850)
        const openY = player.y > 1400 ? 1850 : 650;
        let testX = Math.max(120, Math.min(MAP_WIDTH - 120, player.x + (Math.random() > 0.5 ? 500 : -500)));
        while (checkCircleObstacleCollision(testX, openY, zRadius + 10, this.game.obstacles) && testX < MAP_WIDTH - 150) {
          testX += 50;
        }
        sx = testX;
        sy = openY;
      }

      this.game.zombies.push(new Zombie(sx, sy, type, this.wave, this.game));
    }

    onWaveCleared() {
      const reward = ECONOMY_CONFIG.rewards.waveBase + this.wave * ECONOMY_CONFIG.rewards.wavePerWave;
      this.lastWaveClearReward = reward;
      this.game.player.addCoins(reward);
      this.game.sound.playWaveClear();

      // Enqueue wave cleared notification
      this.game.notifQueue.enqueue('waveCleared', 'SECTOR SECURED', `+${reward} BOUNTY REWARDED`, 2200);

      // Show upgrade choices after notification duration
      this.waveClearedPending = true;
      setTimeout(() => {
        this.game.upgradeManager.presentChoices('SECTOR CLEARED: CHOOSE AN UPGRADE', 'Select a tactical advantage');
      }, 2200);
    }
  }

  /* ==========================================================================
     12b. NOTIFICATION QUEUE
     Manages all in-game announcements (kill combos, level up, wave cleared,
     boss incoming). Shows one at a time; max 4 pending. Mobile duration is
     capped to 1600 ms to reduce screen coverage.
     ========================================================================== */

  class NotificationQueue {
    constructor(game) {
      this.game = game;
      this.queue = [];
      this.currentTimer = null;
      this.MAX_QUEUE = 4;

      // All banner element IDs managed by this queue
      this.BANNER_IDS = ['waveClearedBanner', 'comboBanner', 'levelUpBanner', 'bossIncomingBanner'];
    }

    enqueue(type, text, sub, duration) {
      if (this.queue.length >= this.MAX_QUEUE) {
        this.queue.shift(); // drop oldest if queue is full
      }
      this.queue.push({ type, text, sub, duration });
      if (!this.currentTimer) {
        this._showNext();
      }
    }

    _showNext() {
      if (this.queue.length === 0) {
        this.currentTimer = null;
        return;
      }
      const notif = this.queue.shift();
      this._display(notif);
    }

    _display(notif) {
      // Hide all managed banners before showing the new one
      this._hideAll();

      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 ||
        (this.game.displayWidth <= 1024) || (this.game.displayHeight <= 560);
      const dur = isMobile ? Math.min(notif.duration, 1600) : notif.duration;

      if (notif.type === 'combo') {
        const banner = document.getElementById('comboBanner');
        const countText = document.getElementById('comboCount');
        const subText = document.getElementById('comboSubtitle');
        if (banner && countText && subText) {
          countText.textContent = notif.text;
          subText.textContent = notif.sub;
          banner.classList.remove('hidden');
        }
      } else if (notif.type === 'waveCleared') {
        const banner = document.getElementById('waveClearedBanner');
        const titleEl = banner ? banner.querySelector('.wave-clear-title') : null;
        const rewardText = document.getElementById('waveClearReward');
        if (banner && rewardText) {
          if (titleEl) titleEl.textContent = 'SECTOR SECURED';
          rewardText.textContent = notif.sub;
          banner.classList.remove('hidden');
        }
      } else if (notif.type === 'bossDefeated') {
        const banner = document.getElementById('waveClearedBanner');
        const titleEl = banner ? banner.querySelector('.wave-clear-title') : null;
        const rewardText = document.getElementById('waveClearReward');
        if (banner && rewardText) {
          if (titleEl) titleEl.textContent = 'BOSS ELIMINATED';
          rewardText.textContent = notif.sub;
          banner.classList.remove('hidden');
        }
      } else if (notif.type === 'levelUp') {
        const banner = document.getElementById('levelUpBanner');
        const numEl = document.getElementById('levelUpNum');
        if (banner && numEl) {
          numEl.textContent = notif.sub;
          banner.classList.remove('hidden');
        }
      } else if (notif.type === 'bossIncoming') {
        const banner = document.getElementById('bossIncomingBanner');
        const nameEl = document.getElementById('bossIncomingName');
        if (banner && nameEl) {
          nameEl.textContent = notif.sub;
          banner.classList.remove('hidden');
        }
      }

      this.currentTimer = setTimeout(() => {
        this._hideAll();
        this.currentTimer = null;
        this._showNext();
      }, dur);
    }

    _hideAll() {
      this.BANNER_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    }

    clear() {
      if (this.currentTimer) {
        clearTimeout(this.currentTimer);
        this.currentTimer = null;
      }
      this.queue = [];
      this._hideAll();
    }
  }

  /* ==========================================================================
     13. MAIN GAME ENGINE
     ========================================================================== */

  class Game {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.radarCanvas = document.getElementById('radarCanvas');
      this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

      this.sound = new SoundManager(this);
      this.assets = new AssetManager(this);
      this.settings = SaveManager.load();

      // Game Entities
      this.player = null;
      this.zombies = [];
      this.bullets = [];
      this.grenades = [];
      this.acidProjectiles = [];
      this.acidPuddles = [];
      this.powerups = [];
      this.coinPickups = [];
      this.particles = [];
      this.damageNumbers = [];
      this.bloodDecals = [];
      this.obstacles = [];

      // Systems
      this.camera = { x: 0, y: 0 };
      this.screenShake = 0;
      this.currentWave = 1;
      this.waveManager = new WaveManager(this);
      this.objectiveManager = new ObjectiveManager(this);
      this.upgradeManager = new UpgradeManager(this);
      this.notifQueue = new NotificationQueue(this);
      this.armoryManager = new ArmoryManager(this);

      this.stats = {
        kills: 0,
        coins: 0,
        totalCoinsEarned: 0,
        totalCoinsSpent: 0,
        shotsFired: 0,
        shotsHit: 0,
        highestWave: this.settings.bestWave || 1,
        highScore: this.settings.highScore || 0
      };

      this.comboCount = 0;
      this.comboTimer = 0;

      // Input State
      this.keysDown = new Set();
      this.input = {
        moveX: 0,
        moveY: 0,
        aimAngle: 0,
        isSprinting: false,
        isShooting: false
      };

      // Mouse & Aim Coordinates
      this.mouseClientX = window.innerWidth / 2;
      this.mouseClientY = window.innerHeight / 2;
      this.canvasMouseX = window.innerWidth / 2;
      this.canvasMouseY = window.innerHeight / 2;
      this.worldMouseX = 1400;
      this.worldMouseY = 1400;
      this.mouseInside = true;
      this.isTouchUser = false;
      this.hoveredEnemy = null;
      this.hitMarkerTimer = 0;
      this.hitMarkerIsCrit = false;
      this.hitMarkerIsKill = false;

      // Mobile Touch State
      this.touchActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.touchSprint = false;
      this.rightTouchAiming = false;
      this.wasPlayingBeforePortrait = false;

      this.state = 'menu'; // 'menu', 'playing', 'paused', 'upgrades', 'gameover'
      this.lastTime = performance.now();
      this.animFrameId = null;

      this.initWindow();
      this.generateMap();
      this.initEvents();
      this.applySavedSettings();
      this.updateMenuStats();
      this.assets.preload();

      // Launch Game Loop
      this.loop = this.loop.bind(this);
      this.animFrameId = requestAnimationFrame(this.loop);
    }

    initWindow() {
      this.displayWidth = window.innerWidth;
      this.displayHeight = window.innerHeight;
      this.worldScale = 1.0;
      let resizeTimeout = null;

      const resize = () => {
        const vp = window.visualViewport;
        const displayW = vp ? Math.round(vp.width) : (window.innerWidth || document.documentElement.clientWidth);
        const displayH = vp ? Math.round(vp.height) : (window.innerHeight || document.documentElement.clientHeight);
        this.displayWidth = displayW;
        this.displayHeight = displayH;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(displayW * dpr);
        this.canvas.height = Math.round(displayH * dpr);
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || displayW <= 1024 || displayH <= 560);
        if (isMobile && displayH < 620) {
          // Proportionally scale game world on mobile landscape so map never feels claustrophobic or squeezed
          this.worldScale = Math.max(0.5, Math.min(1.0, displayH / 600));
        } else {
          this.worldScale = 1.0;
        }

        this.updateAimAngle();
        this.checkOrientation();
      };

      const debouncedResize = () => {
        resize();
        if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
        resizeTimeout = requestAnimationFrame(() => resize());
      };

      window.addEventListener('resize', debouncedResize);
      window.addEventListener('orientationchange', () => {
        debouncedResize();
        setTimeout(debouncedResize, 120);
      });
      if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
        window.visualViewport.addEventListener('resize', debouncedResize);
      }
      // Recalculate layout on fullscreen transitions
      document.addEventListener('fullscreenchange', debouncedResize);
      document.addEventListener('webkitfullscreenchange', debouncedResize);
      resize();
    }

    checkOrientation() {
      const vp = window.visualViewport;
      const displayW = vp ? Math.round(vp.width) : (window.innerWidth || document.documentElement.clientWidth);
      const displayH = vp ? Math.round(vp.height) : (window.innerHeight || document.documentElement.clientHeight);
      this.displayWidth = displayW;
      this.displayHeight = displayH;
      const isPortrait = displayH > displayW && displayW <= 1024;
      const overlay = document.getElementById('rotateDeviceOverlay');
      if (overlay) {
        if (isPortrait) {
          overlay.classList.remove('hidden');
          if (this.state === 'playing') {
            this.wasPlayingBeforePortrait = true;
            this.state = 'paused';
            this.keysDown.clear();
            this.input.isShooting = false;
            this.input.isSprinting = false;
            this.touchActive = false;
            this.touchMoveX = 0;
            this.touchMoveY = 0;
            this.rightTouchAiming = false;
          }
          const mob = document.getElementById('mobileControls');
          if (mob) mob.classList.add('hidden');
        } else {
          overlay.classList.add('hidden');
          if (this.wasPlayingBeforePortrait) {
            this.wasPlayingBeforePortrait = false;
            this.state = 'playing';
            this.lastTime = performance.now();
          }
          if (this.state === 'playing' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || displayW <= 1024)) {
            const mob = document.getElementById('mobileControls');
            if (mob) mob.classList.remove('hidden');
          }
        }
      }
    }

    applySavedSettings() {
      this.sound.setMasterVolume(this.settings.masterVol / 100);
      this.sound.setSfxVolume(this.settings.sfxVol / 100);

      const mRange = document.getElementById('masterVolRange');
      const sRange = document.getElementById('sfxVolRange');
      const shakeToggle = document.getElementById('screenShakeToggle');
      const bloodToggle = document.getElementById('bloodToggle');
      const flashToggle = document.getElementById('flashLightToggle');

      if (mRange) mRange.value = this.settings.masterVol;
      if (sRange) sRange.value = this.settings.sfxVol;
      if (shakeToggle) shakeToggle.checked = this.settings.screenShake;
      if (bloodToggle) bloodToggle.checked = this.settings.bloodGore;
      if (flashToggle) flashToggle.checked = this.settings.flashlight;
    }

    updateMenuStats() {
      const rWave = document.getElementById('recordWave');
      const rKills = document.getElementById('recordKills');
      const rScore = document.getElementById('recordScore');
      if (rWave) rWave.textContent = this.settings.bestWave;
      if (rKills) rKills.textContent = this.settings.mostKills;
      if (rScore) rScore.textContent = this.settings.highScore;
    }

    generateMap() {
      this.obstacles = [];

      // Perimeter Containment Walls
      const wallThick = 40;
      this.obstacles.push(new Obstacle(0, 0, MAP_WIDTH, wallThick, 'building'));
      this.obstacles.push(new Obstacle(0, MAP_HEIGHT - wallThick, MAP_WIDTH, wallThick, 'building'));
      this.obstacles.push(new Obstacle(0, 0, wallThick, MAP_HEIGHT, 'building'));
      this.obstacles.push(new Obstacle(MAP_WIDTH - wallThick, 0, wallThick, MAP_HEIGHT, 'building'));

      // City Buildings & Districts
      const buildings = [
        // North-West Warehouses
        { x: 280, y: 280, w: 340, h: 220, type: 'building' },
        { x: 780, y: 240, w: 420, h: 260, type: 'building' },
        { x: 300, y: 780, w: 280, h: 360, type: 'building' },
        { x: 840, y: 820, w: 320, h: 320, type: 'building' },

        // North-East Medical/Generator Complex
        { x: 1420, y: 280, w: 360, h: 280, type: 'building' },
        { x: 2020, y: 260, w: 440, h: 280, type: 'building' },
        { x: 1680, y: 820, w: 380, h: 340, type: 'building' },
        { x: 2220, y: 780, w: 340, h: 420, type: 'building' },

        // South-West Residential Blocks
        { x: 380, y: 1480, w: 360, h: 300, type: 'building' },
        { x: 980, y: 1420, w: 340, h: 360, type: 'building' },
        { x: 280, y: 2080, w: 400, h: 280, type: 'building' },
        { x: 880, y: 2120, w: 360, h: 280, type: 'building' },

        // South-East Helipad Outpost
        { x: 1540, y: 1480, w: 380, h: 280, type: 'building' },
        { x: 2120, y: 1460, w: 400, h: 360, type: 'building' },
        { x: 1480, y: 2080, w: 420, h: 320, type: 'building' },
        { x: 2240, y: 2120, w: 360, h: 280, type: 'building' },
      ];

      buildings.forEach(b => {
        this.obstacles.push(new Obstacle(b.x, b.y, b.w, b.h, b.type));
      });

      // Barriers, Shipping Containers, Wrecked Cars, and Destructible Supply Crates
      const props = [
        { x: 690, y: 390, w: 45, h: 95, type: 'container' },
        { x: 1240, y: 410, w: 95, h: 45, type: 'container' },
        { x: 1860, y: 370, w: 45, h: 95, type: 'container' },

        { x: 710, y: 940, w: 85, h: 24, type: 'barrier' },
        { x: 1390, y: 910, w: 24, h: 90, type: 'barrier' },
        { x: 2040, y: 950, w: 90, h: 24, type: 'barrier' },

        { x: 730, y: 1590, w: 48, h: 78, type: 'car' },
        { x: 1410, y: 1340, w: 78, h: 48, type: 'car' },
        { x: 1960, y: 1610, w: 78, h: 48, type: 'car' },

        // Destructible Supply Crates with Loot
        { x: 660, y: 310, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 },
        { x: 1310, y: 810, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 },
        { x: 1490, y: 1410, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 },
        { x: 1990, y: 740, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 },
        { x: 760, y: 2090, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 },
        { x: 1360, y: 2190, w: 38, h: 38, type: 'crate', destructible: true, hp: 40 }
      ];

      props.forEach(p => {
        this.obstacles.push(new Obstacle(p.x, p.y, p.w, p.h, p.type, p.destructible, p.hp));
      });
    }

    startNewGame() {
      this.sound.ensureContext();
      this.sound.playButtonClick();

      this.currentWave = 1;
      this.stats.kills = 0;
      this.stats.coins = 0;
      this.stats.totalCoinsEarned = 0;
      this.stats.totalCoinsSpent = 0;
      this.stats.shotsFired = 0;
      this.stats.shotsHit = 0;
      this.gameOverHandled = false;

      // Entity Cleanup
      this.zombies = [];
      this.bullets = [];
      this.grenades = [];
      this.acidProjectiles = [];
      this.acidPuddles = [];
      this.powerups = [];
      this.coinPickups = [];
      this.particles = [];
      this.damageNumbers = [];
      this.bloodDecals = [];

      this.objectiveManager.active = false;
      this.keysDown.clear();

      // Spawn Player in Center
      this.player = new Player(1400, 1400, this);

      // Hide Modals & Activate HUD
      document.getElementById('mainMenuScreen').classList.add('hidden');
      document.getElementById('gameOverModal').classList.add('hidden');
      document.getElementById('pauseModal').classList.add('hidden');
      document.getElementById('upgradeChoiceModal').classList.add('hidden');
      const wcModal = document.getElementById('waveClearedModal');
      if (wcModal) wcModal.classList.add('hidden');
      const armModal = document.getElementById('armoryModal');
      if (armModal) armModal.classList.add('hidden');
      document.getElementById('gameHud').classList.remove('hidden');

      // Show mobile controls on touch-enabled or mobile-sized devices (if not in portrait)
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth <= 1024;
      if (!isPortrait && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024)) {
        const mob = document.getElementById('mobileControls');
        if (mob) mob.classList.remove('hidden');
      }

      this.state = 'playing';
      this.updateCursorState();
      this.waveManager.startWave(this.currentWave);
      this.updateHud();
    }

    triggerScreenShake(amount) {
      if (!this.settings.screenShake) return;
      // Reduce shake intensity on mobile to avoid disorientation
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) amount *= 0.4;
      this.screenShake = Math.min(24, this.screenShake + amount);
    }

    showDamageFlash() {
      const overlay = document.getElementById('damageOverlay');
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 170);
      }
    }

    toggleFullscreen() {
      try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          const el = document.documentElement;
          const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
          if (req) req.call(el).catch(() => {}); // silently fail if browser blocks it
        } else {
          const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
          if (exit) exit.call(document).catch(() => {});
        }
      } catch (e) {
        // Fullscreen not supported — no crash, no harm
      }
    }

    triggerHitMarker(isCrit = false, isKill = false) {
      this.hitMarkerTimer = isKill ? 0.16 : 0.09;
      this.hitMarkerIsCrit = isCrit;
      this.hitMarkerIsKill = isKill;

      const hm = document.getElementById('hitMarker');
      if (hm) {
        hm.style.left = `${this.mouseClientX}px`;
        hm.style.top = `${this.mouseClientY}px`;
        if (isKill) {
          hm.className = 'hit-marker show kill';
        } else if (isCrit) {
          hm.className = 'hit-marker show crit';
        } else {
          hm.className = 'hit-marker show';
        }
        setTimeout(() => hm.classList.remove('show'), isKill ? 120 : 70);
      }
    }

    addBloodDecal(x, y, radius) {
      if (this.bloodDecals.length > 140) {
        this.bloodDecals.shift();
      }
      this.bloodDecals.push(new Decal(x, y, radius));
    }

    spawnPowerUp(x, y) {
      const types = ['medkit', 'rapid_fire', 'shield', 'ammo_box', 'damage_boost', 'speed_boost'];
      const pick = types[Math.floor(Math.random() * types.length)];
      let puX = x;
      let puY = y;
      const puRadius = 16;
      for (let j = 0; j < this.obstacles.length; j++) {
        const ob = this.obstacles[j];
        if (ob.dead) continue;
        if (puX + puRadius > ob.x && puX - puRadius < ob.x + ob.w &&
            puY + puRadius > ob.y && puY - puRadius < ob.y + ob.h) {
          const dL = Math.abs(puX - ob.x);
          const dR = Math.abs(puX - (ob.x + ob.w));
          const dT = Math.abs(puY - ob.y);
          const dB = Math.abs(puY - (ob.y + ob.h));
          const minD = Math.min(dL, dR, dT, dB);
          if (minD === dL) puX = ob.x - puRadius - 6;
          else if (minD === dR) puX = ob.x + ob.w + puRadius + 6;
          else if (minD === dT) puY = ob.y - puRadius - 6;
          else puY = ob.y + ob.h + puRadius + 6;
        }
      }
      this.powerups.push(new PowerUp(puX, puY, pick, this));
    }

    registerKillCombo() {
      this.comboCount++;
      this.comboTimer = 2.5;

      if (this.comboCount >= 2) {
        const titles = {
          2: 'DOUBLE KILL!',
          3: 'TRIPLE KILL!',
          4: 'QUAD KILL!',
          5: 'RAMPAGE!!',
          6: 'UNSTOPPABLE!!'
        };
        const title = titles[Math.min(6, this.comboCount)] || `${this.comboCount}x MASSACRE!`;
        const bonus = this.comboCount * 12;
        this.player.addCoins(bonus);
        this.notifQueue.enqueue('combo', title, `+${bonus} BOUNTY BONUS`, 2000);
      }
    }

    updateHud() {
      if (!this.player) return;

      const wNum = document.getElementById('hudWaveNum');
      const eLeft = document.getElementById('hudEnemiesLeft');
      const hCoins = document.getElementById('hudCoins');
      const hKills = document.getElementById('hudKills');

      if (wNum) wNum.textContent = this.currentWave;
      if (eLeft) eLeft.textContent = this.zombies.length + this.waveManager.zombiesToSpawn.length;
      if (hCoins) hCoins.textContent = this.stats.coins;
      if (hKills) hKills.textContent = this.stats.kills;

      // Boss Bar
      const bossBar = document.getElementById('bossHealthContainer');
      const bossObj = this.zombies.find(z => z.isBoss);
      if (bossBar) {
        if (bossObj && !bossObj.dead) {
          bossBar.classList.remove('hidden');
          const fill = document.getElementById('bossHpFill');
          const pct = document.getElementById('bossHpPercent');
          const bossPercent = Math.max(0, Math.round((bossObj.hp / bossObj.maxHp) * 100));
          if (fill) fill.style.width = `${bossPercent}%`;
          if (pct) pct.textContent = `${bossPercent}%`;
        } else {
          bossBar.classList.add('hidden');
        }
      }

      // Health Bar
      const hpFill = document.getElementById('hpFill');
      const hpText = document.getElementById('hpText');
      const dmgOverlay = document.getElementById('damageOverlay');

      if (hpFill && hpText) {
        const hpPct = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
        hpFill.style.width = `${hpPct}%`;
        hpText.textContent = `${Math.round(this.player.health)} / ${this.player.maxHealth}`;

        if (dmgOverlay) {
          if (hpPct <= 30) dmgOverlay.classList.add('low-health');
          else dmgOverlay.classList.remove('low-health');
        }
      }

      // Stamina Bar
      const stamFill = document.getElementById('staminaFill');
      const stamText = document.getElementById('staminaText');
      if (stamFill && stamText) {
        const sPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
        stamFill.style.width = `${sPct}%`;
        stamText.textContent = `${Math.round(sPct)}%`;
      }

      // Level & XP Bar
      const hLevel = document.getElementById('hudLevel');
      const xpFill = document.getElementById('xpFill');
      const xpText = document.getElementById('xpText');
      if (hLevel) hLevel.textContent = this.player.level;
      if (xpFill && xpText) {
        const xpPct = Math.min(100, Math.max(0, (this.player.xp / this.player.xpNeeded) * 100));
        xpFill.style.width = `${xpPct}%`;
        xpText.textContent = `${this.player.xp} / ${this.player.xpNeeded}`;
      }

      // Ammo & SMG Heat Module
      const curW = this.player.weapons[this.player.currentWeaponIndex];
      const curMag = document.getElementById('currentMag');
      const curRes = document.getElementById('currentReserve');
      if (curMag && curRes) {
        curMag.textContent = curW.mag;
        curRes.textContent = curW.reserve === Infinity ? '∞' : curW.reserve;
      }
      const wCfg = WEAPON_TYPES[curW.key];
      const chipIcon = document.getElementById('activeWeaponIcon');
      const chipName = document.getElementById('activeWeaponName');
      if (chipIcon && chipName && wCfg) {
        chipIcon.textContent = wCfg.icon;
        chipName.textContent = wCfg.name;
      }

      const heatWrap = document.getElementById('heatBarWrap');
      const heatFill = document.getElementById('heatFill');
      const heatLabel = document.getElementById('heatLabel');
      if (heatWrap && heatFill && heatLabel) {
        if (WEAPON_TYPES[curW.key].hasHeat) {
          heatWrap.classList.remove('hidden');
          heatFill.style.width = `${curW.heat}%`;
          if (curW.overheated) {
            heatLabel.textContent = 'OVERHEATED!';
            heatLabel.className = 'heat-status overheated';
          } else {
            heatLabel.textContent = `${Math.round(curW.heat)}%`;
            heatLabel.className = 'heat-status';
          }
        } else {
          heatWrap.classList.add('hidden');
        }
      }

      // Weapon Dock Highlighting
      this.player.weapons.forEach((w, idx) => {
        const card = document.getElementById(`wCard${idx}`);
        const miniAmmo = document.getElementById(`miniAmmo${idx}`);
        if (card) {
          if (idx === this.player.currentWeaponIndex) card.classList.add('active');
          else card.classList.remove('active');
        }
        if (miniAmmo) {
          miniAmmo.textContent = `${w.mag}/${w.reserve === Infinity ? '∞' : w.reserve}`;
        }
      });

      // Mobile Grenade Count & Sprint Status
      const mobGrenadeCount = document.getElementById('mobileGrenadeCount');
      if (mobGrenadeCount && this.player) {
        const gw = this.player.weapons.find(w => w.key === 'grenade') || this.player.weapons[4];
        const gTotal = gw ? (gw.mag + (gw.reserve === Infinity ? 0 : gw.reserve)) : 0;
        mobGrenadeCount.textContent = gTotal;
        const mobGrenadeBtn = document.getElementById('mobileGrenadeBtn');
        if (mobGrenadeBtn) {
          if (gTotal <= 0) mobGrenadeBtn.classList.add('disabled');
          else mobGrenadeBtn.classList.remove('disabled');
        }
      }
      if (this.player && this.player.stamina <= 3 && this.touchSprint) {
        this.touchSprint = false;
        const mobSprintBtn = document.getElementById('mobileSprintBtn');
        if (mobSprintBtn) mobSprintBtn.classList.remove('active');
      }
    }

    updateBuffsHud() {
      const container = document.getElementById('buffsContainer');
      if (!container || !this.player) return;

      container.innerHTML = '';
      const labels = {
        shield: '🛡️ KEVLAR SHIELD',
        rapid_fire: '⚡ HYPER TRIGGER',
        damage_boost: '🔥 RAGE DAMAGE',
        speed_boost: '👟 SPEED SURGE'
      };

      for (const key in this.player.buffs) {
        if (this.player.buffs[key] > 0) {
          const div = document.createElement('div');
          div.className = `buff-badge ${key}`;
          div.textContent = `${labels[key]} (${Math.ceil(this.player.buffs[key])}s)`;
          container.appendChild(div);
        }
      }
    }

    showCoinDelta(amount, isPositive = true) {
      const el = document.getElementById('hudCoinDelta');
      if (!el) return;
      el.textContent = `${isPositive ? '+' : '-'}${amount}`;
      el.className = `coin-delta ${isPositive ? 'positive' : 'negative'}`;
      el.classList.remove('hidden');
      if (this.coinDeltaTimer) clearTimeout(this.coinDeltaTimer);
      this.coinDeltaTimer = setTimeout(() => {
        el.classList.add('hidden');
      }, 1200);

      const badge = document.getElementById('hudCoinBadge');
      if (badge) {
        badge.classList.remove('pulse-gold', 'pulse-red');
        void badge.offsetWidth;
        badge.classList.add(isPositive ? 'pulse-gold' : 'pulse-red');
        setTimeout(() => badge.classList.remove('pulse-gold', 'pulse-red'), 400);
      }
    }

    showWaveClearedDialog() {
      this.state = 'intermission';
      const modal = document.getElementById('waveClearedModal');
      const title = document.getElementById('wcWaveTitle');
      const rewardVal = document.getElementById('wcRewardVal');
      if (title) title.textContent = `WAVE ${this.currentWave} CLEARED`;
      const reward = this.waveManager.lastWaveClearReward || (ECONOMY_CONFIG.rewards.waveBase + this.currentWave * ECONOMY_CONFIG.rewards.wavePerWave);
      if (rewardVal) rewardVal.textContent = `+${reward} 🪙 BOUNTY EARNED`;
      if (modal) modal.classList.remove('hidden');

      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.touchActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.rightTouchAiming = false;
      this.input.isShooting = false;
      this.input.isSprinting = false;
      this.updateCursorState();
    }

    resumeAfterWaveIntermission() {
      this.state = 'playing';
      this.lastTime = performance.now();
      const wcModal = document.getElementById('waveClearedModal');
      if (wcModal) wcModal.classList.add('hidden');
      const armoryModal = document.getElementById('armoryModal');
      if (armoryModal) armoryModal.classList.add('hidden');

      if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024) {
        const mob = document.getElementById('mobileControls');
        if (mob) mob.classList.remove('hidden');
      }
      this.updateCursorState();

      if (this.waveManager.waveClearedPending) {
        this.waveManager.waveClearedPending = false;
        this.currentWave++;
        this.armoryManager.checkBlackMarketRotation(this.currentWave);
        this.waveManager.startWave(this.currentWave);
      }
    }

    spawnCoinPickup(x, y, value = 10) {
      const rad = 14;
      let validX = Math.max(rad + 42, Math.min(MAP_WIDTH - rad - 42, x));
      let validY = Math.max(rad + 42, Math.min(MAP_HEIGHT - rad - 42, y));

      if (checkCircleObstacleCollision(validX, validY, rad + 10, this.obstacles)) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const testX = validX + Math.cos(angle) * 35;
          const testY = validY + Math.sin(angle) * 35;
          if (!checkCircleObstacleCollision(testX, testY, rad + 10, this.obstacles)) {
            validX = testX;
            validY = testY;
            break;
          }
        }
      }

      this.coinPickups.push(new CoinPickup(validX, validY, value));
    }

    onPlayerDeath() {
      if (this.gameOverHandled) return;
      this.gameOverHandled = true;

      this.state = 'gameover';
      this.sound.playGameOver();

      let newRecord = false;
      if (this.currentWave > this.settings.bestWave) {
        this.settings.bestWave = this.currentWave;
        newRecord = true;
      }
      if (this.stats.kills > this.settings.mostKills) {
        this.settings.mostKills = this.stats.kills;
        newRecord = true;
      }
      const score = this.stats.kills * 100 + this.currentWave * 500 + this.stats.totalCoinsEarned;
      if (score > this.settings.highScore) {
        this.settings.highScore = score;
        newRecord = true;
      }

      // Convert remaining unspent run coins into permanent banked coins
      const unspentCoins = Math.max(0, this.stats.coins || 0);
      this.settings.bankedCoins = Math.max(0, (this.settings.bankedCoins || 0) + unspentCoins);
      SaveManager.save(this.settings);
      this.updateMenuStats();

      // Show Game Over Modal
      const modal = document.getElementById('gameOverModal');
      const goWave = document.getElementById('goWave');
      const goKills = document.getElementById('goKills');
      const goCoinsEarned = document.getElementById('goCoinsEarned');
      const goCoinsSpent = document.getElementById('goCoinsSpent');
      const goBankedCoins = document.getElementById('goBankedCoins');
      const goBestWave = document.getElementById('goBestWave');
      const goScore = document.getElementById('goScore');
      const newRecBanner = document.getElementById('newRecordNotice');

      if (goWave) goWave.textContent = this.currentWave;
      if (goKills) goKills.textContent = this.stats.kills.toLocaleString();
      if (goCoinsEarned) goCoinsEarned.textContent = `${(this.stats.totalCoinsEarned || 0).toLocaleString()} 🪙`;
      if (goCoinsSpent) goCoinsSpent.textContent = `${(this.stats.totalCoinsSpent || 0).toLocaleString()} 🪙`;
      if (goBankedCoins) goBankedCoins.textContent = `${(this.settings.bankedCoins || 0).toLocaleString()} 🏦`;
      if (goBestWave) goBestWave.textContent = this.settings.bestWave;
      if (goScore) goScore.textContent = score.toLocaleString();

      if (newRecBanner) {
        if (newRecord) newRecBanner.classList.remove('hidden');
        else newRecBanner.classList.add('hidden');
      }

      if (modal) modal.classList.remove('hidden');
      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.keysDown.clear();
      this.input.isShooting = false;
      this.input.isSprinting = false;
      this.touchActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.rightTouchAiming = false;
      this.updateCursorState();
    }

    pauseGame() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.sound.playButtonClick();
      const modal = document.getElementById('pauseModal');
      if (modal) modal.classList.remove('hidden');
      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.keysDown.clear();
      this.input.isShooting = false;
      this.input.isSprinting = false;
      this.touchActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.rightTouchAiming = false;
      this.updateCursorState();
    }

    resumeGame() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this.sound.playButtonClick();
      const modal = document.getElementById('pauseModal');
      if (modal) modal.classList.add('hidden');
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024) {
        const mob = document.getElementById('mobileControls');
        if (mob) mob.classList.remove('hidden');
      }
      this.updateCursorState();
      this.lastTime = performance.now();
    }

    returnToMainMenu() {
      this.state = 'menu';
      this.sound.playButtonClick();
      document.getElementById('pauseModal').classList.add('hidden');
      document.getElementById('gameOverModal').classList.add('hidden');
      document.getElementById('upgradeChoiceModal').classList.add('hidden');
      document.getElementById('gameHud').classList.add('hidden');
      const mob = document.getElementById('mobileControls');
      if (mob) mob.classList.add('hidden');
      this.keysDown.clear();
      this.input.isShooting = false;
      this.input.isSprinting = false;
      this.touchActive = false;
      this.touchMoveX = 0;
      this.touchMoveY = 0;
      this.rightTouchAiming = false;
      this.updateCursorState();
      document.getElementById('mainMenuScreen').classList.remove('hidden');
      this.updateMenuStats();
    }

    quickThrowGrenade() {
      if (this.state !== 'playing' || !this.player) return;
      const gWeapon = this.player.weapons.find(w => w.key === 'grenade') || this.player.weapons[4];
      if (!gWeapon) return;
      if (gWeapon.mag <= 0 && gWeapon.reserve <= 0) {
        this.sound.playEmpty();
        return;
      }
      const cfg = WEAPON_TYPES.grenade;
      const throwDist = 240;
      const throwAngle = (this.player.angle !== undefined && this.player.angle !== null) ? this.player.angle : this.input.aimAngle;
      const targetX = this.player.x + Math.cos(throwAngle) * throwDist;
      const targetY = this.player.y + Math.sin(throwAngle) * throwDist;
      const barrelX = this.player.x + Math.cos(throwAngle) * 26;
      const barrelY = this.player.y + Math.sin(throwAngle) * 26;

      this.grenades.push(new GrenadeProjectile(barrelX, barrelY, targetX, targetY, cfg));
      if (gWeapon.mag > 0) {
        gWeapon.mag--;
      } else if (gWeapon.reserve > 0 && gWeapon.reserve !== Infinity) {
        gWeapon.reserve--;
      }

      this.sound.playShoot('grenade');
      this.triggerScreenShake(6);
      this.updateHud();
    }

    updateCursorState() {
      if (this.state === 'playing' && !this.touchActive && !this.rightTouchAiming && this.mouseInside && !this.isTouchUser) {
        document.body.classList.add('in-combat');
      } else {
        document.body.classList.remove('in-combat');
      }
    }

    updateAimAngle() {
      if (!this.player) return;
      const rect = this.canvas.getBoundingClientRect();
      const rw = rect.width > 0 ? rect.width : (this.displayWidth || window.innerWidth);
      const rh = rect.height > 0 ? rect.height : (this.displayHeight || window.innerHeight);

      // Mouse position relative to canvas display bounds, strictly clamped inside canvas
      const clampedX = Math.max(0, Math.min(rw, this.mouseClientX - rect.left));
      const clampedY = Math.max(0, Math.min(rh, this.mouseClientY - rect.top));

      this.canvasMouseX = clampedX;
      this.canvasMouseY = clampedY;

      // In game world coordinates, correctly scaled by worldScale
      const scale = this.worldScale || 1.0;
      this.worldMouseX = (clampedX / scale) + this.camera.x;
      this.worldMouseY = (clampedY / scale) + this.camera.y;

      if (isNaN(this.worldMouseX)) this.worldMouseX = this.player.x;
      if (isNaN(this.worldMouseY)) this.worldMouseY = this.player.y;

      // When the fire button is controlling aim (mobile), do NOT overwrite
      // input.aimAngle — the fire-drag handler already set it directly.
      if (!this.rightTouchAiming) {
        this.input.aimAngle = Math.atan2(this.worldMouseY - this.player.y, this.worldMouseX - this.player.x);
      }

      // Check hovered enemy
      let hovered = null;
      if (this.zombies && this.zombies.length > 0) {
        for (let i = 0; i < this.zombies.length; i++) {
          const z = this.zombies[i];
          if (z.dead) continue;
          const dx = this.worldMouseX - z.x;
          const dy = this.worldMouseY - z.y;
          const targetDist = z.radius + 6;
          if (dx * dx + dy * dy <= targetDist * targetDist) {
            hovered = z;
            break;
          }
        }
      }
      this.hoveredEnemy = hovered;
    }

    /* ==========================================================================
     14. EVENT LISTENERS & INPUT HANDLING
     ========================================================================== */

    initEvents() {
      // Robust Key State Management
      window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        this.keysDown.add(k);

        if (e.key === 'Escape' || k === 'p') {
          if (this.state === 'armory') {
            this.armoryManager.close();
          } else if (this.state === 'playing') {
            this.pauseGame();
          } else if (this.state === 'paused') {
            this.resumeGame();
          }
        }

        if (this.state === 'playing' && this.player) {
          if (k === 'r') this.player.reload();
          if (k === '1') this.player.switchWeapon(0);
          if (k === '2') this.player.switchWeapon(1);
          if (k === '3') this.player.switchWeapon(2);
          if (k === '4') this.player.switchWeapon(3);
          if (k === '5') this.player.switchWeapon(4);
        }
      });

      window.addEventListener('keyup', e => {
        this.keysDown.delete(e.key.toLowerCase());
      });

      window.addEventListener('blur', () => {
        this.keysDown.clear();
        this.input.isShooting = false;
        this.input.isSprinting = false;
      });

      // Pointer & Mouse Input Handling (Trackpads, Mice, Styli)
      const onPointerMove = e => {
        if (e.pointerType === 'touch') {
          this.isTouchUser = true;
          return;
        }
        if (this.rightTouchAiming) return;
        this.isTouchUser = false;
        this.mouseInside = true;
        this.mouseClientX = e.clientX;
        this.mouseClientY = e.clientY;
        this.updateAimAngle();
        this.updateCursorState();
      };

      const onPointerDown = e => {
        if (e.pointerType === 'touch') return;
        if (e.button === 0 && this.state === 'playing') {
          this.isTouchUser = false;
          this.mouseInside = true;
          this.input.isShooting = true;
          this.sound.ensureContext();
        }
      };

      const onPointerUp = e => {
        if (e.pointerType === 'touch') return;
        if (e.button === 0) {
          this.input.isShooting = false;
        }
      };

      if (typeof window !== 'undefined') {
        if (window.PointerEvent) {
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerdown', onPointerDown);
          window.addEventListener('pointerup', onPointerUp);
        } else {
          window.addEventListener('mousemove', onPointerMove);
          window.addEventListener('mousedown', onPointerDown);
          window.addEventListener('mouseup', onPointerUp);
        }

        window.addEventListener('mouseleave', () => {
          this.mouseInside = false;
          this.input.isShooting = false;
          this.updateCursorState();
        });

        window.addEventListener('mouseenter', () => {
          this.mouseInside = true;
          this.updateCursorState();
        });
      }

      window.addEventListener('wheel', e => {
        if (this.state !== 'playing' || !this.player) return;
        const dir = e.deltaY > 0 ? 1 : -1;
        let nextIdx = this.player.currentWeaponIndex + dir;
        if (nextIdx < 0) nextIdx = this.player.weapons.length - 1;
        if (nextIdx >= this.player.weapons.length) nextIdx = 0;
        this.player.switchWeapon(nextIdx);
      });

      // Weapon Dock Clicks
      for (let i = 0; i < 5; i++) {
        const card = document.getElementById(`wCard${i}`);
        if (card) {
          card.addEventListener('click', () => {
            if (this.state === 'playing' && this.player) {
              this.player.switchWeapon(i);
            }
          });
        }
      }

      // UI Buttons
      const btnStart = document.getElementById('btnStartGame');
      const btnHowTo = document.getElementById('btnHowToPlay');
      const btnSettings = document.getElementById('btnSettings');
      const btnPause = document.getElementById('hudPauseBtn');
      const btnResume = document.getElementById('btnResume');
      const btnRestart = document.getElementById('btnRestart');
      const btnPauseMenu = document.getElementById('btnPauseMenu');
      const btnPauseHowTo = document.getElementById('btnPauseHowTo');
      const btnPlayAgain = document.getElementById('btnPlayAgain');
      const btnReturnMenu = document.getElementById('btnReturnMenu');
      const btnCloseIntel = document.getElementById('btnCloseIntel');
      const btnIntelDismiss = document.getElementById('btnIntelDismiss');
      const btnCloseSettings = document.getElementById('btnCloseSettings');
      const btnSaveSettings = document.getElementById('btnSaveSettings');
      const btnFullscreen = document.getElementById('btnFullscreen');
      const btnSettingsFullscreen = document.getElementById('btnSettingsFullscreen');

      if (btnStart) btnStart.addEventListener('click', () => this.startNewGame());
      if (btnHowTo) btnHowTo.addEventListener('click', () => this.openIntelModal());
      if (btnSettings) btnSettings.addEventListener('click', () => this.openSettingsModal());
      if (btnPause) btnPause.addEventListener('click', () => this.pauseGame());
      if (btnResume) btnResume.addEventListener('click', () => this.resumeGame());
      if (btnRestart) btnRestart.addEventListener('click', () => this.startNewGame());
      if (btnPauseMenu) btnPauseMenu.addEventListener('click', () => this.returnToMainMenu());
      if (btnPauseHowTo) btnPauseHowTo.addEventListener('click', () => this.openIntelModal());
      if (btnPlayAgain) btnPlayAgain.addEventListener('click', () => this.startNewGame());
      if (btnReturnMenu) btnReturnMenu.addEventListener('click', () => this.returnToMainMenu());

      if (btnCloseIntel) btnCloseIntel.addEventListener('click', () => this.closeIntelModal());
      if (btnIntelDismiss) btnIntelDismiss.addEventListener('click', () => this.closeIntelModal());
      if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
      if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => this.saveSettingsFromModal());

      // Fullscreen buttons
      const onFullscreenClick = () => { this.sound.playButtonClick(); this.toggleFullscreen(); };
      if (btnFullscreen) btnFullscreen.addEventListener('click', onFullscreenClick);
      if (btnSettingsFullscreen) btnSettingsFullscreen.addEventListener('click', onFullscreenClick);

      // Update fullscreen button text on state change
      const updateFsButtons = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        const label = isFs ? '✕ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
        if (btnFullscreen) btnFullscreen.textContent = label;
        if (btnSettingsFullscreen) btnSettingsFullscreen.textContent = label;
      };
      document.addEventListener('fullscreenchange', updateFsButtons);
      document.addEventListener('webkitfullscreenchange', updateFsButtons);

      // Intel Tabs
      document.querySelectorAll('.intel-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.intel-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.intel-tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('active');
        });
      });

      // Settings Sliders
      const mRange = document.getElementById('masterVolRange');
      const sRange = document.getElementById('sfxVolRange');
      if (mRange) {
        mRange.addEventListener('input', e => {
          document.getElementById('masterVolVal').textContent = `${e.target.value}%`;
          this.sound.setMasterVolume(e.target.value / 100);
        });
      }
      if (sRange) {
        sRange.addEventListener('input', e => {
          document.getElementById('sfxVolVal').textContent = `${e.target.value}%`;
          this.sound.setSfxVolume(e.target.value / 100);
        });
      }

      this.initMobileControls();
    }

    openIntelModal() {
      this.sound.playButtonClick();
      document.getElementById('howToPlayModal').classList.remove('hidden');
      document.body.classList.remove('in-combat');
    }

    closeIntelModal() {
      document.getElementById('howToPlayModal').classList.add('hidden');
      this.updateCursorState();
    }

    openSettingsModal() {
      this.sound.playButtonClick();
      document.getElementById('settingsModal').classList.remove('hidden');
      document.body.classList.remove('in-combat');
    }

    closeSettingsModal() {
      document.getElementById('settingsModal').classList.add('hidden');
      this.updateCursorState();
    }

    saveSettingsFromModal() {
      this.sound.playButtonClick();
      const mRange = document.getElementById('masterVolRange');
      const sRange = document.getElementById('sfxVolRange');
      const shakeToggle = document.getElementById('screenShakeToggle');
      const bloodToggle = document.getElementById('bloodToggle');
      const flashToggle = document.getElementById('flashLightToggle');

      if (mRange) this.settings.masterVol = parseInt(mRange.value, 10);
      if (sRange) this.settings.sfxVol = parseInt(sRange.value, 10);
      if (shakeToggle) this.settings.screenShake = shakeToggle.checked;
      if (bloodToggle) this.settings.bloodGore = bloodToggle.checked;
      if (flashToggle) this.settings.flashlight = flashToggle.checked;

      SaveManager.save(this.settings);
      this.closeSettingsModal();
    }

    initMobileControls() {
      const joystickZone = document.getElementById('joystickZone');
      const joystickThumb = document.getElementById('joystickThumb');
      let touchId = null;
      let startX = 0;
      let startY = 0;
      let maxRadius = 42;

      if (joystickZone && joystickThumb) {
        joystickZone.addEventListener('touchstart', e => {
          e.preventDefault();
          const touch = e.changedTouches[0];
          touchId = touch.identifier;
          const rect = joystickZone.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
          maxRadius = Math.max(30, Math.min(65, rect.width * 0.35));
          this.touchActive = true;
        }, { passive: false });

        joystickZone.addEventListener('touchmove', e => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchId) {
              const dx = touch.clientX - startX;
              const dy = touch.clientY - startY;
              const dist = Math.hypot(dx, dy);
              const angle = Math.atan2(dy, dx);
              const clamped = Math.min(dist, maxRadius);
              const tx = Math.cos(angle) * clamped;
              const ty = Math.sin(angle) * clamped;

              joystickThumb.style.transform = `translate(${tx}px, ${ty}px)`;

              // Joystick = MOVEMENT ONLY. Aim is controlled by the fire button.
              this.touchMoveX = tx / maxRadius;
              this.touchMoveY = ty / maxRadius;
            }
          }
        }, { passive: false });

        const resetStick = e => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
              touchId = null;
              joystickThumb.style.transform = 'translate(0px, 0px)';
              this.touchMoveX = 0;
              this.touchMoveY = 0;
              this.touchActive = false;
            }
          }
        };

        joystickZone.addEventListener('touchend', resetStick);
        joystickZone.addEventListener('touchcancel', resetStick);
      }

      // mobileAimZone is hidden — fire button handles aim+shoot.
      // No event listeners needed for the aim zone.

      // Mobile Buttons
      const mobFire = document.getElementById('mobileFireBtn');
      const mobReload = document.getElementById('mobileReloadBtn');
      const mobSprint = document.getElementById('mobileSprintBtn');
      const mobGrenade = document.getElementById('mobileGrenadeBtn');
      const mobSwap = document.getElementById('mobileSwapBtn');
      const fireAimDot = document.getElementById('fireAimDot');

      /* ================================================================
         FIRE BUTTON: drag-to-aim + shoot

         The fire button is a 360° analog aim joystick AND trigger.
         - Touch anywhere on the button to start firing.
         - Drag the finger in any direction to aim.
         - Release to stop firing (aim angle is remembered).
         - Deadzone: only update angle when drag > DEADZONE_PX pixels.
         - Multi-touch safe: uses pointerId (falls back to touch identifier).
         ================================================================ */
      if (mobFire) {
        const DEADZONE_PX = 8; // pixels from center before angle updates
        let firePtrId = null;
        let fireCenterX = 0;
        let fireCenterY = 0;
        // Half the button's rendered size — used for clamping the aim dot
        const AIM_DOT_RADIUS = 28; // max pixels from button center for dot display

        const updateFireAimDot = (angle, dist) => {
          if (!fireAimDot) return;
          if (dist < DEADZONE_PX) {
            // Deadzone — hide or center dot
            fireAimDot.style.display = 'none';
            return;
          }
          const dotDist = Math.min(dist, AIM_DOT_RADIUS);
          const cx = mobFire.offsetWidth / 2;
          const cy = mobFire.offsetHeight / 2;
          const dotX = cx + Math.cos(angle) * dotDist;
          const dotY = cy + Math.sin(angle) * dotDist;
          fireAimDot.style.display = 'block';
          fireAimDot.style.left = `${dotX}px`;
          fireAimDot.style.top = `${dotY}px`;
        };

        const onFireStart = e => {
          e.preventDefault();
          // Accept first touch; ignore additional touches on this element
          if (firePtrId !== null) return;

          let clientX, clientY, id;
          if (e.changedTouches) {
            const t = e.changedTouches[0];
            clientX = t.clientX;
            clientY = t.clientY;
            id = t.identifier;
          } else {
            clientX = e.clientX;
            clientY = e.clientY;
            id = e.pointerId;
          }

          firePtrId = id;
          const rect = mobFire.getBoundingClientRect();
          fireCenterX = rect.left + rect.width / 2;
          fireCenterY = rect.top + rect.height / 2;

          // Start firing immediately on press
          this.input.isShooting = true;
          this.rightTouchAiming = true;
          this.sound.ensureContext();
          mobFire.classList.add('pressed', 'aiming');

          // Initial position — show dot at center (deadzone)
          updateFireAimDot(this.input.aimAngle, 0);
        };

        const onFireMove = e => {
          e.preventDefault();
          if (firePtrId === null) return;

          let clientX, clientY, id;
          if (e.changedTouches) {
            // Find matching touch
            let found = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === firePtrId) {
                clientX = e.changedTouches[i].clientX;
                clientY = e.changedTouches[i].clientY;
                id = e.changedTouches[i].identifier;
                found = true;
                break;
              }
            }
            if (!found) return;
          } else {
            if (e.pointerId !== firePtrId) return;
            clientX = e.clientX;
            clientY = e.clientY;
          }

          const dx = clientX - fireCenterX;
          const dy = clientY - fireCenterY;
          const dist = Math.hypot(dx, dy);

          // Only update aim direction outside the deadzone
          if (dist >= DEADZONE_PX) {
            const angle = Math.atan2(dy, dx);
            this.input.aimAngle = angle;
            // Also update world mouse target so shoot() uses correct direction
            if (this.player) {
              const range = 300; // virtual range for worldMouse target point
              this.worldMouseX = this.player.x + Math.cos(angle) * range;
              this.worldMouseY = this.player.y + Math.sin(angle) * range;
            }
          }
          // else: inside deadzone — keep previous aimAngle, keep firing

          updateFireAimDot(this.input.aimAngle, dist);
        };

        const onFireEnd = e => {
          let matched = false;
          if (e.changedTouches) {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === firePtrId) {
                matched = true;
                break;
              }
            }
          } else {
            matched = (e.pointerId === firePtrId);
          }
          if (!matched) return;

          firePtrId = null;
          this.input.isShooting = false;
          this.rightTouchAiming = false;
          // Keep last aim angle — do NOT reset it
          mobFire.classList.remove('pressed', 'aiming');
          if (fireAimDot) fireAimDot.style.display = 'none';
        };

        // Attach with both touch and pointer events for maximum compatibility
        mobFire.addEventListener('touchstart', onFireStart, { passive: false });
        mobFire.addEventListener('touchmove', onFireMove, { passive: false });
        mobFire.addEventListener('touchend', onFireEnd, { passive: false });
        mobFire.addEventListener('touchcancel', onFireEnd, { passive: false });
      }

      if (mobReload) {
        mobReload.addEventListener('touchstart', e => {
          e.preventDefault();
          mobReload.classList.add('pressed');
          if (this.player) this.player.reload();
        }, { passive: false });
        mobReload.addEventListener('touchend', () => mobReload.classList.remove('pressed'));
        mobReload.addEventListener('touchcancel', () => mobReload.classList.remove('pressed'));
      }

      if (mobSprint) {
        mobSprint.addEventListener('touchstart', e => {
          e.preventDefault();
          this.touchSprint = !this.touchSprint;
          if (this.touchSprint) {
            mobSprint.classList.add('active');
          } else {
            mobSprint.classList.remove('active');
          }
        }, { passive: false });
      }

      if (mobGrenade) {
        mobGrenade.addEventListener('touchstart', e => {
          e.preventDefault();
          mobGrenade.classList.add('pressed');
          this.quickThrowGrenade();
        }, { passive: false });
        mobGrenade.addEventListener('touchend', () => mobGrenade.classList.remove('pressed'));
        mobGrenade.addEventListener('touchcancel', () => mobGrenade.classList.remove('pressed'));
      }

      if (mobSwap) {
        mobSwap.addEventListener('touchstart', e => {
          e.preventDefault();
          mobSwap.classList.add('pressed');
          if (this.player) {
            let next = this.player.currentWeaponIndex + 1;
            if (next >= this.player.weapons.length) next = 0;
            this.player.switchWeapon(next);
          }
        }, { passive: false });
        mobSwap.addEventListener('touchend', () => mobSwap.classList.remove('pressed'));
        mobSwap.addEventListener('touchcancel', () => mobSwap.classList.remove('pressed'));
      }
    }

    /* ==========================================================================
     15. MAIN GAME LOOP
     ========================================================================== */

    loop(currentTime) {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      if (this.state === 'playing') {
        this.update(dt);
      }

      this.render();
      this.animFrameId = requestAnimationFrame(this.loop);
    }

    update(dt) {
      // Compute direct movement from keys
      let kx = 0;
      let ky = 0;
      const k = this.keysDown;
      if (k.has('w') || k.has('arrowup')) ky -= 1;
      if (k.has('s') || k.has('arrowdown')) ky += 1;
      if (k.has('a') || k.has('arrowleft')) kx -= 1;
      if (k.has('d') || k.has('arrowright')) kx += 1;

      if (this.touchActive) {
        this.input.moveX = this.touchMoveX;
        this.input.moveY = this.touchMoveY;
        // NOTE: aim angle is now set directly by the fire-button drag handler
        // (rightTouchAiming=true). The joystick controls movement ONLY.
        // Do NOT override aimAngle here from joystick direction.
      } else {
        this.input.moveX = kx;
        this.input.moveY = ky;
      }

      this.input.isSprinting = k.has('shift') || this.touchSprint;

      // Keep aim angle aligned with current camera & player
      this.updateAimAngle();

      // Update Player
      this.player.update(dt, this.input);

      // Automatic Shooting / Single trigger
      if (this.input.isShooting && this.player) {
        const curCfg = this.player.getCurrentWeaponConfig();
        this.player.shoot(this.worldMouseX, this.worldMouseY);
        if (!curCfg.auto) {
          this.input.isShooting = false;
        }
      }

      // Update Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.update(dt);

        // Obstacle collisions (Swept line-segment test to prevent tunneling through thin walls)
        for (let j = 0; j < this.obstacles.length; j++) {
          const ob = this.obstacles[j];
          if (bulletHitsObstacle(b, ob)) {
            b.dead = true;
            ob.takeDamage(b.damage, this);
            const sparkX = Math.max(ob.x, Math.min(b.x, ob.x + ob.w));
            const sparkY = Math.max(ob.y, Math.min(b.y, ob.y + ob.h));
            for (let p = 0; p < 4; p++) {
              const spd = Math.random() * 3 + 1;
              const ang = Math.random() * Math.PI * 2;
              this.particles.push(new Particle(sparkX, sparkY, Math.cos(ang) * spd, Math.sin(ang) * spd, '#ffb703', 2, 0.2));
            }
            break;
          }
        }

        // Zombie collisions
        if (!b.dead) {
          for (let z = 0; z < this.zombies.length; z++) {
            const zombie = this.zombies[z];
            if (zombie.dead) continue;
            if (Math.hypot(zombie.x - b.x, zombie.y - b.y) <= zombie.radius + 3) {
              zombie.takeDamage(b.damage, b.angle, b.knockback, this, b.isCrit, b.isHeadshot);
              this.stats.shotsHit++;

              // Black Market Explosive Rounds (22% chance of splash AoE damage)
              if (this.player.blackMarketBuffs && this.player.blackMarketBuffs.explosiveRounds && Math.random() < 0.22) {
                this.triggerScreenShake(3.5);
                this.sound.playExplosion();
                for (let p = 0; p < 7; p++) {
                  const spd = Math.random() * 3.5 + 1.5;
                  const ang = Math.random() * Math.PI * 2;
                  this.particles.push(new Particle(b.x, b.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#f97316', 3.5, 0.35));
                }
                const splashRad = 65;
                const splashDmg = Math.round(b.damage * 0.45);
                for (let oz = 0; oz < this.zombies.length; oz++) {
                  const otherZ = this.zombies[oz];
                  if (otherZ === zombie || otherZ.dead) continue;
                  if (Math.hypot(otherZ.x - b.x, otherZ.y - b.y) <= splashRad + otherZ.radius) {
                    const spAng = Math.atan2(otherZ.y - b.y, otherZ.x - b.x);
                    otherZ.takeDamage(splashDmg, spAng, 5, this, false, false);
                  }
                }
              }

              b.piercingLeft--;
              if (b.piercingLeft <= 0) {
                b.dead = true;
                break;
              }
            }
          }
        }

        if (b.dead) this.bullets.splice(i, 1);
      }

      // Update Grenades
      for (let i = this.grenades.length - 1; i >= 0; i--) {
        const g = this.grenades[i];
        g.update(dt, this);
        if (g.dead) this.grenades.splice(i, 1);
      }

      // Update Acid Projectiles
      for (let i = this.acidProjectiles.length - 1; i >= 0; i--) {
        const ap = this.acidProjectiles[i];
        ap.update(dt, this);
        if (ap.dead) this.acidProjectiles.splice(i, 1);
      }

      // Update Acid Puddles
      for (let i = this.acidPuddles.length - 1; i >= 0; i--) {
        const puddle = this.acidPuddles[i];
        puddle.update(dt, this);
        if (puddle.dead) this.acidPuddles.splice(i, 1);
      }

      // Update Zombies
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        z.update(dt, this.player, this.obstacles, this);
        if (z.dead) this.zombies.splice(i, 1);
      }

      // =========================================================================
      // RESOLVE PLAYER-ENEMY & ENEMY-ENEMY CIRCLE-CIRCLE SEPARATION
      // =========================================================================
      if (this.player && !this.player.dead) {
        resolvePlayerEnemyCollisions(this.player, this.zombies, this.obstacles);
        resolveZombieZombieCollisions(this.zombies, this.obstacles);
      }

      // Update Power-Ups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        pu.update(dt);
        if (Math.hypot(this.player.x - pu.x, this.player.y - pu.y) <= this.player.radius + pu.radius) {
          pu.dead = true;
          if (pu.type === 'medkit') this.player.addHealth(40);
          else if (pu.type === 'ammo_box') this.player.refillAmmo();
          else this.player.applyBuff(pu.type, 10);
        }
        if (pu.dead) this.powerups.splice(i, 1);
      }

      // Update Coin Pickups
      for (let i = this.coinPickups.length - 1; i >= 0; i--) {
        const cp = this.coinPickups[i];
        cp.update(dt, this.player, this);
        if (cp.dead) this.coinPickups.splice(i, 1);
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update(dt);
        if (p.dead) this.particles.splice(i, 1);
      }

      // Update Damage Numbers
      for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
        const d = this.damageNumbers[i];
        d.update(dt);
        if (d.dead) this.damageNumbers.splice(i, 1);
      }

      // Clean up dead destructible obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        if (this.obstacles[i].dead) {
          this.obstacles.splice(i, 1);
        }
      }

      // Update Wave Spawner & Objectives
      this.waveManager.update(dt);
      this.objectiveManager.update(dt);

      // Combo Decay
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
          const banner = document.getElementById('comboBanner');
          if (banner) banner.classList.add('hidden');
        }
      }

      if (this.hitMarkerTimer > 0) {
        this.hitMarkerTimer -= dt;
      }

      // Smooth Camera Tracking (accounting for worldScale)
      const scale = this.worldScale || 1.0;
      const viewW = (this.displayWidth || window.innerWidth) / scale;
      const viewH = (this.displayHeight || window.innerHeight) / scale;

      const targetCamX = this.player.x - (viewW / 2);
      const targetCamY = this.player.y - (viewH / 2);

      this.camera.x += (targetCamX - this.camera.x) * 0.12;
      this.camera.y += (targetCamY - this.camera.y) * 0.12;

      // Screen Shake
      if (this.screenShake > 0) {
        const sx = (Math.random() * 2 - 1) * this.screenShake;
        const sy = (Math.random() * 2 - 1) * this.screenShake;
        this.camera.x += sx;
        this.camera.y += sy;
        this.screenShake *= 0.88;
        if (this.screenShake < 0.4) this.screenShake = 0;
      }

      this.camera.x = Math.max(0, Math.min(MAP_WIDTH - viewW, this.camera.x));
      this.camera.y = Math.max(0, Math.min(MAP_HEIGHT - viewH, this.camera.y));
      this.updateAimAngle();

      this.renderRadar();
    }

    render() {
      const ctx = this.ctx;
      const width = this.displayWidth || window.innerWidth;
      const height = this.displayHeight || window.innerHeight;
      const scale = this.worldScale || 1.0;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(-this.camera.x, -this.camera.y);

      // 1. World Background & Grid
      this.renderWorldBackground(ctx);

      // 2. Blood Decals
      for (let i = 0; i < this.bloodDecals.length; i++) {
        this.bloodDecals[i].draw(ctx);
      }

      // 3. Acid Puddles
      for (let i = 0; i < this.acidPuddles.length; i++) {
        this.acidPuddles[i].draw(ctx);
      }

      // 4. Objective Landmarks
      this.objectiveManager.draw(ctx);

      // 5. Obstacles & Props
      for (let i = 0; i < this.obstacles.length; i++) {
        this.obstacles[i].draw(ctx);
      }

      // 6. Power-Ups & Coin Pickups
      for (let i = 0; i < this.powerups.length; i++) {
        this.powerups[i].draw(ctx);
      }
      for (let i = 0; i < this.coinPickups.length; i++) {
        this.coinPickups[i].draw(ctx);
      }

      // 7. Zombies
      for (let i = 0; i < this.zombies.length; i++) {
        this.zombies[i].draw(ctx);
      }

      // 8. Player
      if (this.player) {
        // Laser Sight Aiming Guide
        this.renderLaserSight(ctx);
        this.player.draw(ctx);
      }

      // 9. Bullets, Grenades & Acid Projectiles
      for (let i = 0; i < this.bullets.length; i++) {
        this.bullets[i].draw(ctx);
      }
      for (let i = 0; i < this.grenades.length; i++) {
        this.grenades[i].draw(ctx);
      }
      for (let i = 0; i < this.acidProjectiles.length; i++) {
        this.acidProjectiles[i].draw(ctx);
      }

      // 10. Particles
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].draw(ctx);
      }

      // 11. Floating Damage Numbers
      for (let i = 0; i < this.damageNumbers.length; i++) {
        this.damageNumbers[i].draw(ctx);
      }

      // 12. Atmospheric Flashlight
      if (this.settings.flashlight && this.player && !this.player.dead) {
        this.renderFlashlight(ctx);
      }

      ctx.restore();

      // 13. Screen-Space UI & Crosshair Overlay
      if (this.state === 'playing' && this.player && !this.isTouchUser) {
        this.renderCrosshair(ctx);
        this.objectiveManager.drawCompassArrow(ctx, width, height, this.camera.x, this.camera.y);
      }
    }

    renderLaserSight(ctx) {
      if (!this.player || this.player.dead) return;
      const barrelX = this.player.x + Math.cos(this.player.angle) * 26;
      const barrelY = this.player.y + Math.sin(this.player.angle) * 26;
      const curW = this.player.weapons[this.player.currentWeaponIndex];

      ctx.save();
      const isSniper = curW.key === 'sniper';
      ctx.strokeStyle = isSniper ? 'rgba(255, 0, 85, 0.45)' : 'rgba(255, 221, 89, 0.18)';
      ctx.lineWidth = isSniper ? 2 : 1;
      ctx.setLineDash(isSniper ? [] : [6, 8]);
      ctx.beginPath();
      ctx.moveTo(barrelX, barrelY);
      ctx.lineTo(this.worldMouseX, this.worldMouseY);
      ctx.stroke();
      ctx.restore();
    }

    renderCrosshair(ctx) {
      if (!this.mouseInside && !this.input.isShooting) return;

      const sx = this.canvasMouseX !== undefined ? this.canvasMouseX : (window.innerWidth / 2);
      const sy = this.canvasMouseY !== undefined ? this.canvasMouseY : (window.innerHeight / 2);
      const curW = this.player.weapons[this.player.currentWeaponIndex];
      const target = this.hoveredEnemy;
      const isTargeting = !!target;
      const isBoss = target && target.isBoss;

      const recoilBloom = Math.min(16, this.player.recoil * 1.5);
      const baseGap = (isTargeting ? 6 : 8) + recoilBloom;
      const lineLen = isTargeting ? 7 : 8;

      let themeColor = '#00d2ff';
      if (curW.key === 'sniper') themeColor = '#ff0055';
      else if (curW.key === 'shotgun') themeColor = '#ff9f43';
      else if (curW.key === 'grenade') themeColor = '#39ff14';
      if (curW.overheated) themeColor = '#ef4444';

      if (isTargeting) {
        themeColor = isBoss ? '#ef4444' : '#ff385c';
      }

      ctx.save();

      // Shadow / Halo for universal contrast against dark and bright backgrounds
      ctx.shadowColor = isTargeting ? 'rgba(255, 42, 68, 0.65)' : 'rgba(0, 210, 255, 0.45)';
      ctx.shadowBlur = isTargeting ? 8 : 4;

      // 1. Center Pip (Thin center dot with dark perimeter halo for visibility)
      const pipRadius = isTargeting ? 3 : 2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(sx, sy, pipRadius + 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(sx, sy, pipRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Four Crosshair Lines (--●--)
      // Dark outline pass for high contrast
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      // Top
      ctx.moveTo(sx, sy - baseGap - lineLen);
      ctx.lineTo(sx, sy - baseGap);
      // Bottom
      ctx.moveTo(sx, sy + baseGap);
      ctx.lineTo(sx, sy + baseGap + lineLen);
      // Left
      ctx.moveTo(sx - baseGap - lineLen, sy);
      ctx.lineTo(sx - baseGap, sy);
      // Right
      ctx.moveTo(sx + baseGap, sy);
      ctx.lineTo(sx + baseGap + lineLen, sy);
      ctx.stroke();

      // Bright inner stroke pass
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Top
      ctx.moveTo(sx, sy - baseGap - lineLen);
      ctx.lineTo(sx, sy - baseGap);
      // Bottom
      ctx.moveTo(sx, sy + baseGap);
      ctx.lineTo(sx, sy + baseGap + lineLen);
      // Left
      ctx.moveTo(sx - baseGap - lineLen, sy);
      ctx.lineTo(sx - baseGap, sy);
      // Right
      ctx.moveTo(sx + baseGap, sy);
      ctx.lineTo(sx + baseGap + lineLen, sy);
      ctx.stroke();

      // 3. Boss Target Lock Brackets [ ]
      if (isBoss) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        const bSize = 18;
        const bLen = 6;
        ctx.beginPath();
        // Top-Left corner
        ctx.moveTo(sx - bSize, sy - bSize + bLen);
        ctx.lineTo(sx - bSize, sy - bSize);
        ctx.lineTo(sx - bSize + bLen, sy - bSize);
        // Top-Right corner
        ctx.moveTo(sx + bSize - bLen, sy - bSize);
        ctx.lineTo(sx + bSize, sy - bSize);
        ctx.lineTo(sx + bSize, sy - bSize + bLen);
        // Bottom-Left corner
        ctx.moveTo(sx - bSize, sy + bSize - bLen);
        ctx.lineTo(sx - bSize, sy + bSize);
        ctx.lineTo(sx - bSize + bLen, sy + bSize);
        // Bottom-Right corner
        ctx.moveTo(sx + bSize - bLen, sy + bSize);
        ctx.lineTo(sx + bSize, sy + bSize);
        ctx.lineTo(sx + bSize, sy + bSize - bLen);
        ctx.stroke();
      }

      // 4. Hit Marker Tick (Instant hit confirmation)
      if (this.hitMarkerTimer > 0) {
        ctx.strokeStyle = this.hitMarkerIsKill ? '#ff1744' : (this.hitMarkerIsCrit ? '#ffb703' : '#ffffff');
        ctx.lineWidth = this.hitMarkerIsKill ? 2.6 : 2;
        const hd = this.hitMarkerIsKill ? 10 : 7;
        ctx.beginPath();
        ctx.moveTo(sx - hd, sy - hd);
        ctx.lineTo(sx + hd, sy + hd);
        ctx.moveTo(sx + hd, sy - hd);
        ctx.lineTo(sx - hd, sy + hd);
        ctx.stroke();
      }

      ctx.restore();
    }

    renderWorldBackground(ctx) {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // Road Grid
      ctx.strokeStyle = '#182030';
      ctx.lineWidth = 2;
      const gridSize = 140;

      ctx.beginPath();
      for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
      }
      for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
      }
      ctx.stroke();

      // Yellow Center Avenue Lines
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(0, 1400);
      ctx.lineTo(MAP_WIDTH, 1400);
      ctx.moveTo(1400, 0);
      ctx.lineTo(1400, MAP_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    renderFlashlight(ctx) {
      const p = this.player;
      const camX = this.camera.x;
      const camY = this.camera.y;
      const scale = this.worldScale || 1.0;
      const w = Math.ceil((this.displayWidth || window.innerWidth) / scale);
      const h = Math.ceil((this.displayHeight || window.innerHeight) / scale);

      ctx.save();
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mCtx = maskCanvas.getContext('2d');

      mCtx.fillStyle = 'rgba(5, 7, 12, 0.88)';
      mCtx.fillRect(0, 0, w, h);

      mCtx.globalCompositeOperation = 'destination-out';

      const px = p.x - camX;
      const py = p.y - camY;

      // Ambient circle around player
      const ambientGrad = mCtx.createRadialGradient(px, py, 10, px, py, 105);
      ambientGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mCtx.fillStyle = ambientGrad;
      mCtx.beginPath();
      mCtx.arc(px, py, 105, 0, Math.PI * 2);
      mCtx.fill();

      // Directional Flashlight Cone (Enhanced by tactical flashlight attachment if owned)
      const hasTacticalLight = !!(p.equipment && p.equipment.flashlight);
      const coneLength = hasTacticalLight ? 660 : 520;
      const coneAngle = hasTacticalLight ? 0.95 : 0.65;
      mCtx.beginPath();
      mCtx.moveTo(px, py);
      mCtx.arc(px, py, coneLength, p.angle - coneAngle / 2, p.angle + coneAngle / 2);
      mCtx.closePath();

      const coneGrad = mCtx.createRadialGradient(px, py, 40, px, py, coneLength);
      coneGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      coneGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
      coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mCtx.fillStyle = coneGrad;
      mCtx.fill();

      ctx.drawImage(maskCanvas, camX, camY);
      ctx.restore();
    }

    renderRadar() {
      if (!this.radarCtx || !this.player) return;
      const rCtx = this.radarCtx;
      const size = 90;
      rCtx.clearRect(0, 0, size, size);

      rCtx.fillStyle = 'rgba(8, 12, 20, 0.95)';
      rCtx.fillRect(0, 0, size, size);

      rCtx.strokeStyle = 'rgba(0, 210, 255, 0.22)';
      rCtx.lineWidth = 1;
      rCtx.beginPath();
      rCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      rCtx.moveTo(size / 2, 0);
      rCtx.lineTo(size / 2, size);
      rCtx.moveTo(0, size / 2);
      rCtx.lineTo(size, size / 2);
      rCtx.stroke();

      const scale = size / MAP_WIDTH;

      // Obstacles
      rCtx.fillStyle = '#253347';
      this.obstacles.forEach(ob => {
        rCtx.fillRect(ob.x * scale, ob.y * scale, Math.max(2, ob.w * scale), Math.max(2, ob.h * scale));
      });

      // Objective indicator
      if (this.objectiveManager.active) {
        rCtx.fillStyle = '#ffca28';
        rCtx.beginPath();
        rCtx.arc(this.objectiveManager.targetX * scale, this.objectiveManager.targetY * scale, 3.5, 0, Math.PI * 2);
        rCtx.fill();
      }

      // Zombies
      rCtx.fillStyle = '#ff2a44';
      this.zombies.forEach(z => {
        rCtx.beginPath();
        rCtx.arc(z.x * scale, z.y * scale, z.isBoss ? 3.5 : 1.5, 0, Math.PI * 2);
        rCtx.fill();
      });

      // Player
      rCtx.fillStyle = '#00f0ff';
      rCtx.beginPath();
      rCtx.arc(this.player.x * scale, this.player.y * scale, 2.5, 0, Math.PI * 2);
      rCtx.fill();
    }
  }

  // Expose Game on window for accessibility & testing
  window.Game = Game;

  // Launch Game Engine when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
  });

})();
