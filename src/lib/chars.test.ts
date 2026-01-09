import { describe, expect, it } from 'vitest';
import { BOX_CHARS, charWidth, isBoxChar } from './chars';

describe('BOX_CHARS', () => {
  it('細線と太線の基本形が揃っている', () => {
    for (const ch of ['─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']) {
      expect(isBoxChar(ch)).toBe(true);
    }
    for (const ch of ['━', '┃', '┏', '┓', '┗', '┛', '╋']) {
      expect(isBoxChar(ch)).toBe(true);
    }
  });

  it('線分の向きが正しい', () => {
    expect(BOX_CHARS['┌']).toEqual({ up: null, down: 'light', left: null, right: 'light' });
    expect(BOX_CHARS['┘']).toEqual({ up: 'light', down: null, left: 'light', right: null });
    expect(BOX_CHARS['┼']).toEqual({ up: 'light', down: 'light', left: 'light', right: 'light' });
    expect(BOX_CHARS['┃']).toEqual({ up: 'heavy', down: 'heavy', left: null, right: null });
  });
});

describe('charWidth', () => {
  it('罫線文字と全角文字は2桁、半角は1桁', () => {
    expect(charWidth('─')).toBe(2);
    expect(charWidth('あ')).toBe(2);
    expect(charWidth('漢')).toBe(2);
    expect(charWidth('A')).toBe(1);
    expect(charWidth(' ')).toBe(1);
    expect(charWidth('|')).toBe(1);
  });
});
