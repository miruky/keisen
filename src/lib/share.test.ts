import { describe, expect, it } from 'vitest';
import { decodeDiagram, diagramFromHash, diagramToHash, encodeDiagram } from './share';

describe('encodeDiagram / decodeDiagram', () => {
  it('罫線文字と日本語を含む本文を往復できる', () => {
    const text = ['┌──────┐', '│ 見出し │', '└──────┘'].join('\n');
    expect(decodeDiagram(encodeDiagram(text))).toBe(text);
  });

  it('base64urlとして +/= を含まない', () => {
    const token = encodeDiagram('━┃┏┓┗┛→←↑↓ test'.repeat(4));
    expect(token).not.toMatch(/[+/=]/);
  });

  it('空文字や壊れた入力では null', () => {
    expect(decodeDiagram('')).toBeNull();
    expect(decodeDiagram('!!! not base64 !!!')).toBeNull();
  });
});

describe('diagramToHash / diagramFromHash', () => {
  it('ハッシュへ載せて取り出せる', () => {
    const text = '┌─┐\n│×│\n└─┘';
    const hash = diagramToHash(text);
    expect(hash.startsWith('#d=')).toBe(true);
    expect(diagramFromHash(hash)).toBe(text);
  });

  it('他のパラメータが混じっても拾える', () => {
    const hash = diagramToHash('箱');
    expect(diagramFromHash(`#foo=1&${hash.slice(1)}`)).toBe('箱');
  });

  it('該当が無ければ null', () => {
    expect(diagramFromHash('')).toBeNull();
    expect(diagramFromHash('#other=1')).toBeNull();
  });
});
