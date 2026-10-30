import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as PackageJson;
const all: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

const isExact = (range: string): boolean => /^\d+\.\d+\.\d+$/.test(range);

const PINNED: Record<string, string> = {
  three: '0.186.1',
  react: '19.3.1',
  'react-dom': '19.3.1',
  vite: '8.3.5',
  tailwindcss: '4.3.3',
  '@tailwindcss/vite': '4.3.3',
  vitest: '5.0.5',
};

describe('forbidden dependencies', () => {
  it.each(['lucide-react', '@react-three/fiber', 'playwright'])('does not depend on %s', (name) => {
    expect(Object.keys(all)).not.toContain(name);
  });

  it('detects a forbidden dependency when one is present', () => {
    expect(Object.keys({ ...all, playwright: '1.0.0' })).toContain('playwright');
  });
});

describe('pinned versions', () => {
  it.each(Object.entries(PINNED))('%s is pinned exactly to %s', (name, version) => {
    expect(all[name]).toBe(version);
  });

  it('every dependency uses an exact version', () => {
    const loose = Object.entries(all).filter(([, range]) => !isExact(range));
    expect(loose).toEqual([]);
  });

  it('rejects range prefixes', () => {
    expect(isExact('^1.0.0')).toBe(false);
    expect(isExact('~1.0.0')).toBe(false);
    expect(isExact('1.0.0')).toBe(true);
  });
});
