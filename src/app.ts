// 画面の描画。テキストの編集ではプレビューだけを差し替え、textareaは
// 再生成しない(IMEの変換とキャレットを守るため)。

import { textToSvg, type ConvertOptions } from './lib/svgconv';
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
];

const STORAGE_KEY = 'keisen.text.v1';

export interface AppDeps {
  root: HTMLElement;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
}

export function createApp({ root, storage }: AppDeps): void {
  let text = storage.getItem(STORAGE_KEY) ?? TEMPLATES[1]?.text ?? '';
  let copied = false;

  let weightKey = 'normal';
  let spacingKey = 'normal';
  try {
    const raw = JSON.parse(storage.getItem(OPTS_KEY) ?? '{}') as Record<string, unknown>;
    if (typeof raw.weight === 'string' && raw.weight in WEIGHTS) weightKey = raw.weight;
    if (typeof raw.spacing === 'string' && raw.spacing in SPACINGS) spacingKey = raw.spacing;
  } catch {
    // 壊れていれば既定のまま
  }

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

  function updatePreview(): void {
    const preview = root.querySelector<HTMLElement>('#preview');
    if (preview) {
      preview.innerHTML =
        text.trim() === ''
          ? '<p class="hint">左のエディタに罫線図を書くと、ここにSVGが出ます。</p>'
          : svgNow();
    }
    updateNotes();
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
    root.innerHTML = `
      <header class="site-header">
        <div class="site-header-inner">
          <span class="brand">${icons.logo}<span>keisen</span></span>
          <div class="header-actions">
            <button type="button" class="icon-button" id="theme-toggle" aria-label="テーマを切り替える">
              ${icons.theme}<span id="theme-label">自動</span>
            </button>
            <div class="export-actions">
              <button type="button" class="button" id="copy-svg">
                ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : 'SVGをコピー'}</span></button>
              <button type="button" class="button primary" id="download-svg">
                ${icons.download}<span>SVGを保存</span></button>
            </div>
          </div>
        </div>
      </header>
      <main class="site-main">
        <div class="toolbar">
          <div class="tool-group">
            <span class="group-label">罫線</span>
            <div class="palette" role="group" aria-label="罫線文字">${paletteHtml}</div>
          </div>
          <div class="tool-group templates">
            <span class="templates-label">ひな形</span>
            <div class="templates-row" role="group" aria-label="ひな形">${templatesHtml}</div>
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
              <span class="field-note" id="preview-note"></span>
            </div>
            <div class="preview-pane">
              <div id="preview" class="preview"></div>
            </div>
          </div>
        </div>
        <p class="hint">罫線文字は線として、その他の文字はテキストとしてSVGに変換します。線も文字もcurrentColorで描くので、貼り付け先の文字色にそのまま追従します。</p>
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

    root.querySelector('#copy-svg')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(svgNow()).then(() => {
        copied = true;
        const btn = root.querySelector('#copy-svg span:last-child');
        if (btn) btn.textContent = 'コピーしました';
        setTimeout(() => {
          copied = false;
          const later = root.querySelector('#copy-svg span:last-child');
          if (later) later.textContent = 'SVGをコピー';
        }, 2000);
      });
    });
    root.querySelector('#download-svg')?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([svgNow()], { type: 'image/svg+xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keisen.svg';
      a.click();
      URL.revokeObjectURL(url);
    });

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

  render();
  applyTheme();
}
