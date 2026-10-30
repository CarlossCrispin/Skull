import { useLayoutEffect, useRef, useState } from 'react';
import {
  ANNOTATION_CANDIDATES,
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  placeAnnotations,
  rollsRandom,
} from '../../lib/hud/annotationSlots.js';
import { useClock } from '../../lib/hud/useClock.js';
import { hudEntrance } from '../../lib/motion/hudEntrance.js';
import { HudCard } from './HudCard.jsx';

// Entrance schedule in ms after the opening gate: after the three nodes (1300 + 2 x 150), 120 ms apart.
const FIRST_MS = 1600;
const STEP_MS = 120;
const CARD_COUNT = 4;
const ROLL_COUNT = 32;
const RESIZE_DEBOUNCE_MS = 50;
const LEADER_CLASS = {
  left: 'left-full flex-row',
  right: 'right-full flex-row-reverse',
};
const CARD_SIZE = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };

/** Rect of `el` relative to `origin`, grown to include its badge (a label sitting above its top edge). */
function relativeRect(el, origin) {
  let { left, top, right, bottom } = el.getBoundingClientRect();
  for (const badge of el.querySelectorAll('[data-hud-badge]')) {
    const b = badge.getBoundingClientRect();
    if (b.right > b.left && b.bottom > b.top) {
      left = Math.min(left, b.left);
      top = Math.min(top, b.top);
      right = Math.max(right, b.right);
      bottom = Math.max(bottom, b.bottom);
    }
  }
  return { left: left - origin.left, top: top - origin.top, right: right - origin.left, bottom: bottom - origin.top };
}

/** Measures the layer and every `[data-hud-avoid]` obstacle of the frame, then picks the card positions. */
function measureAndPlace(layer, random) {
  const origin = layer.getBoundingClientRect();
  const viewport = {
    width: origin.width > 0 ? origin.width : window.innerWidth,
    height: origin.height > 0 ? origin.height : window.innerHeight,
  };
  const scope = layer.closest('section') ?? document;
  const obstacles = [...scope.querySelectorAll('[data-hud-avoid]')].map((el) => relativeRect(el, origin));
  return placeAnnotations({
    candidates: ANNOTATION_CANDIDATES,
    cardSize: CARD_SIZE,
    obstacles,
    viewport,
    random,
    count: CARD_COUNT,
  });
}

/**
 * Up to four subtle annotation cards over the assembled skull: coordinates, the Día de Muertos date, the
 * live Mexico City time and the operator name. Their positions are measured at runtime so they never
 * cover the title, nodes, CTA, info card, ruler or nav (elements marked `data-hud-avoid`): after mount and
 * on resize `placeAnnotations` picks one free spot per skull region. When space runs out fewer cards are
 * shown, SYS_TIME and OPERADOR last to go. The random rolls are drawn once per page load (`random` is
 * injectable for tests), so a resize re-places the same layout order. Each card has a short leader and a
 * `+` tick toward the skull. They are decorative except the clock, hidden below md, and fade out once the
 * skull is no longer assembled.
 *
 * @param {{ reducedMotion: boolean, revealGate: boolean, skullAssembled: boolean, random?: () => number }} props
 */
export function SkullAnnotations({ reducedMotion, revealGate, skullAssembled, random = Math.random }) {
  const clock = useClock();
  const layerRef = useRef(null);
  const [rolls] = useState(() => Array.from({ length: ROLL_COUNT }, () => random()));
  const [slots, setSlots] = useState([]);
  const gate = { revealGate, reducedMotion };

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (layer === null) {
      return;
    }
    const place = () => setSlots(measureAndPlace(layer, rollsRandom(rolls)));
    place();
    let timer = null;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(place, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [rolls]);

  // Display order is fixed; slots go to the cards by priority, so a shortage drops the last ones first.
  const cards = [
    { label: '//COORD_', value: '19.4326° N · 99.1332° O', priority: 2 },
    { label: '//DÍA_DE_MUERTOS', value: '01–02.NOV', priority: 3 },
    {
      label: '//SYS_TIME',
      priority: 0,
      value: (
        <time dateTime={clock.iso ?? undefined} aria-live="off">
          {clock.text}
        </time>
      ),
    },
    { label: '//OPERADOR_', value: 'CarlosCrispin', priority: 1 },
  ];
  const shown = cards
    .map((card) => ({ ...card, slot: slots[card.priority] }))
    .filter((card) => card.slot !== undefined);
  const gone = !skullAssembled;
  const rootClass = gone ? (reducedMotion ? 'invisible' : 'hud-fade-out') : '';

  return (
    <div
      ref={layerRef}
      data-annotations=""
      aria-hidden={gone ? 'true' : undefined}
      className={`pointer-events-none absolute inset-0 hidden md:block ${rootClass}`}
    >
      {shown.map((card, index) => {
        const { slot } = card;
        const entrance = hudEntrance('hud-scale-in', gate, FIRST_MS + index * STEP_MS);
        return (
          <div
            key={card.label}
            data-annotation={slot.id}
            data-side={slot.side}
            style={{ ...entrance.style, left: `${slot.left}px`, top: `${slot.top}px` }}
            className={`absolute w-48 ${entrance.className}`}
          >
            <HudCard padding="p-2" className="glass-frost chamfer-clip">
              <p className="label-mono flex items-center gap-2 text-ink">
                <span className="size-1 shrink-0 bg-signal text-ink" />
                {card.label}
              </p>
              <p className="mt-1 whitespace-nowrap font-mono text-[11px] text-ink">{card.value}</p>
            </HudCard>
            <span
              data-leader=""
              aria-hidden="true"
              className={`absolute top-1/2 flex -translate-y-1/2 items-center ${LEADER_CLASS[slot.side]}`}
            >
              <span className="block h-px w-6 bg-gray-400" />
              <span className="label-mono text-gray-400">+</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
