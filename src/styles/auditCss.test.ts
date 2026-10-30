import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLASS_FROST_PERCENT } from '../lib/glass/constants.ts';
import { auditCss } from './auditCss.ts';

// Audit policy documented here:
// - Zero is the only allowed border-radius.
// - box-shadow / text-shadow are allowed only as `none`, `0`, a fully transparent
//   shadow (`#0000`) or a pure var() reference (Tailwind's internal plumbing).
// - gradients, backdrop-filter, blur() and drop-shadow() are never allowed.
// - `filter` is allowed only as `none` or the same-document glass reference url(#liquid-glass-refraction).
// - Color literals must be one of the eight approved hex tokens, a fully transparent
//   hex (`#0000`, `#00000000`), `transparent`, `currentColor` or `inherit`.
// - Font families must be Anton, JetBrains Mono, or the sans-serif / monospace generics.
// - The retired lime accent is never allowed, in any form.
// - Minified shorthand hex (#888 for #888888) is expanded before comparison.
// - At-rule preludes (@supports / @media / @container conditions) are feature queries, not
//   styling, so only the declarations inside their blocks are audited.
// - color-mix() is allowed only when every color argument is currentColor, transparent or
//   an approved token (Tailwind preflight uses it for ::placeholder).
// - backdrop-filter is allowed only as a pure var() reference (Tailwind plumbing, a no-op).
// - Tailwind preflight font fallbacks inside var(--default-font-family, ...) and
//   var(--default-mono-font-family, ...) are unreachable once the stylesheet declares those
//   custom properties; when it does not, the fallbacks are audited like any other family.

const rules = (css: string): string[] => auditCss(css).map((violation) => violation.rule);
const LEGACY_LIME = ['E1F8', '58'].join('');

describe('auditCss clean input', () => {
  it('accepts a stylesheet that only uses approved values', () => {
    const css = `
      @font-face { font-family: Anton; src: url(a.woff2); }
      :root { --color-ink: #0A0A0A; --tw-shadow: 0 0 #0000; }
      body { color: #8e4af2; background: #F8F8F8; font-family: "Anton", sans-serif; }
      code { font-family: "JetBrains Mono", monospace; border-radius: 0; box-shadow: none; }
      a { color: currentColor; border-color: transparent; outline-color: inherit; }
    `;
    expect(auditCss(css)).toEqual([]);
  });

  it('ignores forbidden words that only appear in comments', () => {
    expect(auditCss('/* border-radius: 8px; linear-gradient(red, blue) */ a { color: #0A0A0A; }')).toEqual([]);
  });
});

describe('auditCss shape and effect rules', () => {
  it('flags non-zero border-radius but not zero', () => {
    expect(rules('a { border-radius: 8px; } b { border-radius: 9999px; }')).toEqual([
      'border-radius',
      'border-radius',
    ]);
    expect(auditCss('a { border-radius: 0; } b { border-radius: 0px; }')).toEqual([]);
  });

  it('flags real box-shadow and text-shadow values only', () => {
    expect(rules('a { box-shadow: 0 1px 3px #0A0A0A; }')).toEqual(['box-shadow']);
    expect(rules('a { text-shadow: 1px 1px #0A0A0A; }')).toEqual(['text-shadow']);
    expect(
      auditCss('a { box-shadow: none; } b { box-shadow: 0 0 #0000; } c { box-shadow: var(--tw-ring-offset-shadow), var(--tw-shadow); }'),
    ).toEqual([]);
  });

  it('flags gradients, backdrop-filter, blur and drop-shadow', () => {
    expect(rules('a { background: linear-gradient(#0A0A0A, #F8F8F8); }')).toContain('gradient');
    expect(rules('a { background-image: radial-gradient(#0A0A0A, #F8F8F8); }')).toContain('gradient');
    expect(rules('a { backdrop-filter: blur(4px); }')).toEqual(expect.arrayContaining(['backdrop-filter', 'blur']));
    expect(rules('a { filter: blur(2px); }')).toEqual(expect.arrayContaining(['filter', 'blur']));
    expect(rules('a { filter: drop-shadow(0 1px 2px #0A0A0A); }')).toEqual(['filter', 'drop-shadow']);
  });
});

