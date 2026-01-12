// テーマ設定の解決ロジック。DOMには触れず、保存値の検証・自動解決・巡回だけを
// 純粋に扱う。data-theme属性の付け替えはmain側、描画前の初期適用はindex.htmlが担う。

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'keisen.theme.v1';

const ORDER: ThemePref[] = ['system', 'light', 'dark'];

export const PREF_LABEL: Record<ThemePref, string> = {
  system: '自動',
  light: 'ライト',
  dark: 'ダーク',
};

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readPref(getItem: (key: string) => string | null): ThemePref {
  const stored = getItem(THEME_KEY);
  return isThemePref(stored) ? stored : 'system';
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemDark ? 'dark' : 'light';
  return pref;
}

export function nextPref(pref: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length] as ThemePref;
}
