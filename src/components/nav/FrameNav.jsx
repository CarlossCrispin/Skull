import { useEffect, useRef, useState } from 'react';
import { hudEntrance } from '../../lib/motion/hudEntrance.js';
import { HUD_GUTTER_CLASSES } from '../../styles/layout.js';

/**
 * @typedef {object} FrameNavProps
 * @property {boolean} revealGate - True once the skull opening is done; the entrance waits for it.
 * @property {boolean} reducedMotion
 */

/** The five frames after the boot hero, in page order. */
export const NAV_ITEMS = [
  { number: '01.', label: 'CEMPASÚCHIL', href: '#frame-01' },
  { number: '02.', label: 'OFRENDA', href: '#frame-02' },
  { number: '03.', label: 'PAPEL_PICADO', href: '#frame-03' },
  { number: '04.', label: 'CALAVERA', href: '#frame-04' },
  { number: '05.', label: 'CIERRE', href: '#frame-05' },
];

const MENU_ID = 'frame-nav-menu';
const WORDMARK_MS = 200;
const FIRST_ITEM_MS = 350;
const ITEM_STEP_MS = 100;
const STATUS_MS = 800;
const MENU_BUTTON_MS = 350;

/**
 * Top navigation of the boot frame: wordmark, the numbered frame links (from lg) and the system tag
 * with a status chip; below lg a menu button opens a panel with the same links. The only state is
 * `menuOpen`. Opening moves focus to the first link; Escape, a link click or the button close the panel,
 * and closing from inside it returns focus to the button.
 */
export function FrameNav({ revealGate, reducedMotion }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const wasOpen = useRef(false);
  const gate = { revealGate, reducedMotion };
  const entrance = (name, utility, delayMs) => {
    const { className, style } = hudEntrance(utility, gate, delayMs);
    return { 'data-nav-entrance': name, className, style };
  };

  useEffect(() => {
    if (menuOpen) {
      panelRef.current?.querySelector('a')?.focus();
    } else if (wasOpen.current) {
      buttonRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const wordmark = entrance('wordmark', 'hud-slide-right', WORDMARK_MS);
  const status = entrance('status', 'hud-slide-left', STATUS_MS);
  const chip = entrance('chip', 'hud-slide-left', STATUS_MS + ITEM_STEP_MS);
  const menuButton = entrance('menu-button', 'hud-fade-up', MENU_BUTTON_MS);
  return (
    <nav
      aria-label="Navegación principal"
      className={`relative z-50 flex h-16 items-center justify-between ${HUD_GUTTER_CLASSES}`}
    >
      <span
        {...wordmark}
        className={`font-display text-xl uppercase leading-display ${wordmark.className}`}
      >
        PROTOCOLO // OFRENDA
      </span>
      <ul className="hidden gap-10 lg:flex">
        {NAV_ITEMS.map((item, index) => {
          const props = entrance(`item-${index}`, 'hud-fade-up', FIRST_ITEM_MS + index * ITEM_STEP_MS);
          return (
            <li key={item.href} {...props}>
              <a href={item.href} className="label-mono inline-flex gap-[3px] text-ink">
                <span className="text-signal">{item.number}</span>
                {' '}
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <div data-nav-status="" className="hidden items-center gap-4 lg:flex">
        <span {...status} className={`label-mono text-ink ${status.className}`}>
          //SYS_ MICTLAN.OS
        </span>
        <span
          {...chip}
          data-nav-chip=""
          className={`label-mono inline-flex items-center gap-2 bg-signal px-2 py-1 text-ink ${chip.className}`}
        >
          EN LÍNEA
        </span>
      </div>
      <button
        {...menuButton}
        ref={buttonRef}
        type="button"
        aria-expanded={menuOpen}
        aria-controls={MENU_ID}
        onClick={() => setMenuOpen((open) => !open)}
        className={`label-mono bg-signal px-3 py-2 text-ink lg:hidden ${menuButton.className}`}
      >
        {menuOpen ? 'CERRAR' : 'MENÚ'}
      </button>
      {menuOpen ? (
        <div
          id={MENU_ID}
          ref={panelRef}
          className={`nav-panel fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto py-8 lg:hidden ${HUD_GUTTER_CLASSES}`}
        >
          <ul className="flex flex-col gap-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex gap-[3px] font-display text-4xl uppercase leading-display text-ink"
                >
                  <span className="text-signal">{item.number}</span>
                  {' '}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
