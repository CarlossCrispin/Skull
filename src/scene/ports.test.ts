import { Camera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { failOnUnrunnablePrograms, type ProgramDiagnosticsSource } from './ports.ts';

type Programs = Array<{ diagnostics?: { runnable: boolean } }> | null;

function fakeRenderer(programs: Programs): ProgramDiagnosticsSource & { renders: number } {
  const renderer = {
    info: { programs },
    renders: 0,
    render(): void {
      renderer.renders++;
    },
  };
  return renderer;
}

describe('failOnUnrunnablePrograms', () => {
  it('renders normally while every program is runnable or not yet diagnosed', () => {
    const renderer = fakeRenderer([{ diagnostics: { runnable: true } }, {}]);
    failOnUnrunnablePrograms(renderer);
    expect(() => renderer.render(new Scene(), new Camera())).not.toThrow();
    expect(renderer.renders).toBe(1);
  });

  it('throws after the render that produced an unrunnable program', () => {
    const programs: NonNullable<Programs> = [];
    const renderer = fakeRenderer(programs);
    failOnUnrunnablePrograms(renderer);
    programs.push({ diagnostics: { runnable: false } });
    expect(() => renderer.render(new Scene(), new Camera())).toThrow(/shader/i);
    expect(renderer.renders).toBe(1);
  });

  it('tolerates a renderer that does not expose programs', () => {
    const renderer = fakeRenderer(null);
    failOnUnrunnablePrograms(renderer);
    expect(() => renderer.render(new Scene(), new Camera())).not.toThrow();
  });
});
