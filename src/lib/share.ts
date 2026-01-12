// 罫線図をURLで共有するための符号化。本文をUTF-8のbase64url文字列にして
// URLハッシュ(#d=...)へ載せる。サーバーには何も送らず、リンクだけで完結する。

const PARAM = 'd';

/** 本文をbase64url(+/= を URL安全な文字へ)にする */
export function encodeDiagram(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url文字列を本文へ戻す。復号できなければ null */
export function decodeDiagram(token: string): string | null {
  if (token === '') return null;
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** 共有リンクのハッシュ片(#d=...)を作る */
export function diagramToHash(text: string): string {
  return `#${PARAM}=${encodeDiagram(text)}`;
}

/** location.hash から本文を取り出す。該当が無ければ null */
export function diagramFromHash(hash: string): string | null {
  const match = /[#&]d=([^&]*)/.exec(hash);
  return match && match[1] !== undefined ? decodeDiagram(match[1]) : null;
}
