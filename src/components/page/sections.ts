import type { ComponentType } from 'react';
import { PlaceholderFrame } from '../frames/PlaceholderFrame.tsx';
import { AssemblyRange } from './AssemblyRange.tsx';

export interface SectionProps {
  reducedMotion: boolean;
  /** True once the opening is done; frames stay hidden until then. */
  revealGate: boolean;
}

export interface SectionEntry {
  id: string;
  Component: ComponentType<SectionProps>;
}

/** Ordered page sections. A future section is added by appending one entry. */
export const SECTIONS: readonly SectionEntry[] = [
  { id: 'placeholder', Component: PlaceholderFrame },
  { id: 'assembly-range', Component: AssemblyRange },
];
