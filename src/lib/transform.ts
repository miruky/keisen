// 図そのものを書き換える整形。線の太さ・角の形・外枠を、罫線文字の置換と
// 行単位の組み直しだけで実現する。DOMには触れず、本文(string)を受け取って
// 本文を返す純粋な関数にし、そのまま単体テストできるようにする。

import { charWidth } from './chars';

/** 細線 -> 太線。角丸は対応する太線の直角コーナーへ倒す */
const TO_HEAVY: Record<string, string> = {
  '─': '━',
  '│': '┃',
  '┌': '┏',
  '┐': '┓',
  '└': '┗',
  '┘': '┛',
  '├': '┣',
  '┤': '┫',
  '┬': '┳',
  '┴': '┻',
  '┼': '╋',
  '╭': '┏',
  '╮': '┓',
  '╰': '┗',
  '╯': '┛',
};

/** 太線 -> 細線。角丸は細線側なのでそのまま残す */
const TO_LIGHT: Record<string, string> = {
  '━': '─',
  '┃': '│',
  '┏': '┌',
  '┓': '┐',
  '┗': '└',
  '┛': '┘',
  '┣': '├',
  '┫': '┤',
  '┳': '┬',
  '┻': '┴',
  '╋': '┼',
};

const TO_ROUND: Record<string, string> = { '┌': '╭', '┐': '╮', '└': '╰', '┘': '╯' };
const TO_SQUARE: Record<string, string> = { '╭': '┌', '╮': '┐', '╰': '└', '╯': '┘' };

export type Weight = 'light' | 'heavy';
export type Corner = 'round' | 'square';

function mapChars(text: string, table: Record<string, string>): string {
  let out = '';
  for (const ch of text) out += table[ch] ?? ch;
  return out;
}

/** 図全体の罫線を細線または太線に揃える */
export function setWeight(text: string, weight: Weight): string {
  return mapChars(text, weight === 'heavy' ? TO_HEAVY : TO_LIGHT);
}

/**
 * 細線の直角コーナー(┌┐└┘)と角丸(╭╮╰╯)を相互に変換する。
 * 太線の角は角丸を持たないため、square指定でも太線はそのまま残す。
 */
export function setCorners(text: string, corner: Corner): string {
  return mapChars(text, corner === 'round' ? TO_ROUND : TO_SQUARE);
}

/** 行の表示幅(全角=2・半角=1・罫線=1)。空行は0 */
function displayWidth(line: string): number {
  let width = 0;
  for (const ch of line) width += charWidth(ch);
  return width;
}

/** 表示幅がwidthになるよう右側を半角空白で詰める */
function padTo(line: string, width: number): string {
  return line + ' '.repeat(Math.max(0, width - displayWidth(line)));
}

/**
 * 図全体を細線の枠で囲う。最も広い行に合わせて枠幅を決め、各行を左右1桁の
 * 余白とともに枠の内側へ収める。末尾の空行は無視し、空入力には何もしない。
 */
export function frameText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  while (lines.length > 0 && (lines.at(-1) ?? '').trim() === '') lines.pop();
  if (lines.length === 0) return text;

  const inner = Math.max(...lines.map(displayWidth));
  const bar = '─'.repeat(inner + 2);
  const body = lines.map((line) => `│ ${padTo(line, inner)} │`);
  return [`┌${bar}┐`, ...body, `└${bar}┘`].join('\n');
}
