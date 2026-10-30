import { ASSEMBLY_RANGE_ATTR } from '../../lib/layout/anchors.ts';

/**
 * The final scroll range (design Decision 25): an empty, hidden section after the poem.
 * Its box sets where the cubes gather; the fixed 3D layer is the pin, so it has no children.
 */
export function AssemblyRange() {
  return <section aria-hidden="true" {...{ [ASSEMBLY_RANGE_ATTR]: '' }} className="assembly-range" />;
}
