// 罫線図のテキストをSVGへ変換する。罫線文字はグリフではなく本物の線として引き、
// 拡大しても太さの揃ったきれいな図になるようにする。それ以外の文字はtextで置く。

import { BOX_CHARS, charWidth } from './chars';

export interface ConvertOptions {
  /** 半角1桁ぶんの幅(px相当の座標単位) */
  cellWidth?: number;
  /** 1行の高さ */
  cellHeight?: number;
  /** 線の太さの倍率。細め・標準・太めの切替に使う */
  strokeScale?: number;
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
  const scale = options.strokeScale ?? 1;
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
        if (segments.rounded) {
          // 直交する2方向を、中央付近で四半円の弧につなぐ
          const r = Math.min(cw, ch) * 0.45;
          const hRight = segments.right !== null;
          const vDown = segments.down !== null;
          const hx = hRight ? (col + width) * cw : col * cw;
          const vy = vDown ? (row + 1) * ch : row * ch;
          const hApproach = cx + (hRight ? r : -r);
          const vApproach = cy + (vDown ? r : -r);
          const sweep = hRight === vDown ? 1 : 0;
          const weight = segments.down ?? segments.up ?? segments.left ?? segments.right ?? 'light';
          target(weight).push(
            `M ${fmt(hx)} ${fmt(cy)} H ${fmt(hApproach)} A ${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(cx)} ${fmt(vApproach)} V ${fmt(vy)}`,
          );
        } else {
          if (segments.up) target(segments.up).push(`M ${fmt(cx)} ${fmt(cy)} V ${fmt(row * ch)}`);
          if (segments.down) {
            target(segments.down).push(`M ${fmt(cx)} ${fmt(cy)} V ${fmt((row + 1) * ch)}`);
          }
          if (segments.left) {
            target(segments.left).push(`M ${fmt(cx)} ${fmt(cy)} H ${fmt(col * cw)}`);
          }
          if (segments.right) {
            target(segments.right).push(`M ${fmt(cx)} ${fmt(cy)} H ${fmt((col + width) * cw)}`);
          }
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
  // viewBoxに加えて固有サイズ(width/height)も持たせる。これがないと埋め込み先で
  // 既定の300x150に潰れて表示されるため、プレビューも書き出し先も実寸で描かれる。
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}" role="img" aria-label="罫線図">`,
    `  <g fill="currentColor" font-family="ui-monospace, 'SF Mono', Menlo, monospace" font-size="${fmt(ch * 0.7)}">`,
  ];
  parts.push(...texts);
  parts.push(`  </g>`);
  if (lightPath.length > 0) {
    parts.push(
      `  <path d="${lightPath.join(' ')}" stroke="currentColor" stroke-width="${fmt(1.5 * scale)}" fill="none" stroke-linecap="square"/>`,
    );
  }
  if (heavyPath.length > 0) {
    parts.push(
      `  <path d="${heavyPath.join(' ')}" stroke="currentColor" stroke-width="${fmt(3.4 * scale)}" fill="none" stroke-linecap="square"/>`,
    );
  }
  parts.push(`</svg>`);
  return parts.join('\n');
}

/**
 * SVG内のcurrentColorを実際の色に固定する。図はテーマ追従のためcurrentColorで
 * 描くが、PNGへラスタライズするときや単体の画像として配るときは色が定まっている
 * 必要があるため、書き出し直前に解決した文字色へ置き換える。
 */
export function colorizeSvg(svg: string, color: string): string {
  return svg.replace(/currentColor/g, color);
}
