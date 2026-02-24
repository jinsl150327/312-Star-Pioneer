/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Shield, 
  Zap, 
  Heart, 
  Info,
  Keyboard,
  MousePointer2,
  Target,
  Skull
} from 'lucide-react';
import { GameState, Achievement, PlayerStats, EnemyType } from './types';

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 900;
const PLAYER_SIZE = 50; // 稍微调大一点以适应图片
const BULLET_SPEED = 7;
const INITIAL_LIVES = 3;
const INVINCIBILITY_DURATION = 2000;

// --- 资源路径配置 (你可以在本地替换这些路径) ---
const ASSETS = {
  PLAYER: '/assets/player.png',
  ENEMY_BASIC: '/assets/enemy_basic.png',
  ENEMY_FAST: '/assets/enemy_fast.png',
  ENEMY_HEAVY: '/assets/enemy_heavy.png',
  POWERUP_TRIPLE: '/assets/powerup_triple.png',
  POWERUP_SHIELD: '/assets/powerup_shield.png',
};

// --- Game Engine Classes ---
class Bullet {
  x: number;
  y: number;
  radius: number = 3;
  color: string;
  speed: number;
  angle: number;

  constructor(x: number, y: number, angle: number = -Math.PI / 2, color: string = '#00f2ff') {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.speed = BULLET_SPEED;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = Math.random() * 30 + 20;
    this.life = this.maxLife;
    this.color = color;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const opacity = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  type: EnemyType;
  health: number;
  speed: number;
  color: string;
  points: number;
  image: HTMLImageElement | null;

  constructor(x: number, type: EnemyType, level: number, images?: { [key: string]: HTMLImageElement }) {
    this.x = x;
    this.y = -50;
    this.type = type;
    this.image = null;
    
    switch (type) {
      case 'FAST':
        this.width = 40;
        this.height = 40;
        this.speed = 4 + (level * 0.2);
        this.health = 1;
        this.color = '#ff00ff';
        this.points = 150;
        if (images?.ENEMY_FAST) this.image = images.ENEMY_FAST;
        break;
      case 'HEAVY':
        this.width = 80;
        this.height = 70;
        this.speed = 1.5 + (level * 0.1);
        this.health = 3 + Math.floor(level / 2);
        this.color = '#bc13fe';
        this.points = 300;
        if (images?.ENEMY_HEAVY) this.image = images.ENEMY_HEAVY;
        break;
      default:
        this.width = 50;
        this.height = 50;
        this.speed = 2.5 + (level * 0.15);
        this.health = 1;
        this.color = '#ff4444';
        this.points = 100;
        if (images?.ENEMY_BASIC) this.image = images.ENEMY_BASIC;
    }
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.image && this.image.complete) {
      // 如果图片加载成功，绘制图片
      ctx.drawImage(this.image, 0, 0, this.width, this.height);
    } else {
      // 备用方案：绘制矢量图形
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      if (this.type === 'FAST') {
        ctx.moveTo(0, this.height);
        ctx.lineTo(this.width / 2, 0);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(this.width / 2, this.height * 0.7);
      } else if (this.type === 'HEAVY') {
        ctx.rect(0, 0, this.width, this.height * 0.6);
        ctx.rect(this.width * 0.2, this.height * 0.6, this.width * 0.6, this.height * 0.4);
      } else {
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width, 0);
        ctx.lineTo(this.width / 2, this.height);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // Health bar for heavy
    if (this.type === 'HEAVY' && this.health > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(0, -10, this.width, 4);
      ctx.fillStyle = '#00ff00';
      const maxHealth = 3 + Math.floor(this.health / 2); // Simplified for display
      ctx.fillRect(0, -10, (this.health / 5) * this.width, 4); 
    }

    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  width: number = 30;
  height: number = 30;
  type: 'TRIPLE_SHOT' | 'SHIELD';
  speed: number = 2;
  color: string;

  constructor(x: number, type: 'TRIPLE_SHOT' | 'SHIELD') {
    this.x = x;
    this.y = -50;
    this.type = type;
    this.color = type === 'TRIPLE_SHOT' ? '#00f2ff' : '#bc13fe';
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    
    // Draw Hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = (this.width / 2) * Math.cos(angle) + this.width / 2;
      const py = (this.height / 2) * Math.sin(angle) + this.height / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Icon inside
    ctx.fillStyle = this.color;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type === 'TRIPLE_SHOT' ? '⚡' : '🛡️', this.width / 2, this.height / 2);
    
    ctx.restore();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    level: 1,
    lives: INITIAL_LIVES,
    highScore: parseInt(localStorage.getItem('tina_highscore') || '0'),
    enemiesDestroyed: 0,
    powerupsCollected: 0
  });
  
