import { useId } from 'react';

/**
 * @typedef {object} DataRowProps
 * @property {string} label - Label text without the `//` and `_` markers, which the row adds as decoration.
 * @property {ReactNode} value
 * @property {boolean} [wrap] - Let a long value wrap under the label (left aligned) instead of staying on one line.
 */

const LINE_WRAP = 'flex-wrap';
const VALUE_WRAP = 'whitespace-normal text-left';
const VALUE_ONE_LINE = 'shrink-0 whitespace-nowrap text-right';
const DOT = 'absolute top-1/2 size-1 -translate-y-1/2 bg-gray-400';

/**
 * One HUD data row: `//LABEL_` on the left, the value right-aligned, and a 1 px rule below with a
 * square dot at each end. It is a group named by its label, so a screen reader reads the label and
 * then the value; the markers and the rule are aria-hidden.
 */
export function DataRow({ label, value, wrap = false }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <div data-datarow-line="" className={`flex items-baseline justify-between gap-x-4 gap-y-1 pb-2 ${wrap ? LINE_WRAP : ''}`}>
        <span data-datarow-label="" className="label-mono min-w-0 truncate text-gray-400">
          <span aria-hidden="true">//</span>
          <span id={labelId}>{label}</span>
          <span aria-hidden="true">_</span>
        </span>
        <span className={`label-mono text-ink ${wrap ? VALUE_WRAP : VALUE_ONE_LINE}`}>{value}</span>
      </div>
      <div data-datarow-rule="" aria-hidden="true" className="relative border-t border-gray-400">
        <span data-datarow-dot="" className={`${DOT} left-0`} />
        <span data-datarow-dot="" className={`${DOT} right-0`} />
      </div>
    </div>
  );
}
