// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg(
    '<path d="M4 4h7v7H4z"/>' +
      '<path d="M11 7.5h5"/>' +
      '<path d="M16 4v16" stroke-dasharray="2.6 2.2"/>' +
      '<path d="M7.5 11v5"/>' +
      '<path d="M4 16h16v4H4z"/>',
  ),
  copy: svg(
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' + '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  ),
  check: svg('<path d="m5 13 4.5 4.5L19 7"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  theme: svg(
    '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>',
  ),
  link: svg(
    '<path d="M9.5 14.5 14.5 9.5"/>' +
      '<path d="M8 11 6 13a3.5 3.5 0 0 0 5 5l2-2"/>' +
      '<path d="M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>',
  ),
  image: svg(
    '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
      '<circle cx="8.5" cy="9.5" r="1.5"/>' +
      '<path d="m4 18 4.5-4.5L12 17l3-3 5 5"/>',
  ),
} as const;
