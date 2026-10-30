import { GLASS_FILTER_ID } from '../lib/glass/constants.js';
import { COLORS } from './tokens.js';

const APPROVED_HEX = new Set([
  ...Object.values(COLORS).map((hex) => hex.toLowerCase()),
  '#0000',
  '#00000000',
]);
const ALLOWED_COLOR_KEYWORDS = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset']);
const ALLOWED_FAMILIES = new Set(['anton', 'jetbrains mono', 'sans-serif', 'monospace']);
const FAMILY_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert']);
const PREFLIGHT_FAMILY_VARIABLES = ['--default-font-family', '--default-mono-font-family'];
const COLOR_MIX_NOISE = new Set([
  'in', 'srgb', 'srgb-linear', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'lab', 'oklab', 'lch',
  'oklch', 'hsl', 'hwb', 'xyz', 'xyz-d50', 'xyz-d65', 'shorter', 'longer', 'increasing', 'decreasing', 'hue',
]);
// The only `filter` value the design system allows: none, or the same-document glass refraction filter.
const ALLOWED_FILTER = new RegExp(`^(?:none|url\\((['"]?)#${GLASS_FILTER_ID}\\1\\))$`, 'i');
const LEGACY_ACCENT = ['E1F8', '58'].join('').toLowerCase();

// Named colors checked in color-bearing properties. Not exhaustive by design: the
// functional and hex forms are the realistic sources in compiled Tailwind output.
const NAMED_COLORS = new Set([
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey',
  'silver', 'maroon', 'olive', 'lime', 'aqua', 'teal', 'navy', 'fuchsia', 'cyan', 'magenta',
  'brown', 'gold', 'violet', 'indigo', 'coral', 'salmon', 'crimson',
]);
const COLOR_PROPERTY = /^(color|background|background-color|fill|stroke|outline|outline-color|border|border-[a-z-]*color|border-(top|right|bottom|left))$|-color$/;

