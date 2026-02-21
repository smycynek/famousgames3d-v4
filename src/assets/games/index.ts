import { parse } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';

export interface ParsedGame {
  name: string;
  pgn: string;
  parsed: ParseTree[];
}

// Parse PGN files at build time
export function parseGame(name: string, pgnContent: string): ParsedGame {
  const parsed = parse(pgnContent, { startRule: 'games' }) as ParseTree[];
  return {
    name,
    pgn: pgnContent,
    parsed,
  };
}

// Dynamically import all .pgn files from this directory
const pgnModules = import.meta.glob('./*.pgn', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// Export parsed games
export const games: ParsedGame[] = Object.entries(pgnModules).map(([path, content]) => {
  const name = path.replace('./', '').replace('.pgn', '');
  return parseGame(name, content);
});

// Get a game by name
export function getGame(name: string): ParsedGame | undefined {
  return games.find((g) => g.name === name);
}

// Get all game names
export function getGameNames(): string[] {
  return games.map((g) => g.name);
}
