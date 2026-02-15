import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { parse } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamesDir = path.join(__dirname, 'assets', 'games');

const pgnFiles = fs
  .readdirSync(gamesDir)
  .filter((f) => f.endsWith('.pgn'))
  .map((f) => ({ name: f, content: fs.readFileSync(path.join(gamesDir, f), 'utf-8') }));

describe('PGN games', () => {
  it.each(pgnFiles)('$name can be parsed', ({ content }) => {
    const parsed = parse(content, { startRule: 'games' }) as ParseTree[];
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].moves.length).toBeGreaterThan(0);
  });

  it.each(pgnFiles)('$name can be played through without error', ({ content }) => {
    const parsed = parse(content, { startRule: 'games' }) as ParseTree[];
    const moves = parsed[0].moves;

    const chess = new Chess();
    for (const move of moves) {
      const notation = move.notation?.notation;
      expect(notation).toBeTruthy();
      const result = chess.move(notation!);
      expect(result).not.toBeNull();
    }
  });

  it.each(pgnFiles)('$name has valid metadata tags', ({ content }) => {
    const parsed = parse(content, { startRule: 'games' }) as ParseTree[];
    const tags = parsed[0].tags;
    expect(tags).toBeDefined();
    expect(tags?.White).toBeTruthy();
    expect(tags?.Black).toBeTruthy();
    expect(tags?.Result).toMatch(/^(1-0|0-1|1\/2-1\/2|\*)$/);
  });
});