describe('auditCss color rules', () => {
  it('flags unapproved hex, functional and named colors', () => {
    expect(rules('a { color: #fff; }')).toEqual(['color']);
    expect(rules('a { color: #123456; }')).toEqual(['color']);
    expect(rules('a { background: rgb(1, 2, 3); }')).toEqual(['color']);
    expect(rules('a { background: oklch(0.5 0.2 270); }')).toEqual(['color']);
    expect(rules('a { color: white; }')).toEqual(['color']);
    expect(rules('a { border-color: black; }')).toEqual(['color']);
  });

  it('accepts approved tokens regardless of case and reports every offender', () => {
    expect(auditCss('a { color: #8e4af2; background: #E2680A; }')).toEqual([]);
    const violations = auditCss('a { color: #111111; } b { color: #222222; }');
    expect(violations).toHaveLength(2);
    expect(violations[0]?.detail).toContain('#111111');
    expect(violations[1]?.detail).toContain('#222222');
  });

  it('flags the retired lime accent', () => {
    expect(rules(`a { color: #${LEGACY_LIME.toLowerCase()}; }`)).toContain('legacy-accent');
    expect(rules(`a { color: #${LEGACY_LIME}; }`)).toContain('legacy-accent');
  });
});

describe('auditCss font rules', () => {
  it('flags families other than the approved pair and generics', () => {
    expect(rules('a { font-family: Arial, sans-serif; }')).toEqual(['font-family']);
    expect(rules('a { font-family: ui-monospace, monospace; }')).toEqual(['font-family']);
    expect(rules('a { font-family: "Inter", system-ui; }')).toEqual(['font-family', 'font-family']);
  });

  it('audits var() fallbacks but allows bare var() references', () => {
    expect(auditCss('a { font-family: var(--font-display); }')).toEqual([]);
    expect(rules('a { font-family: var(--font-sans, ui-sans-serif, system-ui); }')).toEqual([
      'font-family',
      'font-family',
    ]);
  });
});

describe('auditCss compiled-output allowances', () => {
  it('expands minified shorthand hex before comparing', () => {
    expect(auditCss('a { color: #888; } b { --x: #0000; }')).toEqual([]);
    expect(rules('a { color: #999; }')).toEqual(['color']);
    expect(rules('a { color: #f80; }')).toEqual(['color']);
  });

  it('ignores at-rule preludes but audits the declarations inside them', () => {
    const prelude = '@supports (color: rgb(from red r g b)) and (-webkit-hyphens: none) { a { color: #0A0A0A; } }';
    expect(auditCss(prelude)).toEqual([]);
    expect(rules('@media (min-width: 40rem) { a { color: #fff; } }')).toEqual(['color']);
  });

  it('allows color-mix only with currentColor, transparent or approved tokens', () => {
    expect(auditCss('a { color: color-mix(in oklab, currentcolor 50%, transparent); }')).toEqual([]);
    expect(auditCss('a { color: color-mix(in srgb, #8E4AF2 40%, #F8F8F8); }')).toEqual([]);
    expect(rules('a { color: color-mix(in oklab, red 50%, transparent); }')).toEqual(['color']);
    expect(rules('a { color: color-mix(in srgb, #123456, #F8F8F8); }')).toEqual(['color']);
  });

  it('allows backdrop-filter only as a pure var() reference', () => {
    expect(auditCss('.b { backdrop-filter: var(--tw-backdrop-blur,) var(--tw-backdrop-sepia,); }')).toEqual([]);
    expect(rules('.b { backdrop-filter: grayscale(1); }')).toEqual(['backdrop-filter']);
  });

  it('trusts preflight font fallbacks only when the default family variables are declared', () => {
    const stack = '-apple-system, "Segoe UI", sans-serif';
    const preflight = `html { font-family: var(--default-font-family, ${stack}); } code { font-family: var(--default-mono-font-family, ui-monospace, monospace); }`;
    expect(rules(preflight)).toEqual(['font-family', 'font-family', 'font-family']);
    const declared = `:root { --default-font-family: var(--font-mono); --default-mono-font-family: var(--font-mono); } ${preflight}`;
    expect(auditCss(declared)).toEqual([]);
    const partial = `:root { --default-font-family: var(--font-mono); } ${preflight}`;
    expect(rules(partial)).toEqual(['font-family']);
  });
});

