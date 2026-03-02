import * as THREE from 'three';
import { SQUARE_SIZE, SQUARE_HEIGHT } from './scene/sceneBuilder';
import { createRandomizedPieceMaterial } from './materials';

export const PIECE_TYPES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as const;
export const PIECE_BASE_SIZE = SQUARE_SIZE * 0.96;
export const ANIMATION_DURATION = 1.0; // seconds
export const KNIGHT_HOP_HEIGHT = 1.5; // how high knights jump

export type PieceType = (typeof PIECE_TYPES)[number];
export type PieceModels = Record<PieceType, THREE.Group>;

export interface PieceInfo {
  mesh: THREE.Group;
  type: PieceType;
  isBlack: boolean;
}

// Pre-computed piece scale factors
export const PIECE_SCALES: Record<PieceType, number> = {
  queen: 1.73,
  king: 1.81,
  bishop: 1.55,
  knight: 1.18,
  pawn: 0.96,
  rook: 1.1,
};

// Map chess.js piece types to our piece types
export const PIECE_TYPE_MAP: Record<string, PieceType> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

export function scalePieceToFit(model: THREE.Group, targetBaseSize: number): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Use the larger of X or Z as the base diameter
  const currentBaseSize = Math.max(size.x, size.z);
  const scale = targetBaseSize / currentBaseSize;

  model.scale.set(scale, scale, scale);
}

export function createPieceInstance(
  model: THREE.Group,
  color: number,
  scale: number = 1,
  texture?: THREE.Texture
): THREE.Group {
  const clone = model.clone();
  const material = createRandomizedPieceMaterial(color, texture);

  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  if (scale !== 1) {
    clone.scale.multiplyScalar(scale);
  }

  return clone;
}

export function placePiece(
  piece: THREE.Group,
  col: number,
  row: number,
  scene: THREE.Scene,
  isBlack: boolean
): void {
  // Position piece at center of square, on top of the board
  piece.position.set(col * SQUARE_SIZE, SQUARE_HEIGHT / 2, row * SQUARE_SIZE);

  // Rotate all pieces 90 degrees on Z axis and X axis
  piece.rotation.z = Math.PI / 2;
  piece.rotation.x = isBlack ? Math.PI / 2 : Math.PI / 2 + Math.PI;

  // Rotate black pieces to face the other direction
  if (isBlack) {
    piece.rotation.y = Math.PI;
  }

  scene.add(piece);
}

// Helper to convert col/row to square name (e.g., 0,7 -> "a1")
export function toSquareName(col: number, row: number): string {
  const file = String.fromCharCode(97 + col); // 'a' to 'h'
  const rank = 8 - row; // row 0 = rank 8, row 7 = rank 1
  return `${file}${rank}`;
}

// Helper to convert square name to col/row
export function fromSquareName(square: string): { col: number; row: number } {
  const col = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]);
  const row = 8 - rank;
  return { col, row };
}
