import { SQUARE_SIZE, BOARD_SIZE, TABLE_TOP_Y, BEVEL_SIZE } from './scene/sceneBuilder';

export function getGraveyardPosition(
  isBlack: boolean,
  captureIndex: number
): { x: number; y: number; z: number } {
  const sideX = isBlack
    ? -SQUARE_SIZE * 2.5 // Left side for captured black pieces
    : BOARD_SIZE * SQUARE_SIZE + SQUARE_SIZE * 1.5; // Right side for captured white pieces
  const row = captureIndex % 8; // Wrap around after 8 pieces
  const col = Math.floor(captureIndex / 8) * 1.0; // Stack in columns if more than 8
  const x = sideX - (isBlack ? col : -col);
  // Black pieces line up starting near rank 1 (white's side), white pieces near rank 8 (black's side)
  const z = isBlack ? (BOARD_SIZE - 1 - row) * SQUARE_SIZE : row * SQUARE_SIZE;
  const y = TABLE_TOP_Y + BEVEL_SIZE; // Rest on the table

  return { x, y, z };
}
