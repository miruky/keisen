// 罫線図のテキストをSVGへ変換する。罫線文字はグリフではなく本物の線として引き、
// 拡大しても太さの揃ったきれいな図になるようにする。それ以外の文字はtextで置く。

import { BOX_CHARS, charWidth } from './chars';

export interface ConvertOptions {
  /** 半角1桁ぶんの幅(px相当の座標単位) */
  cellWidth?: number;
  /** 1行の高さ */
  cellHeight?: number;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const fmt = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * テキスト全体をviewBox付きSVGにする。線・文字ともcurrentColorで描くので、
 * 埋め込み先のテーマにそのまま追従する。
 */
export function textToSvg(text: string, options: ConvertOptions = {}): string {
  const cw = options.cellWidth ?? 10;
  const ch = options.cellHeight ?? 20;
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const lightPath: string[] = [];
  const heavyPath: string[] = [];
  const texts: string[] = [];
  let maxCols = 1;

  for (let row = 0; row < lines.length; row += 1) {
    const line = lines[row] ?? '';
    let col = 0;
    for (const charRaw of [...line]) {
      const width = charWidth(charRaw);
      const segments = BOX_CHARS[charRaw];
      const cx = (col + width / 2) * cw;
      const cy = (row + 0.5) * ch;
      if (segments) {
        const target = (weight: 'light' | 'heavy'): string[] =>
          weight === 'light' ? lightPath : heavyPath;
        if (segments.up) target(segments.up).push(`M ${fmt(cx)} ${fmt(cy)} V ${fmt(row * ch)}`);
        if (segments.down) {
          target(segments.down).push(`M ${fmt(cx)} ${fmt(cy)} V ${fmt((row + 1) * ch)}`);
        }
        if (segments.left) target(segments.left).push(`M ${fmt(cx)} ${fmt(cy)} H ${fmt(col * cw)}`);
        if (segments.right) {
          target(segments.right).push(`M ${fmt(cx)} ${fmt(cy)} H ${fmt((col + width) * cw)}`);
        }
      } else if (charRaw !== ' ' && charRaw !== '　') {
        texts.push(
          `  <text x="${fmt(cx)}" y="${fmt(cy)}" text-anchor="middle" dominant-baseline="central">${esc(charRaw)}</text>`,
        );
      }
      col += width;
    }
    maxCols = Math.max(maxCols, col);
  }

  const width = maxCols * cw;
  const height = Math.max(1, lines.length) * ch;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" role="img" aria-label="罫線図">`,
    `  <g fill="currentColor" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="${fmt(ch * 0.7)}">`,
  ];
  parts.push(...texts);
  parts.push(`  </g>`);
  if (lightPath.length > 0) {
    parts.push(
      `  <path d="${lightPath.join(' ')}" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>`,
    );
  }
  if (heavyPath.length > 0) {
    parts.push(
      `  <path d="${heavyPath.join(' ')}" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="square"/>`,
    );
  }
  parts.push(`</svg>`);
  return parts.join('\n');
}
