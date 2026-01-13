// 画面の描画。テキストの編集ではプレビューだけを差し替え、textareaは
// 再生成しない(IMEの変換とキャレットを守るため)。図全体の整形(太線化・角丸・
// 枠囲い)は本文を作り直すので、そのときだけtextareaの値を入れ替える。

import { colorizeSvg, textToSvg, type ConvertOptions } from './lib/svgconv';
import { diagramFromHash, diagramToHash } from './lib/share';
import { frameText, setCorners, setWeight } from './lib/transform';
import { icons } from './icons';
import {
  nextPref,
  PREF_LABEL,
  readPref,
  resolveTheme,
  THEME_KEY,
  type ThemePref,
} from './lib/theme';

/** パレットに並べる罫線文字。行ごとにまとまりを持たせる */
const PALETTE_ROWS: string[][] = [
  ['─', '│', '┌', '┐', '└', '┘'],
  ['├', '┤', '┬', '┴', '┼'],
  ['╭', '╮', '╰', '╯', '→', '←', '↑', '↓'],
  ['━', '┃', '┏', '┓', '┗', '┛'],
  ['┣', '┫', '┳', '┻', '╋'],
];

/** 書き出しの見た目を決めるプリセット */
const WEIGHTS: Record<string, number> = { thin: 0.7, normal: 1, thick: 1.6 };
const SPACINGS: Record<string, [number, number]> = {
  compact: [8, 16],
  normal: [10, 20],
  wide: [13, 26],
};
const WEIGHT_LABEL: Record<string, string> = { thin: '細め', normal: '標準', thick: '太め' };
const SPACING_LABEL: Record<string, string> = { compact: '詰め', normal: '標準', wide: '広め' };
const OPTS_KEY = 'keisen.opts.v1';

/** 図全体を作り直す整形。ボタン1つにつき1つの純粋な変換を割り当てる */
const SHAPERS: { label: string; hint: string; apply: (text: string) => string }[] = [
  { label: '太線へ', hint: '罫線をすべて太線に揃える', apply: (t) => setWeight(t, 'heavy') },
  { label: '細線へ', hint: '罫線をすべて細線に揃える', apply: (t) => setWeight(t, 'light') },
  { label: '角丸', hint: '直角のコーナーを角丸にする', apply: (t) => setCorners(t, 'round') },
  { label: '直角', hint: '角丸のコーナーを直角に戻す', apply: (t) => setCorners(t, 'square') },
  { label: '枠で囲う', hint: '図全体を細線の枠で囲う', apply: frameText },
];

