// 画面の描画。テキストの編集ではプレビューだけを差し替え、textareaは
// 再生成しない(IMEの変換とキャレットを守るため)。

import { textToSvg } from './lib/svgconv';
import { icons } from './icons';

/** パレットに並べる罫線文字。行ごとにまとまりを持たせる */
const PALETTE_ROWS: string[][] = [
  ['─', '│', '┌', '┐', '└', '┘'],
  ['├', '┤', '┬', '┴', '┼'],
  ['━', '┃', '┏', '┓', '┗', '┛'],
  ['┣', '┫', '┳', '┻', '╋'],
];

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
      '│ りんご │  3   │ 個  │',
      '│ 牛乳  │  1   │ 本  │',
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

  function save(): void {
    storage.setItem(STORAGE_KEY, text);
  }

  function updatePreview(): void {
    const preview = root.querySelector<HTMLElement>('#preview');
    if (preview) {
      preview.innerHTML =
        text.trim() === ''
          ? '<p class="hint">左のエディタに罫線図を書くと、ここにSVGが出ます。</p>'
          : textToSvg(text);
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
          <div class="export-actions">
            <button type="button" class="button" id="copy-svg">
              ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : 'SVGをコピー'}</span></button>
            <button type="button" class="button primary" id="download-svg">
              ${icons.download}<span>SVGを保存</span></button>
          </div>
        </div>
      </header>
      <main class="site-main">
        <div class="toolbar">
          <div class="palette" role="group" aria-label="罫線文字">${paletteHtml}</div>
          <div class="templates" role="group" aria-label="ひな形">
            <span class="templates-label">ひな形:</span>
            ${templatesHtml}
          </div>
        </div>
        <div class="workspace">
          <textarea id="editor" spellcheck="false" aria-label="罫線図の本文"
            placeholder="ここに罫線文字で図を描く">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>
          <div class="preview-pane">
            <div id="preview" class="preview"></div>
          </div>
        </div>
        <p class="hint">罫線文字は線として、その他の文字はテキストとしてSVGに変換します。線と文字はcurrentColorで描かれるので、貼り付け先の配色に追従します。</p>
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
      void navigator.clipboard.writeText(textToSvg(text)).then(() => {
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
      const url = URL.createObjectURL(new Blob([textToSvg(text)], { type: 'image/svg+xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keisen.svg';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  render();
}
