import type { LoadedTextures } from '../materials';
import * as THREE from 'three';

// Layout constants shared with Chessboard.tsx
export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 1;
export const SQUARE_HEIGHT = 0.1;
export const BASE_HEIGHT = 0.4;
export const MARGIN = 0.6;
export const BEVEL_SIZE = 0.35;
export const TABLE_HEIGHT = BASE_HEIGHT * 5;

// Derived layout constants
export const BOARD_CENTER = (BOARD_SIZE * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
export const TABLE_TOP_Y = -SQUARE_HEIGHT / 2 - BASE_HEIGHT - BEVEL_SIZE * 2;
export const WHITE_CHAIR_Z = (BOARD_SIZE - 1) * SQUARE_SIZE + SQUARE_SIZE / 2 + MARGIN + 3.5;
export const BLACK_CHAIR_Z = -SQUARE_SIZE / 2 - MARGIN - 3.5;
export const SEAT_Y = TABLE_TOP_Y - 5.0;

export interface SceneBuilderParams {
  scene: THREE.Scene;
  loadedTextures: LoadedTextures;
}
