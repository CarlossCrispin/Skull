import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Flat `selector { prop: value; }` rules whose selector mentions `[data-reveal`. */
function revealRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  for (const match of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (match[1]).trim();
    if (!selector.includes('[data-reveal')) continue;
    const declarations = new Map();
    for (const decl of (match[2]).matchAll(/([-\w]+)\s*:\s*([^;]+);?/g)) {
      declarations.set(decl[1], (decl[2]).trim());
    }
    rules.push({ selector, declarations });
  }
  return rules;
}

const ANIMATED_OR_HIDDEN = /^(transition(-.+)?|opacity|transform|translate|animation(-.+)?)$/;

function ungatedRules(rules) {
  return rules.filter(
    (rule) =>
      !rule.selector.includes('[data-reveal-ready]') &&
      [...rule.declarations.keys()].some((property) => ANIMATED_OR_HIDDEN.test(property)),
  );
}

const rules = revealRules(readFileSync('src/styles/index.css', 'utf8'));
const hidden = rules.find((rule) => rule.declarations.get('opacity') === '0');
const shown = rules.find((rule) => rule.declarations.get('opacity') === '1');

describe('reveal css gating', () => {
  it('detects an ungated hidden state (parser self-check)', () => {
    const bad = revealRules('[data-reveal] { opacity: 0; transition-duration: 700ms; }');
    expect(ungatedRules(bad)).toHaveLength(1);
    const good = revealRules('[data-reveal-ready] [data-reveal] { opacity: 0; }');
    expect(ungatedRules(good)).toHaveLength(0);
  });

  it('has reveal rules and gates every transition and hidden state under [data-reveal-ready]', () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(ungatedRules(rules)).toEqual([]);
  });
});

describe('reveal css values', () => {
  it('hides with opacity 0 and translateY(32px)', () => {
    expect(hidden).toBeDefined();
    expect(hidden?.selector).toContain('[data-reveal-ready]');
    expect(hidden?.declarations.get('transform')).toBe('translateY(32px)');
  });

  it('transitions opacity and transform only, 700ms, ease-out', () => {
    const declarations = hidden?.declarations;
    const properties = (declarations?.get('transition-property') ?? '').split(',').map((part) => part.trim());
    expect(properties).toEqual(['opacity', 'transform']);
    expect(declarations?.get('transition-duration')).toBe('700ms');
    expect(declarations?.get('transition-timing-function')).toBe('ease-out');
    expect(declarations?.get('transition-delay')).toBe('var(--reveal-delay, 0ms)');
  });

  it('shows revealed items at full opacity with no offset', () => {
    expect(shown?.selector).toContain('[data-revealed]');
    expect(shown?.selector).toContain('[data-reveal-ready]');
    expect(shown?.declarations.get('transform')).toBe('translateY(0)');
  });

  it('animates no layout property', () => {
    const layout = /^(width|height|top|left|right|bottom|margin.*|padding.*|inset.*|gap|font-size|line-height)$/;
    for (const rule of rules) {
      for (const property of rule.declarations.keys()) expect(property).not.toMatch(layout);
      const transitioned = rule.declarations.get('transition-property') ?? '';
      expect(transitioned).not.toMatch(/\ball\b|width|height|top|left|margin|padding/);
    }
  });
});

describe('reveal css indicator hide', () => {
  const hide = rules.find((rule) => rule.selector.includes('[data-hidden]') && !rule.selector.includes('@media'));

  it('hides with opacity 0 and out-ranks the revealed state', () => {
    expect(hide).toBeDefined();
    expect(hide?.declarations.get('opacity')).toBe('0');
    const selectors = (hide?.selector ?? '').split(',').map((part) => part.trim());
    const specificity = (selector) => (selector.match(/\[/g) ?? []).length;
    const revealedSpecificity = specificity(shown?.selector ?? '');
    expect(selectors.some((selector) => selector.includes('[data-reveal-ready]') && specificity(selector) > revealedSpecificity)).toBe(true);
    // Also hides when the section never became ready (reduced motion): a plain [data-reveal][data-hidden].
    expect(selectors).toContain('[data-reveal][data-hidden]');
  });

  it('transitions opacity only, over 300 ms', () => {
    expect(hide?.declarations.get('transition-property')).toBe('opacity');
    expect(hide?.declarations.get('transition-duration')).toBe('300ms');
  });

  it('is instant under reduced motion', () => {
    const css = readFileSync('src/styles/index.css', 'utf8');
    const media = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*([^{}]*\[data-hidden\][^{}]*)\{([^{}]*)\}/.exec(css);
    expect(media).not.toBeNull();
    expect(media?.[2]).toMatch(/transition(-duration)?:\s*(none|0ms)/);
  });
});

describe('glass panel reveal gate (G6)', () => {
  const css = readFileSync('src/styles/index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hiddenRule = /\.glass-panel\[data-glass-hidden\]\s*\{([^{}]*)\}/.exec(css)?.[1] ?? '';
  const panel = /@utility glass-panel\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

  it('hides the panel with opacity 0 only while the attribute is set', () => {
    expect(hiddenRule).toMatch(/opacity:\s*0\s*;/);
    expect(hiddenRule).not.toMatch(/transform|translate/);
  });

  it('animates opacity only, over 700 ms ease-out', () => {
    expect(panel).toMatch(/transition-property:\s*opacity\s*;/);
    expect(panel).toMatch(/transition-duration:\s*700ms\s*;/);
    expect(panel).toMatch(/transition-timing-function:\s*ease-out\s*;/);
    expect(panel).not.toMatch(/transition-property:[^;]*(transform|all|width|height|top|left)/);
  });

  it('is instant under reduced motion', () => {
    expect(panel).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition-duration:\s*0ms/);
  });

  it('adds no shadow, radius or backdrop filter to the panel or its frost layer', () => {
    const frost = /@utility glass-frost\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(frost).not.toBe('');
    for (const body of [panel, frost, hiddenRule]) {
      expect(body).not.toMatch(/shadow|radius|backdrop-filter|blur\(/);
    }
  });
});
