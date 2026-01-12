import { describe, expect, it } from 'vitest';
import { frameText, setCorners, setWeight } from './transform';

describe('setWeight', () => {
  it('細線の図を太線へ揃える', () => {
    expect(setWeight('┌─┐\n│ │\n└─┘', 'heavy')).toBe('┏━┓\n┃ ┃\n┗━┛');
  });

  it('太線の図を細線へ戻す', () => {
    expect(setWeight('┣━┫\n┳┻╋', 'light')).toBe('├─┤\n┬┴┼');
  });

  it('角丸は太線化で直角の太線コーナーになる', () => {
    expect(setWeight('╭─╮\n╰─╯', 'heavy')).toBe('┏━┓\n┗━┛');
  });

  it('罫線でない文字はそのまま残す', () => {
    expect(setWeight('A─B', 'heavy')).toBe('A━B');
    expect(setWeight('項目 ─', 'heavy')).toBe('項目 ━');
  });
});

describe('setCorners', () => {
  it('直角コーナーを角丸にする', () => {
    expect(setCorners('┌─┐\n└─┘', 'round')).toBe('╭─╮\n╰─╯');
  });

  it('角丸を直角に戻す', () => {
    expect(setCorners('╭─╮\n╰─╯', 'square')).toBe('┌─┐\n└─┘');
  });

  it('交点や直線には触れない', () => {
    expect(setCorners('├┼┤', 'round')).toBe('├┼┤');
  });
});

describe('frameText', () => {
  it('最長行に合わせた枠で囲う', () => {
    expect(frameText('abc\nde')).toBe(['┌─────┐', '│ abc │', '│ de  │', '└─────┘'].join('\n'));
  });

  it('全角文字は2桁ぶんとして枠幅を決める', () => {
    expect(frameText('林檎')).toBe(['┌──────┐', '│ 林檎 │', '└──────┘'].join('\n'));
  });

  it('末尾の空行は無視する', () => {
    expect(frameText('x\n\n')).toBe(['┌───┐', '│ x │', '└───┘'].join('\n'));
  });

  it('空入力には何も足さない', () => {
    expect(frameText('')).toBe('');
    expect(frameText('   \n  ')).toBe('   \n  ');
  });

  it('全角と半角が混じっても各行が枠の内側にそろう', () => {
    const framed = frameText('あい\nx');
    const rows = framed.split('\n');
    expect(rows[0]).toBe('┌──────┐');
    expect(rows[1]).toBe('│ あい │');
    expect(rows[2]).toBe('│ x    │');
    expect(rows[3]).toBe('└──────┘');
  });
});