  // 图片资源引用
  const gameImages = useRef<{ [key: string]: HTMLImageElement }>({});

  // --- 预加载图片 ---
  useEffect(() => {
    const loadImages = () => {
      Object.entries(ASSETS).forEach(([key, src]) => {
        const img = new Image();
        img.src = src;
        gameImages.current[key] = img;
      });
    };
    loadImages();
  }, []);
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_blood', title: '第一滴血', description: '摧毁第一架敌机', icon: 'Target', unlocked: false },
    { id: 'survivor', title: '生存者', description: '达到第5关', icon: 'Shield', unlocked: false },
    { id: 'ace', title: '王牌飞行员', description: '摧毁100架敌机', icon: 'Trophy', unlocked: false },
    { id: 'power_up', title: '全副武装', description: '收集5个道具', icon: 'Zap', unlocked: false },
    { id: 'unbeatable', title: '不可阻挡', description: '分数超过10000', icon: 'Skull', unlocked: false },
  ]);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Game state refs for the loop
  const playerPos = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const powerups = useRef<PowerUp[]>([]);
  const particles = useRef<Particle[]>([]);
  const lastShotTime = useRef(0);
  const lastEnemySpawn = useRef(0);
  const lastPowerUpSpawn = useRef(0);
  const invincibilityTimer = useRef(0);
  const activePowerups = useRef<{ TRIPLE_SHOT: number; SHIELD: number }>({ TRIPLE_SHOT: 0, SHIELD: 0 });
  const frameId = useRef<number>(0);
  
  // Use refs for stats to avoid re-creating the loop on every state change
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- Initialization ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Achievement Logic ---
  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === id);
      if (achievement && !achievement.unlocked) {
        setUnlockedAchievement(achievement);
        setTimeout(() => setUnlockedAchievement(null), 3000);
        return prev.map(a => a.id === id ? { ...a, unlocked: true } : a);
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (stats.enemiesDestroyed >= 1) unlockAchievement('first_blood');
    if (stats.level >= 5) unlockAchievement('survivor');
    if (stats.enemiesDestroyed >= 100) unlockAchievement('ace');
    if (stats.powerupsCollected >= 5) unlockAchievement('power_up');
    if (stats.score >= 10000) unlockAchievement('unbeatable');
  }, [stats.enemiesDestroyed, stats.level, stats.powerupsCollected, stats.score, unlockAchievement]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyP' && gameState === 'PLAYING') setGameState('PAUSED');
      else if (e.code === 'KeyP' && gameState === 'PAUSED') setGameState('PLAYING');
    };
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    playerPos.current = {
      x: (clientX - rect.left) * scaleX - PLAYER_SIZE / 2,
      y: (clientY - rect.top) * scaleY - PLAYER_SIZE / 2
    };
  };

  // --- Game Loop ---
  const update = useCallback((time: number) => {
    if (gameStateRef.current !== 'PLAYING') {
      frameId.current = requestAnimationFrame(update);
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      frameId.current = requestAnimationFrame(update);
      return;
    }

    // 1. Move Player (Keyboard)
    const speed = 6;
    if (keys.current['ArrowLeft'] || keys.current['KeyA']) playerPos.current.x -= speed;
    if (keys.current['ArrowRight'] || keys.current['KeyD']) playerPos.current.x += speed;
    if (keys.current['ArrowUp'] || keys.current['KeyW']) playerPos.current.y -= speed;
    if (keys.current['ArrowDown'] || keys.current['KeyS']) playerPos.current.y += speed;

    // Boundaries
    playerPos.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerPos.current.x));
    playerPos.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, playerPos.current.y));

    // 2. Shooting
    const now = performance.now();
    const fireRate = 150;
    if ((keys.current['Space'] || keys.current['MouseDown']) && now - lastShotTime.current > fireRate) {
      const centerX = playerPos.current.x + PLAYER_SIZE / 2;
      const centerY = playerPos.current.y;
      
      if (activePowerups.current.TRIPLE_SHOT > now) {
        bullets.current.push(new Bullet(centerX, centerY, -Math.PI / 2));
        bullets.current.push(new Bullet(centerX, centerY, -Math.PI / 2 - 0.2));
        bullets.current.push(new Bullet(centerX, centerY, -Math.PI / 2 + 0.2));
      } else {
        bullets.current.push(new Bullet(centerX, centerY));
      }
      lastShotTime.current = now;
    }

    // 3. Spawning
    const spawnRate = Math.max(500, 2000 - (statsRef.current.level * 150));
    if (now - lastEnemySpawn.current > spawnRate) {
      const x = Math.random() * (CANVAS_WIDTH - 60);
      let type: EnemyType = 'BASIC';
      const rand = Math.random();
      if (rand > 0.85) type = 'HEAVY';
      else if (rand > 0.65) type = 'FAST';
      
      enemies.current.push(new Enemy(x, type, statsRef.current.level, gameImages.current));
      lastEnemySpawn.current = now;
    }

    if (now - lastPowerUpSpawn.current > 15000) {
      const x = Math.random() * (CANVAS_WIDTH - 30);
      const type = Math.random() > 0.5 ? 'TRIPLE_SHOT' : 'SHIELD';
      powerups.current.push(new PowerUp(x, type));
      lastPowerUpSpawn.current = now;
    }

    // 4. Update Entities
    bullets.current.forEach((b, i) => {
      b.update();
      if (b.y < -10) bullets.current.splice(i, 1);
    });

    enemies.current.forEach((e, i) => {
      e.update();
      if (e.y > CANVAS_HEIGHT) {
        enemies.current.splice(i, 1);
        setStats(s => ({ ...s, score: Math.max(0, s.score - 50) })); // Penalty for escape
      }
    });

    powerups.current.forEach((p, i) => {
      p.update();
      if (p.y > CANVAS_HEIGHT) powerups.current.splice(i, 1);
    });

    particles.current.forEach((p, i) => {
      p.update();
      if (p.life <= 0) particles.current.splice(i, 1);
    });

    // 5. Collision Detection
    enemies.current.forEach((enemy, ei) => {
      // Bullet vs Enemy
      bullets.current.forEach((bullet, bi) => {
        if (
          bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
          bullet.y > enemy.y && bullet.y < enemy.y + enemy.height
        ) {
          enemy.health--;
          bullets.current.splice(bi, 1);
          
          if (enemy.health <= 0) {
            // Explosion
            for (let k = 0; k < 15; k++) particles.current.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color));
            enemies.current.splice(ei, 1);
            setStats(s => ({ 
              ...s, 
              score: s.score + enemy.points,
              enemiesDestroyed: s.enemiesDestroyed + 1
            }));
          }
        }
      });

      // Player vs Enemy
      if (now > invincibilityTimer.current) {
        if (
          playerPos.current.x < enemy.x + enemy.width &&
          playerPos.current.x + PLAYER_SIZE > enemy.x &&
          playerPos.current.y < enemy.y + enemy.height &&
          playerPos.current.y + PLAYER_SIZE > enemy.y
        ) {
          if (activePowerups.current.SHIELD > now) {
            activePowerups.current.SHIELD = 0; // Shield used
            enemies.current.splice(ei, 1);
            for (let k = 0; k < 10; k++) particles.current.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#00f2ff'));
          } else {
            setStats(s => ({ ...s, lives: s.lives - 1 }));
            invincibilityTimer.current = now + INVINCIBILITY_DURATION;
            if (statsRef.current.lives <= 1) setGameState('GAMEOVER');
          }
        }
      }
    });

    // Player vs PowerUp
    powerups.current.forEach((p, pi) => {
      if (
        playerPos.current.x < p.x + p.width &&
        playerPos.current.x + PLAYER_SIZE > p.x &&
        playerPos.current.y < p.y + p.height &&
        playerPos.current.y + PLAYER_SIZE > p.y
      ) {
        activePowerups.current[p.type] = now + 8000;
        powerups.current.splice(pi, 1);
        setStats(s => ({ ...s, powerupsCollected: s.powerupsCollected + 1 }));
      }
    });

    // 6. Level Up
    if (statsRef.current.score >= statsRef.current.level * 2000) {
      setStats(s => ({ ...s, level: s.level + 1 }));
      enemies.current = []; // Clear screen on level up
    }

    // 7. Drawing
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * CANVAS_WIDTH;
      const y = ((time * 0.05 + i * 100) % CANVAS_HEIGHT);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Draw Entities
    bullets.current.forEach(b => b.draw(ctx));
    enemies.current.forEach(e => e.draw(ctx));
    powerups.current.forEach(p => p.draw(ctx));
    particles.current.forEach(p => p.draw(ctx));

    // Draw Player
    ctx.save();
    const isInvincible = now < invincibilityTimer.current;
    if (isInvincible && Math.floor(now / 100) % 2 === 0) ctx.globalAlpha = 0.3;
    
    ctx.translate(playerPos.current.x, playerPos.current.y);
    
    // Shield effect
    if (activePowerups.current.SHIELD > now) {
      ctx.beginPath();
      ctx.arc(PLAYER_SIZE/2, PLAYER_SIZE/2, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = '#bc13fe';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#bc13fe';
      ctx.stroke();
    }

    const playerImg = gameImages.current.PLAYER;
    if (playerImg && playerImg.complete) {
      // 绘制玩家图片
      ctx.drawImage(playerImg, 0, 0, PLAYER_SIZE, PLAYER_SIZE);
    } else {
      // 备用方案：绘制矢量战机
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f2ff';
      ctx.fillStyle = '#00f2ff';
      ctx.beginPath();
      ctx.moveTo(PLAYER_SIZE / 2, 0);
      ctx.lineTo(PLAYER_SIZE, PLAYER_SIZE);
      ctx.lineTo(PLAYER_SIZE / 2, PLAYER_SIZE * 0.8);
      ctx.lineTo(0, PLAYER_SIZE);
      ctx.closePath();
      ctx.fill();
    }

    // Thruster (始终保留喷火效果)
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.moveTo(PLAYER_SIZE * 0.3, PLAYER_SIZE * 0.8);
    ctx.lineTo(PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.8);
    ctx.lineTo(PLAYER_SIZE / 2, PLAYER_SIZE * (0.8 + Math.random() * 0.3));
    ctx.fill();

    ctx.restore();

    frameId.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    frameId.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId.current);
  }, [update]);

  // --- Game Controls ---
  const startGame = () => {
    setGameState('PLAYING');
    setStats({
      score: 0,
      level: 1,
      lives: INITIAL_LIVES,
      highScore: parseInt(localStorage.getItem('tina_highscore') || '0'),
      enemiesDestroyed: 0,
      powerupsCollected: 0
    });
    playerPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 };
    enemies.current = [];
    bullets.current = [];
    powerups.current = [];
    activePowerups.current = { TRIPLE_SHOT: 0, SHIELD: 0 };
  };

  const restartGame = () => {
    if (stats.score > stats.highScore) {
      localStorage.setItem('tina_highscore', stats.score.toString());
    }
    startGame();
  };

  // --- UI Components ---
  const AchievementToast = ({ achievement }: { achievement: Achievement }) => (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-full flex items-center gap-3 z-50 border-neon-blue/50"
    >
      <div className="bg-neon-blue/20 p-2 rounded-full text-neon-blue">
        <Trophy size={20} />
      </div>
      <div>
        <div className="text-xs text-neon-blue font-bold uppercase tracking-wider">成就解锁!</div>
        <div className="text-sm font-display font-bold">{achievement.title}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative w-full h-screen flex flex-col lg:flex-row items-center justify-center bg-space-dark overflow-hidden p-4 lg:p-8">
      
      {/* Sidebar - Desktop Only */}
      {!isMobile && (
        <div className="hidden lg:flex flex-col gap-6 w-80 mr-8 h-full py-4">
          <div className="glass-dark p-6 rounded-2xl">
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2 text-neon-blue">
              <Info size={20} /> 操作指南
            </h2>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">WASD</kbd> 移动战机
              </li>
              <li className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Space</kbd> 发射激光
              </li>
              <li className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">P</kbd> 暂停游戏
              </li>
              <li className="flex items-center gap-3">
                <MousePointer2 size={16} /> 拖拽或点击移动
              </li>
            </ul>
          </div>

          <div className="glass-dark p-6 rounded-2xl flex-1 overflow-y-auto">
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2 text-neon-purple">
              <Zap size={20} /> 道具说明
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center text-neon-blue border border-neon-blue/30 shrink-0">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm">三向子弹</div>
                  <div className="text-xs text-white/60">大幅增强火力，覆盖更广范围。</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center text-neon-purple border border-neon-purple/30 shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm">能量护盾</div>
                  <div className="text-xs text-white/60">抵御一次敌机撞击，保护战机。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="relative flex-1 max-w-[800px] aspect-[8/9] w-full glass-dark rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.1)]">
        
        {/* HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-display text-neon-blue uppercase tracking-widest opacity-70">Score</div>
              <div className="text-2xl font-display font-bold tabular-nums">{stats.score.toLocaleString()}</div>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                  <Heart 
                    key={i} 
                    size={18} 
                    className={i < stats.lives ? "text-red-500 fill-red-500" : "text-white/20"} 
                  />
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs font-display text-neon-purple uppercase tracking-widest opacity-70">Level</div>
              <div className="text-2xl font-display font-bold">{stats.level}</div>
              <button 
                onClick={() => setGameState('PAUSED')}
                className="mt-2 p-2 glass rounded-full pointer-events-auto hover:bg-white/20 transition-colors"
              >
                <Pause size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full cursor-none touch-none"
          onMouseMove={handleTouchMove}
          onTouchMove={handleTouchMove}
          onMouseDown={() => keys.current['MouseDown'] = true}
          onMouseUp={() => keys.current['MouseDown'] = false}
        />

        {/* Overlays */}
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-dark/80 backdrop-blur-sm p-8 text-center"
            >
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-5xl lg:text-7xl font-display font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-neon-blue drop-shadow-[0_0_20px_rgba(0,242,255,0.5)]"
              >
                TINA 星际先锋
              </motion.h1>
              <p className="text-white/60 mb-12 tracking-[0.3em] uppercase text-sm">Interstellar Pioneer</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-2xl">
                <div className="glass p-4 rounded-xl">
                  <Target className="mx-auto mb-2 text-neon-blue" />
                  <div className="text-xs font-bold text-white/40 uppercase mb-1">目标</div>
                  <div className="text-sm">摧毁敌机，保卫星系</div>
                </div>
                <div className="glass p-4 rounded-xl border-neon-purple/30">
                  <Zap className="mx-auto mb-2 text-neon-purple" />
                  <div className="text-xs font-bold text-white/40 uppercase mb-1">道具</div>
                  <div className="text-sm">收集能量，强化战力</div>
                </div>
                <div className="glass p-4 rounded-xl">
                  <Trophy className="mx-auto mb-2 text-yellow-500" />
                  <div className="text-xs font-bold text-white/40 uppercase mb-1">成就</div>
                  <div className="text-sm">挑战自我，解锁荣耀</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative px-12 py-4 bg-neon-blue text-space-dark font-display font-black text-xl rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,242,255,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Play fill="currentColor" size={20} /> 开始航行
                </span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20"></div>
              </button>
              
              <div className="mt-8 text-white/40 text-xs flex items-center gap-4">
                <span className="flex items-center gap-1"><Keyboard size={14} /> WASD / 方向键</span>
                <span className="flex items-center gap-1"><MousePointer2 size={14} /> 鼠标 / 触摸</span>
              </div>
            </motion.div>
          )}

          {gameState === 'PAUSED' && (
            <motion.div 
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-dark/60 backdrop-blur-md"
            >
              <h2 className="text-4xl font-display font-bold mb-8 text-neon-blue">游戏暂停</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => setGameState('PLAYING')}
                  className="px-8 py-3 glass rounded-full font-display font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
                >
                  <Play size={18} fill="currentColor" /> 继续
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="px-8 py-3 glass rounded-full font-display font-bold flex items-center gap-2 hover:bg-white/20 transition-all text-white/60"
                >
                  退出
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-dark/90 backdrop-blur-lg p-8"
            >
              <Skull size={64} className="text-red-500 mb-4 animate-pulse" />
              <h2 className="text-5xl font-display font-black mb-2 text-red-500">任务失败</h2>
              <p className="text-white/40 mb-8 uppercase tracking-widest">Mission Failed</p>
              
              <div className="glass-dark w-full max-w-md rounded-2xl p-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border-r border-white/10">
                    <div className="text-xs text-white/40 uppercase mb-1">最终得分</div>
                    <div className="text-3xl font-display font-bold text-neon-blue">{stats.score.toLocaleString()}</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-xs text-white/40 uppercase mb-1">最高纪录</div>
                    <div className="text-3xl font-display font-bold text-yellow-500">{Math.max(stats.score, stats.highScore).toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="text-xs text-white/40 uppercase mb-3 text-center">本次解锁成就</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {achievements.filter(a => a.unlocked).length > 0 ? (
                      achievements.filter(a => a.unlocked).map(a => (
                        <div key={a.id} className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold flex items-center gap-1 border border-white/10">
                          <Trophy size={10} className="text-yellow-500" /> {a.title}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-white/20 italic">暂无成就</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={restartGame}
                  className="px-10 py-4 bg-neon-blue text-space-dark font-display font-black rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                >
                  <RotateCcw size={20} /> 再次挑战
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="px-10 py-4 glass text-white font-display font-bold rounded-full flex items-center gap-2 hover:bg-white/20 transition-all"
                >
                  返回主页
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievement Popup */}
        <AnimatePresence>
          {unlockedAchievement && <AchievementToast achievement={unlockedAchievement} />}
        </AnimatePresence>
      </div>

      {/* Mobile Stats - Only Visible on Mobile */}
      {isMobile && gameState === 'PLAYING' && (
        <div className="mt-4 w-full flex justify-around items-center glass p-4 rounded-xl">
           <div className="text-center">
             <div className="text-[10px] text-white/40 uppercase">Enemies</div>
             <div className="font-display font-bold">{stats.enemiesDestroyed}</div>
           </div>
           <div className="text-center">
             <div className="text-[10px] text-white/40 uppercase">High Score</div>
             <div className="font-display font-bold text-yellow-500">{stats.highScore.toLocaleString()}</div>
           </div>
        </div>
      )}
    </div>
  );
}
