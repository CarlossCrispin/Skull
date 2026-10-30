import { hudEntrance } from '../../lib/motion/hudEntrance.js';
import { useScrollProgress } from '../../lib/scroll/useScrollProgress.js';
import { HUD_GUTTER_CLASSES, HUD_GUTTER_RIGHT_CLASSES } from '../../styles/layout.js';
import { Barcode } from '../hud/Barcode.jsx';
import { ElbowConnector } from '../hud/ConnectorLine.jsx';
import { DataRow } from '../hud/DataRow.jsx';
import { GridLines } from '../hud/GridLines.jsx';
import { HudCard } from '../hud/HudCard.jsx';
import { SkullAnnotations } from '../hud/SkullAnnotations.jsx';
import { Ruler } from '../hud/Ruler.jsx';
import { FrameNav } from '../nav/FrameNav.jsx';

export const FRAME_00_ID = 'frame-00';
const NEXT_FRAME_ID = 'frame-01';

// Entrance schedule in ms after the opening gate (the motionsite reference): nav is owned by FrameNav.
const TITLE_MS = 400;
const SUBLINE_MS = 500;
const RULER_MS = 700;
const GRID_LINES_MS = 600;
const GRID_MARKS_MS = 1000;
const CTA_MS = 900;
const INFO_CARD_MS = 1100;
const NODES_MS = 1300;
const NODE_STEP_MS = 150;
const LABEL_TO_CONNECTOR_MS = 100;
const LABEL_TO_BOX_MS = 500;

const GRID_VERTICAL = ['25%', '75%'];
const NODE_TOP = '15%';
const GRID_HORIZONTAL = ['25%', '75%'];

/**
 * The three nodes above the skull, in one row inside the upper band (15% down to about 40% of the frame),
 * so they never meet the title block anchored at the bottom. Positions are percents of the frame; `from` is the
 * connector start at the box edge, `to` the point it aims at near the skull. Copy is limited to the verified list.
 */
const NODES = [
  {
    id: 'mictlan',
    label: '[ MICTLÁN ]',
    body: 'Inframundo mexica de nueve niveles.',
    edge: 'left-[8%]',
    from: { x: 31, y: 24 },
    elbowX: 37,
    to: { x: 46, y: 36 },
  },
  {
    id: 'coord',
    label: '[ COORD_ ]',
    body: '19.4326° N · 99.1332° O',
    edge: 'left-[39%]',
    from: { x: 50, y: 32 },
    elbowX: 50,
    to: { x: 50, y: 38 },
  },
  {
    id: 'unesco',
    label: '[ UNESCO_2008 ]',
    body: 'Patrimonio cultural inmaterial de la humanidad.',
    edge: 'right-[13%]',
    from: { x: 64, y: 24 },
    elbowX: 60,
    to: { x: 54, y: 36 },
  },
];

/**
 * Frame 00, the boot hero: nav, title, grid, three nodes, a scroll-bound ruler, the CTA and the info
 * card, over the voxel skull, which stays the visual center. Everything waits for `revealGate`, the end
 * of the opening, then enters in the reference order (labels and connectors before their boxes).
 *
 * @param {SectionProps} props
 */