/** プレビューの表示倍率 */
type Zoom = 'fit' | '1' | '2';
const ZOOMS: { value: Zoom; label: string }[] = [
  { value: 'fit', label: 'フィット' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
];
const ZOOM_KEY = 'keisen.zoom.v1';

/** ラベル表からselectのoption列を作り、選択中の値にselectedを付ける */
function selectOptions(labels: Record<string, string>, selected: string): string {
  return Object.entries(labels)
    .map(
      ([value, label]) =>
        `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`,
    )
    .join('');
}

interface Template {
  name: string;
  text: string;
}

const TEMPLATES: Template[] = [
  {
    name: '箱',
    text: ['┌──────────┐', '│  みだし  │', '└──────────┘'].join('\n'),
  },
  {
    name: '表',
    text: [
      '┌──────┬──────┬──────┐',
      '│ 項目 │ 数量 │ 単位 │',
      '├──────┼──────┼──────┤',
      '│ 林檎 │  3   │  個  │',
      '│ 牛乳 │  1   │  本  │',
      '└──────┴──────┴──────┘',
    ].join('\n'),
  },
  {
    name: '流れ',
    text: [
      '┌──────┐    ┌──────┐    ┌──────┐',
      '│ 入力 │ ─→ │ 処理 │ ─→ │ 出力 │',
      '└──────┘    └──────┘    └──────┘',
    ].join('\n'),
  },
  {
    name: 'ツリー',
    text: ['src', '├─ main.ts', '├─ app.ts', '└─ lib', '   ├─ chars.ts', '   └─ svgconv.ts'].join(
      '\n',
    ),
  },
];

const STORAGE_KEY = 'keisen.text.v1';

export interface AppDeps {
  root: HTMLElement;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
}

export function createApp({ root, storage }: AppDeps): void {
  // 共有リンク(#d=...)で開かれたときは、その図を初期値にする。
  const shared = typeof location !== 'undefined' ? diagramFromHash(location.hash) : null;
  let text = shared ?? storage.getItem(STORAGE_KEY) ?? TEMPLATES[1]?.text ?? '';

  let weightKey = 'normal';
  let spacingKey = 'normal';
  try {
    const raw = JSON.parse(storage.getItem(OPTS_KEY) ?? '{}') as Record<string, unknown>;
    if (typeof raw.weight === 'string' && raw.weight in WEIGHTS) weightKey = raw.weight;
    if (typeof raw.spacing === 'string' && raw.spacing in SPACINGS) spacingKey = raw.spacing;
  } catch {
    // 壊れていれば既定のまま
  }

  const storedZoom = storage.getItem(ZOOM_KEY);
  let zoom: Zoom = storedZoom === '1' || storedZoom === '2' ? storedZoom : 'fit';

  function save(): void {
    storage.setItem(STORAGE_KEY, text);
  }

  function saveOpts(): void {
    storage.setItem(OPTS_KEY, JSON.stringify({ weight: weightKey, spacing: spacingKey }));
  }

  function exportOptions(): ConvertOptions {
    const [cellWidth, cellHeight] = SPACINGS[spacingKey] ?? SPACINGS.normal!;
    return { cellWidth, cellHeight, strokeScale: WEIGHTS[weightKey] ?? 1 };
  }

  function svgNow(): string {
    return textToSvg(text, exportOptions());
  }

  /** 解決済みテーマの文字色。PNGは色を固定して書き出す必要があるため使う */
  function inkColor(): string {
    if (typeof getComputedStyle !== 'function') return '#232220';
    const value = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    return value || '#232220';
  }

  function updatePreview(): void {
    const preview = root.querySelector<HTMLElement>('#preview');
    if (preview) {
      preview.innerHTML =
        text.trim() === ''
          ? '<p class="hint">左のエディタに罫線図を書くと、ここにSVGが出ます。</p>'
          : svgNow();
    }
    applyZoom();
    updateNotes();
  }

  /** プレビューSVGに表示倍率を反映し、ボタンの選択状態をそろえる */
  function applyZoom(): void {
    for (const btn of root.querySelectorAll<HTMLElement>('[data-zoom]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.zoom === zoom));
    }
    const svg = root.querySelector<SVGElement>('#preview svg');
    if (!svg) return;
    if (zoom === 'fit') {
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.maxWidth = '100%';
    } else {
      const factor = zoom === '2' ? 2 : 1;
      const w = Number(svg.getAttribute('width')) || 0;
      const h = Number(svg.getAttribute('height')) || 0;
      svg.style.width = `${w * factor}px`;
      svg.style.height = `${h * factor}px`;
      svg.style.maxWidth = 'none';
    }
  }

  /** 行数とSVGの寸法を見出し脇に出す */
  function updateNotes(): void {
    const editorNote = root.querySelector<HTMLElement>('#editor-note');
    if (editorNote) {
      const lines = text === '' ? 0 : text.split('\n').length;
      editorNote.textContent = `${lines}行`;
    }
    const previewNote = root.querySelector<HTMLElement>('#preview-note');
    if (previewNote) {
      const svg = root.querySelector<SVGElement>('#preview svg');
      const w = svg?.getAttribute('width');
      const h = svg?.getAttribute('height');
      previewNote.textContent = w && h ? `${w} × ${h}` : '';
    }
  }

  /** キャレット位置に文字列を差し込み、キャレットを後ろへ送る */
  function insertAtCaret(snippet: string): void {
    const editor = root.querySelector<HTMLTextAreaElement>('#editor');
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText(snippet, start, end, 'end');
    text = editor.value;
    save();
    updatePreview();
    editor.focus();
  }

  /** 本文を丸ごと差し替える。整形やひな形の置き換えで使う */
  function replaceText(next: string): void {
    if (next === text) return;
    const editor = root.querySelector<HTMLTextAreaElement>('#editor');
    text = next;
    if (editor) editor.value = next;
    save();
    updatePreview();
    editor?.focus();
  }

  /** Blobを名前付きでダウンロードさせる */
  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** ボタンのラベルを一時的に差し替えて操作の成否を伝える */
  function flash(selector: string, message: string, revert: string): void {
    const span = root.querySelector(selector);
    if (!span) return;
    span.textContent = message;
    setTimeout(() => {
      const later = root.querySelector(selector);
      if (later) later.textContent = revert;
    }, 2000);
  }

  function copySvg(): void {
    void navigator.clipboard.writeText(svgNow()).then(() => {
      flash('#copy-svg span:last-child', 'コピーしました', 'SVGをコピー');
    });
  }

  function downloadSvg(): void {
    downloadBlob(new Blob([svgNow()], { type: 'image/svg+xml' }), 'keisen.svg');
  }

  /** プレビューと同じ図を、テーマの文字色で塗ったPNGとして書き出す */
  function downloadPng(): void {
    if (text.trim() === '') return;
    const source = colorizeSvg(svgNow(), inkColor());
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ratio = 2; // 貼り付け先でぼけないよう2倍解像度で焼く
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((png) => {
          if (png) downloadBlob(png, 'keisen.png');
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  function copyShareLink(): void {
    const hash = diagramToHash(text);
    history.replaceState(null, '', hash);
    const url = `${location.origin}${location.pathname}${location.search}${hash}`;
    void navigator.clipboard.writeText(url).then(() => {
      flash('#share-label', 'リンクをコピーしました', 'リンクをコピー');
    });
  }

  function render(): void {
    const paletteHtml = PALETTE_ROWS.map(
      (row) => `
        <div class="palette-row">
          ${row
            .map(
              (ch) =>
                `<button type="button" class="palette-key" data-insert="${ch}" aria-label="${ch} を挿入">${ch}</button>`,
            )
            .join('')}
        </div>`,
    ).join('');
    const templatesHtml = TEMPLATES.map(
      (t, i) =>
        `<button type="button" class="button small" data-template="${i}">${t.name}</button>`,
    ).join('');
    const shapersHtml = SHAPERS.map(
      (s, i) =>
        `<button type="button" class="button small" data-shape="${i}" title="${s.hint}">${s.label}</button>`,
    ).join('');
    const zoomHtml = ZOOMS.map(
      (z) =>
        `<button type="button" class="zoom-key" data-zoom="${z.value}" aria-pressed="${z.value === zoom}">${z.label}</button>`,
    ).join('');
    root.innerHTML = `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span>keisen</span></span>
          <div class="header-actions">
            <button type="button" class="icon-button" id="theme-toggle" aria-label="テーマを切り替える">
              ${icons.theme}<span id="theme-label">自動</span>
            </button>
            <div class="export-actions">
              <button type="button" class="button" id="share-link">
                ${icons.link}<span id="share-label">リンクをコピー</span></button>
              <button type="button" class="button" id="copy-svg">
                ${icons.copy}<span>SVGをコピー</span></button>
              <button type="button" class="button" id="download-png">
                ${icons.image}<span>PNGを保存</span></button>
              <button type="button" class="button primary" id="download-svg">
                ${icons.download}<span>SVGを保存</span></button>
            </div>
          </div>
        </div>
      </header>
      <main class="site-main">
        <p class="lede">罫線文字で図を書くと、文字を本物の線に引き直したSVGになる。プレビューを見ながら整え、線も文字も<code>currentColor</code>のまま書き出す。</p>
        <div class="toolbar">
          <div class="tool-group">
            <span class="group-label">罫線</span>
            <div class="palette" role="group" aria-label="罫線文字">${paletteHtml}</div>
          </div>
          <div class="tool-group">
            <span class="group-label">ひな形</span>
            <div class="chip-row" role="group" aria-label="ひな形">${templatesHtml}</div>
          </div>
          <div class="tool-group">
            <span class="group-label">整形</span>
            <div class="chip-row" role="group" aria-label="図全体の整形">${shapersHtml}</div>
          </div>
          <div class="tool-group">
            <span class="group-label">書き出し</span>
            <div class="export-settings">
              <label class="setting">
                <span>線</span>
                <select id="weight-select">${selectOptions(WEIGHT_LABEL, weightKey)}</select>
              </label>
              <label class="setting">
                <span>間隔</span>
                <select id="spacing-select">${selectOptions(SPACING_LABEL, spacingKey)}</select>
              </label>
            </div>
          </div>
        </div>
        <div class="workspace">
          <div class="field">
            <div class="field-head">
              <span class="group-label">エディタ</span>
              <span class="field-note" id="editor-note"></span>
            </div>
            <textarea id="editor" spellcheck="false" aria-label="罫線図の本文"
              placeholder="ここに罫線文字で図を描く">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>
          </div>
          <div class="field">
            <div class="field-head">
              <span class="group-label">プレビュー</span>
              <div class="preview-tools">
                <div class="zoom" role="group" aria-label="表示倍率">${zoomHtml}</div>
                <span class="field-note" id="preview-note"></span>
              </div>
            </div>
            <div class="preview-pane">
              <div id="preview" class="preview"></div>
            </div>
          </div>
        </div>
        <p class="hint">罫線文字は線として、その他の文字はテキストとしてSVGに変換します。<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>S</kbd>でSVGを保存、<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>でSVGをコピーできます。</p>
      </main>
      <footer class="site-footer">
        <p>keisen — 罫線図エディタ。本文はこの端末のブラウザにだけ保存されます。</p>
      </footer>`;
    bindEvents();
    updatePreview();
  }

  function bindEvents(): void {
    const editor = root.querySelector<HTMLTextAreaElement>('#editor');
    editor?.addEventListener('input', () => {
      text = editor.value;
      save();
      updatePreview();
    });

    for (const el of root.querySelectorAll<HTMLElement>('[data-insert]')) {
      el.addEventListener('click', () => insertAtCaret(el.dataset.insert ?? ''));
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-template]')) {
      el.addEventListener('click', () => {
        const template = TEMPLATES[Number(el.dataset.template)];
        if (!template) return;
        insertAtCaret(`${template.text}\n`);
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-shape]')) {
      el.addEventListener('click', () => {
        const shaper = SHAPERS[Number(el.dataset.shape)];
        if (shaper) replaceText(shaper.apply(text));
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-zoom]')) {
      el.addEventListener('click', () => {
        zoom = (el.dataset.zoom as Zoom) ?? 'fit';
        storage.setItem(ZOOM_KEY, zoom);
        applyZoom();
      });
    }

    root.querySelector('#copy-svg')?.addEventListener('click', copySvg);
    root.querySelector('#download-svg')?.addEventListener('click', downloadSvg);
    root.querySelector('#download-png')?.addEventListener('click', downloadPng);
    root.querySelector('#share-link')?.addEventListener('click', copyShareLink);

    const weightSelect = root.querySelector<HTMLSelectElement>('#weight-select');
    weightSelect?.addEventListener('change', () => {
      weightKey = weightSelect.value;
      saveOpts();
      updatePreview();
    });
    const spacingSelect = root.querySelector<HTMLSelectElement>('#spacing-select');
    spacingSelect?.addEventListener('change', () => {
      spacingKey = spacingSelect.value;
      saveOpts();
      updatePreview();
    });

    root.querySelector('#theme-toggle')?.addEventListener('click', cycleTheme);
  }

  // 書き出しのショートカット。修飾キー込みなのでIMEや通常のコピーを邪魔しない。
  function onKeydown(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      downloadSvg();
    } else if (key === 'c' && event.shiftKey) {
      event.preventDefault();
      copySvg();
    }
  }

  // テーマ。保存値を読み、解決済みのライト/ダークをdata-themeに反映する。
  // 描画前の初期適用はindex.htmlのインラインスクリプトが済ませている。
  const systemDark =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  let themePref: ThemePref = readPref((k) => storage.getItem(k));

  function applyTheme(): void {
    const resolved = resolveTheme(themePref, systemDark?.matches ?? false);
    document.documentElement.dataset.theme = resolved;
    const label = root.querySelector<HTMLElement>('#theme-label');
    if (label) label.textContent = PREF_LABEL[themePref];
  }

  function cycleTheme(): void {
    themePref = nextPref(themePref);
    storage.setItem(THEME_KEY, themePref);
    applyTheme();
  }

  systemDark?.addEventListener('change', () => {
    if (themePref === 'system') applyTheme();
  });

  if (shared !== null) save(); // 共有リンクで開いた図はこの端末にも残す
  render();
  applyTheme();
  document.addEventListener('keydown', onKeydown);
}