const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|light-dark|color)\(/g;
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const TRANSPARENT_SHADOW = /^(?:inset\s+)?0(?:px)?(?:\s+0(?:px)?)+\s+(?:#0000|#00000000|transparent)$/i;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitTopLevel(value, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

function auditShadow(rule, property, value, out) {
  const allowed = splitTopLevel(value, ',').every((part) => {
    const lower = part.toLowerCase();
    return (
      lower === 'none' ||
      lower === '0' ||
      lower === 'initial' ||
      /^var\([^)]*\)$/.test(lower) ||
      TRANSPARENT_SHADOW.test(part)
    );
  });
  if (!allowed) out.push({ rule, detail: `${property}: ${value}` });
}

function auditFamilies(property, value, declared, out) {
  const families = [];
  for (const part of splitTopLevel(value, ',')) {
    const reference = /^var\((.*)\)$/s.exec(part);
    if (reference) {
      // A bare var() reference is allowed; its fallbacks are audited like literals, except
      // for Tailwind preflight defaults that this stylesheet declares (fallback unreachable).
      const [name = '', ...fallbacks] = splitTopLevel(reference[1], ',');
      if (!(PREFLIGHT_FAMILY_VARIABLES.includes(name) && declared.has(name))) families.push(...fallbacks);
    } else {
      families.push(part);
    }
  }
  for (const family of families) {
    const name = family.replace(/^["']|["']$/g, '').trim().toLowerCase();
    if (!ALLOWED_FAMILIES.has(name) && !FAMILY_KEYWORDS.has(name)) {
      out.push({ rule: 'font-family', detail: `${property}: ${family}` });
    }
  }
}

/** Expands minified shorthand hex (#888 -> #888888, #000f -> #000000ff) for comparison. */
function normalizeHex(hex) {
  const lower = hex.toLowerCase();
  if (lower.length === 4 || lower.length === 5) {
    return `#${[...lower.slice(1)].map((digit) => digit + digit).join('')}`;
  }
  return lower;
}

function isApprovedHex(hex) {
  const normalized = normalizeHex(hex);
  if (APPROVED_HEX.has(hex.toLowerCase()) || APPROVED_HEX.has(normalized)) return true;
  // An approved token with an alpha channel (#rrggbbaa): the minifier folds
  // color-mix(in srgb, <token> N%, transparent) into this form.
  return normalized.length === 9 && APPROVED_HEX.has(normalized.slice(0, 7));
}

function auditColorMix(property, value, out) {
  return value.replace(/color-mix\(([^()]*)\)/g, (_whole, inner) => {
    for (const token of inner.split(/[\s,]+/).filter(Boolean)) {
      const word = token.toLowerCase();
      if (COLOR_MIX_NOISE.has(word) || /^[\d.]+%$/.test(word) || ALLOWED_COLOR_KEYWORDS.has(word)) continue;
      if (token.startsWith('#') && isApprovedHex(token)) continue;
      out.push({ rule: 'color', detail: `${property}: color-mix(… ${token} …)` });
    }
    return '';
  });
}

function auditColors(property, value, out) {
  const scanned = auditColorMix(property, value.replace(/url\([^)]*\)/g, ''), out);
  for (const match of scanned.matchAll(HEX_COLOR)) {
    if (!isApprovedHex(match[0])) {
      out.push({ rule: 'color', detail: `${property}: ${match[0]}` });
    }
  }
  for (const match of scanned.matchAll(FUNCTIONAL_COLOR)) {
    out.push({ rule: 'color', detail: `${property}: ${match[0]}…)` });
  }
  if (COLOR_PROPERTY.test(property)) {
    for (const token of scanned.split(/[\s,]+/)) {
      const word = token.toLowerCase();
      if (NAMED_COLORS.has(word) && !ALLOWED_COLOR_KEYWORDS.has(word)) {
        out.push({ rule: 'color', detail: `${property}: ${token}` });
      }
    }
  }
}

/**
 * Pure auditor for compiled CSS. Returns one violation per offending declaration part.
 * The policy is documented in auditCss.test.js.
 */
export function auditCss(css) {
  // Feature-query preludes are conditions, not styling; only their block contents are audited.
  const source = stripComments(css).replace(/@(?:supports|media|container)\b[^{]*/g, '');
  const declared = new Set(
    PREFLIGHT_FAMILY_VARIABLES.filter((name) => new RegExp(`${name}\\s*:`).test(source)),
  );
  const out = [];

  if (source.toLowerCase().includes(LEGACY_ACCENT)) {
    out.push({ rule: 'legacy-accent', detail: 'retired lime accent present' });
  }

  for (const match of source.matchAll(/([-\w]+)\s*:\s*([^;{}]*)/g)) {
    const property = (match[1]).toLowerCase();
    const value = (match[2]).trim();
    const lowerValue = value.toLowerCase();
    const isCustomProperty = property.startsWith('--');

    if (!isCustomProperty) {
      if (property === 'border-radius' || /^border-[a-z]+-[a-z]+-radius$/.test(property)) {
        if (!/^0(?:px)?(?:\s+0(?:px)?)*$/.test(lowerValue)) out.push({ rule: 'border-radius', detail: `${property}: ${value}` });
      }
      if (property === 'box-shadow') auditShadow('box-shadow', property, value, out);
      if (property === 'text-shadow') auditShadow('text-shadow', property, value, out);
      const isBackdropFilter = property === 'backdrop-filter' || property === '-webkit-backdrop-filter';
      if (isBackdropFilter && !/^(?:var\([^()]*\)\s*)+$/.test(value)) {
        out.push({ rule: 'backdrop-filter', detail: `${property}: ${value}` });
      }
      if (property === 'filter' && !ALLOWED_FILTER.test(value)) {
        out.push({ rule: 'filter', detail: `${property}: ${value}` });
      }
      if (property === 'font-family') auditFamilies(property, value, declared, out);
    }

    if (lowerValue.includes('gradient(')) out.push({ rule: 'gradient', detail: `${property}: ${value}` });
    if (lowerValue.includes('blur(')) out.push({ rule: 'blur', detail: `${property}: ${value}` });
    if (lowerValue.includes('drop-shadow(')) out.push({ rule: 'drop-shadow', detail: `${property}: ${value}` });
    auditColors(property, value, out);
  }

  return out;
}
