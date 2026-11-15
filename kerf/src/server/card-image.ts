import {readFile, stat} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {readMedia} from './media-store';
import {siteOrigin} from '../lib/seo';

const limit = 20 * 1024 * 1024;
type Options = {root?: string; fetcher?: typeof fetch};

/** Public images live on the CDN in Netlify; only local development has public/. */
export async function readCardImage(source: string, options: Options = {}): Promise<Buffer> {
  const media = source.match(/^\/api\/media\/([a-f0-9]{64})$/)?.[1];
  if (media) {
    const entry = await readMedia(media);
    if (!entry || !entry.metadata.type.startsWith('image/') || entry.data.length > limit)
      throw Error('Use an uploaded image');
    return entry.data;
  }
  const path = source.split(/[?#]/)[0]!;
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\0]/.test(decoded) ||
      /(^|\/)\.{1,2}(\/|$)/.test(decoded) || /^\/(admin|api|_kerf|social-card\.jpg)(\/|$)/i.test(decoded) ||
      !/\.(avif|webp|png|jpe?g|gif|svg)$/i.test(decoded))
    throw Error('Use a public image path');
  const root = resolve(options.root ?? resolve(process.cwd(), 'public'));
  const file = resolve(root, '.' + decoded);
  if (!file.startsWith(root + sep)) throw Error('Invalid card image');
  try {
    if ((await stat(file)).size > limit) throw Error('Card image is too large');
    return await readFile(file);
  } catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
  }
  // No visitor-supplied hosts, private routes, credentials or redirects. The
  // published snapshot selects the image; the canonical CDN supplies its bytes.
  const response = await (options.fetcher ?? fetch)(new URL(path, siteOrigin), {
    redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/') ||
      Number(response.headers.get('content-length')) > limit || !response.body) {
    await response.body?.cancel();
    throw Error('Public card image is unavailable');
  }
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw Error('Card image is too large');
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, size);
  } finally {
    await reader.cancel();
  }
}
