import { inflateSync } from 'node:zlib';

/**
 * @typedef {object} DecodedIndexedPng
 * @property {number} width
 * @property {number} height
 * @property {number} bitDepth
 * @property {number} colorType
 * @property {readonly PngChunk[]} chunks
 * @property {ReadonlyArray<readonly [number, number, number]>} palette
 * @property {readonly number[]} alpha
 * @property {readonly number[]} filterTypes - Filter type byte of each scanline, before unfiltering.
 * @property {Uint8Array} pixels - Palette indices, one byte per pixel (8-bit depth only).
 */

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

/** Test-only decoder for 8-bit indexed PNGs (color type 3); supports all five filter types. */
export function decodeIndexedPng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  PNG_SIGNATURE.forEach((value, i) => {
    if (bytes[i] !== value) {
      throw new Error('bad PNG signature');
    }
  });
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const crc = view.getUint32(offset + 8 + length);
    chunks.push({ type, data, crc });
    offset += 12 + length;
  }
  const byType = (type) => chunks.find((c) => c.type === type)?.data;
  const ihdr = byType('IHDR');
  const ihdrView = new DataView(ihdr.buffer, ihdr.byteOffset, ihdr.byteLength);
  const width = ihdrView.getUint32(0);
  const height = ihdrView.getUint32(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];

  const plte = byType('PLTE');
  const palette = [];
  for (let i = 0; i < plte.length; i += 3) {
    palette.push([plte[i], plte[i + 1], plte[i + 2]]);
  }
  const alpha = [...(byType('tRNS') ?? [])];

  const idat = chunks.filter((c) => c.type === 'IDAT');
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.data.length, 0));
  let at = 0;
  for (const c of idat) {
    joined.set(c.data, at);
    at += c.data.length;
  }
  const raw = new Uint8Array(inflateSync(joined));
  const stride = width + 1;
  const filterTypes = [];
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    filterTypes.push(filter);
    for (let x = 0; x < width; x++) {
      const value = raw[y * stride + 1 + x];
      const left = x > 0 ? pixels[y * width + x - 1] : 0;
      const up = y > 0 ? pixels[(y - 1) * width + x] : 0;
      const upLeft = x > 0 && y > 0 ? pixels[(y - 1) * width + x - 1] : 0;
      const predictor =
        filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? (left + up) >> 1 : paeth(left, up, upLeft);
      pixels[y * width + x] = (value + predictor) & 0xff;
    }
  }
  return { width, height, bitDepth, colorType, chunks, palette, alpha, filterTypes, pixels };
}