export function Frame00Boot({ reducedMotion, revealGate, skullAssembled }) {
  const progress = useScrollProgress();
  const gate = { revealGate, reducedMotion };
  const animate = revealGate && !reducedMotion;
  const decorClass = revealGate || reducedMotion ? '' : 'invisible';
  const entrance = (utility, delayMs) => hudEntrance(utility, gate, delayMs);
  const title = entrance('hud-fade-up', TITLE_MS);
  const subline = entrance('hud-fade-up', SUBLINE_MS);
  const ruler = entrance('hud-slide-left', RULER_MS);
  const cta = entrance('hud-fade-up', CTA_MS);
  const infoCard = entrance('hud-fade-up', INFO_CARD_MS);

  const goToNextFrame = () => {
    document.getElementById(NEXT_FRAME_ID)?.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  };

  return (
    <section id={FRAME_00_ID} className="relative z-10 flex min-h-svh flex-col overflow-x-clip">
      <FrameNav revealGate={revealGate} reducedMotion={reducedMotion} />

      <div data-hud-decor="" aria-hidden="true" className={decorClass}>
        <GridLines
          vertical={GRID_VERTICAL}
          horizontal={GRID_HORIZONTAL}
          animated={animate}
          delayMs={GRID_LINES_MS}
          markDelayMs={GRID_MARKS_MS}
        />
      </div>

      <div className={`mt-auto pb-8 md:pb-12 ${HUD_GUTTER_CLASSES}`}>
        <h1
          style={title.style}
          className={`font-display text-[clamp(3rem,13vw,8rem)] uppercase md:whitespace-nowrap md:text-[clamp(3rem,9.5vw,8rem)] leading-display text-ink ${title.className}`}
        >
          Protocolo Ofrenda
        </h1>
        <p style={subline.style} className={`label-mono mt-3 text-ink ${subline.className}`}>
          Día de Muertos · sistema de memoria
        </p>
      </div>

      <SkullAnnotations reducedMotion={reducedMotion} revealGate={revealGate} skullAssembled={skullAssembled} />

      <div data-hud-nodes="" className="hidden md:block">
        <div data-hud-decor="" aria-hidden="true" className={decorClass}>
          {NODES.map((node, index) => (
            <ElbowConnector
              key={node.id}
              from={node.from}
              to={node.to}
              elbowX={node.elbowX}
              draw={animate}
              delayMs={NODES_MS + index * NODE_STEP_MS + LABEL_TO_CONNECTOR_MS}
            />
          ))}
        </div>
        {NODES.map((node, index) => {
          const labelMs = NODES_MS + index * NODE_STEP_MS;
          const label = entrance('hud-fade-up', labelMs);
          const box = entrance('hud-fade-up', labelMs + LABEL_TO_BOX_MS);
          return (
            <div
              key={node.id}
              data-hud-node=""
              data-connector-ms={labelMs + LABEL_TO_CONNECTOR_MS}
              style={{ top: NODE_TOP }}
              className={`absolute w-[24%] min-w-44 max-w-64 ${node.edge}`}
            >
              <span
                data-node-label=""
                style={label.style}
                className={`label-mono mb-2 block text-ink ${label.className}`}
              >
                {node.label}
              </span>
              <div data-node-box="" style={box.style} className={box.className}>
                <HudCard>
                  <p className="label-mono text-ink">{node.body}</p>
                </HudCard>
              </div>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        data-hud-ruler=""
        style={ruler.style}
        className={`absolute top-[15%] hidden h-[30%] w-10 md:block ${HUD_GUTTER_RIGHT_CLASSES} ${ruler.className}`}
      >
        <Ruler progress={progress} className="h-full" />
      </div>

      <div
        className={`flex flex-col items-start gap-6 pb-5 md:flex-row md:items-end md:justify-between md:pb-[35px] ${HUD_GUTTER_CLASSES}`}
      >
        <button
          type="button"
          onClick={goToNextFrame}
          style={cta.style}
          className={`label-mono bg-signal px-6 py-4 text-ink ${cta.className}`}
        >
          ✦ INICIAR PROTOCOLO
        </button>
        <div
          data-info-card=""
          style={infoCard.style}
          className={`mt-6 hidden w-96 max-w-full sm:block ${infoCard.className}`}
        >
          <HudCard label="//FECHA_ 01–02.NOV" tone="signal">
            <p className="text-body text-ink">De fines de octubre a inicios de noviembre, la memoria se enciende.</p>
            <div className="mt-4 flex items-center gap-4">
              <Barcode seed="MICTLAN.OS" className="h-8 w-24 shrink-0" />
              <div className="flex-1">
                <DataRow label="SYS" value="MICTLAN.OS" />
              </div>
            </div>
          </HudCard>
        </div>
      </div>
    </section>
  );
}
