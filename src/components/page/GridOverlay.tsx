// Decorative exposed grid, a fixed full-viewport layer behind the content: 1 px gray-200 lines and `+` crosshairs, drawn only with borders.
const LINE = 'absolute border-gray-200';

function Crosshair({ position }: { position: string }) {
  return (
    <span data-grid="crosshair" className={`absolute size-4 -translate-x-1/2 -translate-y-1/2 ${position}`}>
      <span className="absolute left-0 top-1/2 w-full border-t border-gray-200" />
      <span className="absolute left-1/2 top-0 h-full border-l border-gray-200" />
    </span>
  );
}

export function GridOverlay() {
  return (
    <div aria-hidden="true" data-grid-overlay="" className="pointer-events-none fixed inset-0">
      <span data-grid="line" className={`${LINE} inset-y-0 left-1/4 border-l`} />
      <span data-grid="line" className={`${LINE} inset-y-0 left-3/4 border-l`} />
      <span data-grid="line" className={`${LINE} inset-x-0 top-1/4 border-t`} />
      <span data-grid="line" className={`${LINE} inset-x-0 top-3/4 border-t`} />
      <Crosshair position="left-1/4 top-1/4" />
      <Crosshair position="left-3/4 top-1/4" />
      <Crosshair position="left-1/4 top-3/4" />
      <Crosshair position="left-3/4 top-3/4" />
    </div>
  );
}
