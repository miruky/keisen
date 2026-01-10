import { describe, expect, it } from 'vitest';
import { textToSvg } from './svgconv';

describe('textToSvg', () => {
  it('罫線文字を線として引き、グリフを置かない', () => {
    const svg = textToSvg('─', { cellWidth: 10, cellHeight: 20 });
    // 中央(10,10)から左右へ
    expect(svg).toContain('M 10 10 H 0');
    expect(svg).toContain('M 10 10 H 20');
    expect(svg).not.toContain('<text');
  });

  it('細線と太線を別のパスに分け、太さを変える', () => {
    const svg = textToSvg('─━');
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toContain('stroke-width="3.4"');
  });

  it('普通の文字はtextとして中央に置く', () => {
    const svg = textToSvg('A');
    expect(svg).toContain('<text x="5" y="10"');
    expect(svg).toContain('>A</text>');
  });

  it('全角文字は2桁ぶん進む', () => {
    const svg = textToSvg('あB');
    // あ は中心x=10、Bは20〜30の中心25
    expect(svg).toContain('<text x="10" y="10"');
    expect(svg).toContain('<text x="25" y="10"');
  });

  it('空白は何も置かずに進める', () => {
    const svg = textToSvg('A B');
    expect(svg).toContain('<text x="5" y="10"');
    expect(svg).toContain('<text x="25" y="10"');
    expect(svg.match(/<text/g)).toHaveLength(2);
  });

  it('複数行で高さが増え、viewBoxが内容に合う', () => {
    const svg = textToSvg('┌─┐\n│A│\n└─┘');
    expect(svg).toContain('viewBox="0 0 60 60"');
  });

  it('XMLに危険な文字をエスケープする', () => {
    const svg = textToSvg('<&>');
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&gt;');
  });

  it('currentColorで描き、テーマに追従できる', () => {
    const svg = textToSvg('─A');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('fill="currentColor"');
  });
});
