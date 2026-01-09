// 罫線文字の定義。各文字を「セル中央から上下左右へ伸びる線」の組として持ち、
// SVG変換はこの表だけを頼りに線を引く。

export type Weight = 'light' | 'heavy';

export interface Segments {
  up: Weight | null;
  down: Weight | null;
  left: Weight | null;
  right: Weight | null;
}

const seg = (
  up: Weight | null,
  down: Weight | null,
  left: Weight | null,
  right: Weight | null,
): Segments => ({ up, down, left, right });

const L = 'light';
const H = 'heavy';

/** 罫線文字 -> 線分。よく使う細線・太線をひと通り収める */
export const BOX_CHARS: Record<string, Segments> = {
  '─': seg(null, null, L, L),
  '│': seg(L, L, null, null),
  '┌': seg(null, L, null, L),
  '┐': seg(null, L, L, null),
  '└': seg(L, null, null, L),
  '┘': seg(L, null, L, null),
  '├': seg(L, L, null, L),
  '┤': seg(L, L, L, null),
  '┬': seg(null, L, L, L),
  '┴': seg(L, null, L, L),
  '┼': seg(L, L, L, L),
  '━': seg(null, null, H, H),
  '┃': seg(H, H, null, null),
  '┏': seg(null, H, null, H),
  '┓': seg(null, H, H, null),
  '┗': seg(H, null, null, H),
  '┛': seg(H, null, H, null),
  '┣': seg(H, H, null, H),
  '┫': seg(H, H, H, null),
  '┳': seg(null, H, H, H),
  '┻': seg(H, null, H, H),
  '╋': seg(H, H, H, H),
};

export function isBoxChar(ch: string): boolean {
  return ch in BOX_CHARS;
}

/**
 * 文字の表示幅。罫線文字と全角文字は2桁、それ以外は1桁として扱う。
 * 等幅フォントでの見た目に合わせた近似で、East Asian Widthの完全な実装ではない。
 */
export function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (isBoxChar(ch)) return 2;
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x3000 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33ff) ||
    code >= 0x20000
  ) {
    return 2;
  }
  return 1;
}