describe('auditCss filter rule', () => {
  it.each([
    'a { filter: none; }',
    'a { filter: url(#liquid-glass-refraction); }',
    'a { filter: url("#liquid-glass-refraction"); }',
  ])('allows %s', (css) => {
    expect(auditCss(css)).toEqual([]);
  });

  it.each(['a { filter: url(#other-filter); }', 'a { filter: url(liquid-glass-refraction.svg#x); }', 'a { filter: grayscale(1); }'])(
    'flags %s',
    (css) => {
      expect(rules(css)).toEqual(['filter']);
    },
  );

  it('still rejects blur, drop-shadow and backdrop-filter next to the allowed glass reference', () => {
    expect(rules('a { filter: url(#liquid-glass-refraction) blur(4px); }')).toEqual(expect.arrayContaining(['filter', 'blur']));
    expect(rules('a { filter: drop-shadow(0 0 4px #0A0A0A); }')).toEqual(expect.arrayContaining(['filter', 'drop-shadow']));
    expect(rules('a { backdrop-filter: url(#liquid-glass-refraction); }')).toEqual(['backdrop-filter']);
    expect(rules('a { -webkit-backdrop-filter: blur(2px); }')).toEqual(expect.arrayContaining(['backdrop-filter', 'blur']));
  });

  it('keeps rejecting gradients and shadows on a glass rule', () => {
    expect(rules('a { filter: url(#liquid-glass-refraction); background: linear-gradient(#0A0A0A, #F8F8F8); }')).toEqual(['gradient']);
    expect(rules('a { filter: none; box-shadow: 0 1px 3px #0A0A0A; }')).toEqual(['box-shadow']);
  });
});

describe('frost layer colour', () => {
  const authored = readFileSync('src/styles/index.css', 'utf8');
  const frost = /@utility glass-frost\s*{([^}]*)}/.exec(authored)?.[1] ?? '';

  it('mixes the bg token at 72 % with transparent and passes the audit', () => {
    expect(frost.replace(/\s+/g, ' ').trim()).toBe('background-color: color-mix(in srgb, #F8F8F8 72%, transparent);');
    expect(auditCss(`.glass-frost {${frost}}`)).toEqual([]);
    expect(frost).toContain(`${GLASS_FROST_PERCENT}%`);
  });

  it('accepts an approved token folded into an alpha hex, as the minifier emits it', () => {
    expect(auditCss('.f { background-color: #f8f8f814; }')).toEqual([]);
    expect(auditCss('.f { background-color: #0a0a0a80; }')).toEqual([]);
    expect(auditCss('.f { background-color: #8e4af2ff; }')).toEqual([]);
  });

  it('rejects an alpha hex whose colour is not a token', () => {
    expect(rules('.f { background-color: #ffffff14; }')).toEqual(['color']);
    expect(rules('.f { background-color: #12345614; }')).toEqual(['color']);
    expect(auditCss('.f { box-shadow: 0 0 #00000000; }')).toEqual([]);
  });

  it('rejects the white the reference used, with the same alpha', () => {
    expect(rules('.f { background-color: rgba(255, 255, 255, 0.05); }')).toEqual(['color']);
    expect(rules('.f { background-color: color-mix(in srgb, #FFFFFF 8%, transparent); }')).toEqual(['color']);
  });
});

describe('authored stylesheet opacity policy [A1]', () => {
  const authored = readFileSync('src/styles/index.css', 'utf8');
  const ALLOWED_OPACITY_RULES = [
    'skull-backdrop',
    'skull-full',
    'skull-fade',
    '[data-reveal-ready] [data-reveal]',
    '.glass-panel[data-glass-hidden]',
    'glass-panel',
    // HUD entrances fade between 0 and 1 (never a translucent resting state): the utilities and their keyframes.
    'hud-',
    '@keyframes hud-',
  ];

  function ruleOf(declarationIndex: number): string {
    const open = authored.lastIndexOf('{', declarationIndex);
    const head = authored.slice(authored.lastIndexOf('}', open) + 1, open).replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = head.replace(/@utility\s+/, '').trim();
    // A keyframe step (`from`, `to`, `50%`) is reported as its enclosing `@keyframes name` rule.
    if (/^(?:from|to|\d+%)$/.test(rule)) {
      return authored.slice(authored.lastIndexOf('@keyframes', declarationIndex)).split('{')[0]!.trim();
    }
    return rule;
  }

  it('declares opacity only in the faint backdrop, the canvas fade, the reveal and the glass panel gate', () => {
    const rules = [...authored.matchAll(/(?<![\w-])opacity\s*:/g)].map((match) => ruleOf(match.index));
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(ALLOWED_OPACITY_RULES.some((allowed) => rule.startsWith(allowed)), `unexpected opacity in "${rule}"`).toBe(true);
    }
  });

  it('keeps the faint backdrop at 0.3 and never transparent text', () => {
    expect(authored).toMatch(/@utility skull-backdrop\s*\{\s*opacity:\s*0\.3;/);
    expect(authored).not.toMatch(/color[^;]*\/\s*\d/);
  });
});
