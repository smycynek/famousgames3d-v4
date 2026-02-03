import { parse } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';

// Import PGN files as raw text
import samplePgn from './sample.pgn?raw';
import sampleStdPgn from './sampleStd.pgn?raw';
import game1008361Pgn from './game_1008361.pgn?raw';
import game1044366Pgn from './game_1044366.pgn?raw';
import game1070917Pgn from './game_1070917.pgn?raw';

import game1011478 from './game_1011478.pgn?raw';
import game1019060 from './game_1019060.pgn?raw';
import game1031957 from './game_1031957.pgn?raw';
import game1233404 from './game_1233404.pgn?raw';

export interface ParsedGame {
  name: string;
  pgn: string;
  parsed: ParseTree[];
}

// Parse PGN files at build time
function parseGame(name: string, pgnContent: string): ParsedGame {
  const parsed = parse(pgnContent, { startRule: 'games' }) as ParseTree[];
  return {
    name,
    pgn: pgnContent,
    parsed,
  };
}

// Export parsed games
export const games: ParsedGame[] = [
  parseGame('game_1233404', game1233404),
  parseGame('game_1011478', game1011478),
  parseGame('game_1019060', game1019060),
  parseGame('game_1031957', game1031957),
  parseGame('game_1008361', game1008361Pgn),
  parseGame('game_1044366', game1044366Pgn),
  parseGame('game_1070917', game1070917Pgn),
  parseGame('sampleStd', sampleStdPgn),
  parseGame('sample', samplePgn),
];

// Get a game by name
export function getGame(name: string): ParsedGame | undefined {
  return games.find((g) => g.name === name);
}

// Get all game names
export function getGameNames(): string[] {
  return games.map((g) => g.name);
}
