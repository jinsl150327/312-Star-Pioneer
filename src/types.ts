import { LucideIcon } from 'lucide-react';

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface PlayerStats {
  score: number;
  level: number;
  lives: number;
  highScore: number;
  enemiesDestroyed: number;
  powerupsCollected: number;
}

export type EnemyType = 'BASIC' | 'FAST' | 'HEAVY';

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  width: number;
  height: number;
  speed: number;
}

export interface PowerUpType {
  id: 'TRIPLE_SHOT' | 'SHIELD';
  color: string;
  duration: number;
}
