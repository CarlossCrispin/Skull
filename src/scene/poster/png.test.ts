import { describe, expect, it } from 'vitest';
import { decodeIndexedPng, PNG_SIGNATURE } from '../../test/pngDecode.ts';
import { crc32, encodeIndexedPng, type IndexedImage } from './png.ts';

const ascii = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0));

const TINY: IndexedImage = {
  width: 2,
  height: 2,
  palette: [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
  ],
  pixels: Uint8Array.from([0, 1, 2, 1]),
};

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    expect(crc32(ascii('123456789'))).toBe(0xcbf43926);
  });

  it('matches known vectors: empty input, "a" and the IEND chunk type', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
    expect(crc32(ascii('a'))).toBe(0xe8b7be43);
    expect(crc32(ascii('IEND'))).toBe(0xae426082);
  });
});

describe('encodeIndexedPng', () => {
  it('writes the signature and the IHDR / PLTE / tRNS / IDAT / IEND chunks in order', () => {
    const bytes = encodeIndexedPng(TINY);
    expect([...bytes.subarray(0, 8)]).toEqual([...PNG_SIGNATURE]);
    const decoded = decodeIndexedPng(bytes);
    expect(decoded.chunks.map((c) => c.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    expect([decoded.width, decoded.height, decoded.bitDepth, decoded.colorType]).toEqual([2, 2, 8, 3]);
  });

  it('round-trips the palette and the pixel indices of a 2x2 image', () => {
    const decoded = decodeIndexedPng(encodeIndexedPng(TINY));
    expect(decoded.palette).toEqual([
      [0, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
    ]);
    expect([...decoded.pixels]).toEqual([0, 1, 2, 1]);
  });

  it('makes palette index 0 fully transparent and every other entry opaque', () => {
    const decoded = decodeIndexedPng(encodeIndexedPng(TINY));
    expect(decoded.alpha).toEqual([0, 255, 255]);
    const wide: IndexedImage = {
      width: 3,
      height: 2,
      palette: [
        [9, 9, 9],
        [10, 20, 30],
        [40, 50, 60],
        [70, 80, 90],
        [100, 110, 120],
      ],
      pixels: Uint8Array.from([4, 3, 2, 1, 0, 4]),
    };
    const decodedWide = decodeIndexedPng(encodeIndexedPng(wide));
    expect(decodedWide.alpha).toEqual([0, 255, 255, 255, 255]);
    expect([...decodedWide.pixels]).toEqual([4, 3, 2, 1, 0, 4]);
  });

  it('emits a valid filter byte (0..4) per scanline and every chunk CRC verifies', () => {
    const width = 17;
    const height = 9;
    const pixels = new Uint8Array(width * height);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = (i * 7 + (i >> 3)) % 5;
    }
    const image: IndexedImage = {
      width,
      height,
      palette: [
        [0, 0, 0],
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ],
      pixels,
    };
    const decoded = decodeIndexedPng(encodeIndexedPng(image));
    expect(decoded.filterTypes).toHaveLength(height);
    for (const filter of decoded.filterTypes) {
      expect(filter).toBeGreaterThanOrEqual(0);
      expect(filter).toBeLessThanOrEqual(4);
    }
    expect([...decoded.pixels]).toEqual([...pixels]);
    for (const chunk of decoded.chunks) {
      const typed = new Uint8Array(4 + chunk.data.length);
      typed.set(ascii(chunk.type));
      typed.set(chunk.data, 4);
      expect(crc32(typed)).toBe(chunk.crc);
    }
  });

  it('rejects a pixel index outside the palette and palettes above 256 entries', () => {
    expect(() => encodeIndexedPng({ ...TINY, pixels: Uint8Array.from([0, 1, 2, 3]) })).toThrow(RangeError);
    const big = Array.from({ length: 257 }, () => [0, 0, 0] as [number, number, number]);
    expect(() => encodeIndexedPng({ ...TINY, palette: big })).toThrow(RangeError);
    expect(() => encodeIndexedPng({ ...TINY, pixels: Uint8Array.from([0, 1, 2]) })).toThrow(RangeError);
  });
});
