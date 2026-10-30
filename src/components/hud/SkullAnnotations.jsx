import { useState } from 'react';
import { pickSlots } from '../../lib/hud/annotationSlots.js';
import { useClock } from '../../lib/hud/useClock.js';
import { hudEntrance } from '../../lib/motion/hudEntrance.js';
import { HudCard } from './HudCard.jsx';

// Entrance schedule in ms after the opening gate: after the three nodes (1300 + 2 x 150), 120 ms apart.
const FIRST_MS = 1600;
const STEP_MS = 120;
const SIDE_CLASS = { left: 'left-[24%]', right: 'right-[24%]' };
const LEADER_CLASS = {
  left: 'left-full flex-row',
  right: 'right-full flex-row-reverse',
};

/**
 * Four subtle annotation cards over the assembled skull: coordinates, the Día de Muertos date, the live
 * Mexico City time and the operator name. Each sits at one of four distinct random slots picked once per
 * page load (`random` is injectable for tests), with a short leader and a `+` tick toward the skull. They
 * are decorative except the clock, hidden below md, and fade out once the skull is no longer assembled.
 *
 * @param {{ reducedMotion: boolean, revealGate: boolean, skullAssembled: boolean, random?: () => number }} props
 */
export function SkullAnnotations({ reducedMotion, revealGate, skullAssembled, random = Math.random }) {
  const clock = useClock();
  const [slots] = useState(() => pickSlots(random));
  const gate = { revealGate, reducedMotion };
  const cards = [
    { label: '//COORD_', value: '19.4326° N · 99.1332° O' },
    { label: '//DÍA_DE_MUERTOS', value: '01–02.NOV' },
    {
      label: '//SYS_TIME',
      value: (
        <time dateTime={clock.iso ?? undefined} aria-live="off">
          {clock.text}
        </time>
      ),
    },
    { label: '//OPERADOR_', value: 'CarlosCrispin' },
  ];
  const gone = !skullAssembled;
  const rootClass = gone ? (reducedMotion ? 'invisible' : 'hud-fade-out') : '';

  return (
    <div
      aria-hidden={gone ? 'true' : undefined}
      className={`pointer-events-none absolute inset-0 hidden md:block ${rootClass}`}
    >
      {cards.map((card, index) => {
        const slot = slots[index];
        const entrance = hudEntrance('hud-scale-in', gate, FIRST_MS + index * STEP_MS);
        return (
          <div
            key={card.label}
            data-annotation={slot.id}
            style={{ ...entrance.style, top: `${slot.top}%` }}
            className={`absolute w-48 ${SIDE_CLASS[slot.side]} ${entrance.className}`}
          >
            <HudCard padding="p-2" className="glass-frost">
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
