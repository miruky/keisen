import { describe, expect, it } from 'vitest';
import { colorizeSvg, textToSvg } from './svgconv';

describe('textToSvg', () => {
  it('罫線文字を線として引き、グリフを置かない', () => {
    const svg = textToSvg('─', { cellWidth: 10, cellHeight: 20 });
    // 1セル幅なので中央(5,10)から左右の端(0と10)へ
    expect(svg).toContain('M 5 10 H 0');
    expect(svg).toContain('M 5 10 H 10');
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
    // 3列×幅10、3行×高さ20。固有サイズもviewBoxと一致する
    expect(svg).toContain('viewBox="0 0 30 60"');
    expect(svg).toContain('width="30" height="60"');
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

  it('角丸コーナーは直線でなく弧でつなぐ', () => {
    const svg = textToSvg('╭', { cellWidth: 10, cellHeight: 20 });
    // 右端からのアプローチ、四半円の弧、下端への接続
    expect(svg).toContain('A 4.5 4.5 0 0 1');
    expect(svg).not.toContain('<text');
  });

  it('線の太さ倍率で全体のstroke-widthが変わる', () => {
    const svg = textToSvg('─━', { strokeScale: 2 });
    // light 1.5*2=3、heavy 3.4*2=6.8
    expect(svg).toContain('stroke-width="3"');
    expect(svg).toContain('stroke-width="6.8"');
  });
});

describe('colorizeSvg', () => {
  it('currentColorを実際の色に固定する', () => {
    const svg = textToSvg('─A');
    const fixed = colorizeSvg(svg, '#202020');
    expect(fixed).not.toContain('currentColor');
    expect(fixed).toContain('stroke="#202020"');
    expect(fixed).toContain('fill="#202020"');
  });

  it('currentColorを含まないSVGはそのまま返す', () => {
    expect(colorizeSvg('<svg fill="#000"></svg>', '#fff')).toBe('<svg fill="#000"></svg>');
  });
});
