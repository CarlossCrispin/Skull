import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../../styles/tokens.js';
import { contrastRatio, MIN_TEXT_CONTRAST } from '../../styles/contrast.js';
import { HudCard } from './HudCard.jsx';

describe('HudCard', () => {
  it('frames its children with the shared chamfer frame', () => {
    const { container } = render(<HudCard>Offering</HudCard>);
    expect(container.querySelectorAll('svg[data-glass-frame]')).toHaveLength(1);
    expect(screen.getByText('Offering')).toBeInTheDocument();
  });

  it('pads the content uniformly and draws no radius, border or shadow', () => {
    const { container } = render(<HudCard>Offering</HudCard>);
    const root = container.firstElementChild;
    expect(root).toHaveClass('relative');
    const body = screen.getByText('Offering');
    expect(body).toHaveClass('p-5');
    expect(root.outerHTML).not.toMatch(/rounded|shadow|\bborder\b|blur|gradient/);
  });

  it('renders no badge unless a label is given', () => {
    const { container } = render(<HudCard>Offering</HudCard>);
    expect(container.querySelector('[data-hud-badge]')).toBeNull();
  });

  it('renders a square accent badge with the label above the card', () => {
    const { container } = render(<HudCard label="Nodo 01">Offering</HudCard>);
    const badge = container.querySelector('[data-hud-badge]');
    expect(badge.textContent).toBe('Nodo 01');
    expect(badge).toHaveClass('bg-accent', 'label-mono', 'bottom-full', 'absolute');
    expect(badge.className).not.toMatch(/rounded/);
  });

  it('appends the caller classes to the root', () => {
    const { container } = render(<HudCard className="w-64">Offering</HudCard>);
    expect(container.firstElementChild).toHaveClass('w-64');
  });

  it('keeps the accent badge by default', () => {
    const { container } = render(<HudCard label="Nodo 01">Offering</HudCard>);
    const badge = container.querySelector('[data-hud-badge]');
    expect(badge).toHaveClass('bg-accent', 'text-bg');
    expect(badge).not.toHaveClass('bg-signal');
  });

  it('paints the badge with the signal token and ink text for tone signal', () => {
    const { container } = render(
      <HudCard label="//FECHA_ 01–02.NOV" tone="signal">
        Offering
      </HudCard>,
    );
    const badge = container.querySelector('[data-hud-badge]');
    expect(badge).toHaveClass('bg-signal', 'text-ink');
    expect(badge).not.toHaveClass('bg-accent', 'text-bg');
    expect(contrastRatio(COLORS.ink, COLORS.signal)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});
