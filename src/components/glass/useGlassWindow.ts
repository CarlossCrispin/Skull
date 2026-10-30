import { useEffect, useRef, type RefObject } from 'react';
import { GLASS_CHAMFER_PX, GLASS_COPY_OVERSCAN_PX, GLASS_COPY_PIXEL_RATIO } from '../../lib/glass/constants.ts';
import { glassClipPolygon } from '../../lib/glass/chamfer.ts';
import type { FrameMirror } from '../../lib/glass/frameMirror.ts';
import { glassWindowRect, type PanelBox } from '../../lib/glass/glassWindow.ts';
import { drawGlassCopy } from './drawGlassCopy.ts';

export interface UseGlassWindowOptions {
  panelRef: RefObject<HTMLElement | null>;
  windowRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  mirror: FrameMirror;
  /** The panel is hidden (opening not done): published frames are not drawn. */
  suspended: boolean;
}

/**
 * Drives the fixed glass window (design Decisions 37, 38, 45). The window is cropped to the card
 * rect and its chamfered corners (`clip-path`, flat at an end the card has already left). The
 * card box is measured only on mount and when the card or the viewport resizes; scrolling just
 * recomputes the clipped rect from `window.scrollY` and writes styles only when it changes (never in the middle of
 * the poem). The copy canvas is drawn inside the mirror sink, in the same task as the scene
 * render, and never on scroll.
 */
export function useGlassWindow({ panelRef, windowRef, canvasRef, mirror, suspended }: UseGlassWindowOptions): void {
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  const wasSuspended = useRef(suspended);

  useEffect(() => {
    const panel = panelRef.current;
    const glassWindow = windowRef.current;
    const canvas = canvasRef.current;
    if (panel === null || glassWindow === null || canvas === null) {
      return;
    }

    let box: PanelBox = { left: 0, top: 0, width: 0, height: 0 };
    let viewport = { w: window.innerWidth, h: window.innerHeight };
    let lastKey = '';
    let ctx: CanvasRenderingContext2D | null = null;

    const measure = (): void => {
      const rect = panel.getBoundingClientRect();
      box = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    };

    /** Returns true when the backing store changed (a resize clears it, so a redraw is due). */
    const sizeCopy = (): boolean => {
      const width = Math.round((viewport.w + 2 * GLASS_COPY_OVERSCAN_PX) * GLASS_COPY_PIXEL_RATIO);
      const height = Math.round((viewport.h + 2 * GLASS_COPY_OVERSCAN_PX) * GLASS_COPY_PIXEL_RATIO);
      if (canvas.width === width && canvas.height === height) {
        return false;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${viewport.w + 2 * GLASS_COPY_OVERSCAN_PX}px`;
      canvas.style.height = `${viewport.h + 2 * GLASS_COPY_OVERSCAN_PX}px`;
      return true;
    };

    const applyRect = (): void => {
      const rect = glassWindowRect(box, window.scrollY, viewport);
      const clip = glassClipPolygon(
        {
          width: rect.width,
          windowTop: rect.top,
          windowHeight: rect.height,
          cardTop: box.top - window.scrollY,
          cardHeight: box.height,
        },
        GLASS_CHAMFER_PX,
      );
      const key = rect.visible
        ? `${rect.left}|${rect.width}|${rect.top}|${rect.height}|${viewport.w}|${viewport.h}|${clip}`
        : 'hidden';
      if (key === lastKey) {
        return;
      }
      lastKey = key;
      if (!rect.visible) {
        glassWindow.style.display = 'none';
        return;
      }
      glassWindow.style.display = 'block';
      glassWindow.style.left = `${rect.left}px`;
      glassWindow.style.width = `${rect.width}px`;
      glassWindow.style.top = `${rect.top}px`;
      glassWindow.style.height = `${rect.height}px`;
      glassWindow.style.clipPath = clip;
      canvas.style.transform = `translate(${rect.copyX - GLASS_COPY_OVERSCAN_PX}px, ${rect.copyY - GLASS_COPY_OVERSCAN_PX}px)`;
    };

    const onResize = (): void => {
      viewport = { w: window.innerWidth, h: window.innerHeight };
      measure();
      const resized = sizeCopy();
      lastKey = '';
      applyRect();
      if (resized) {
        mirror.requestFrame();
      }
    };

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      measure();
      applyRect();
    });
    observer?.observe(panel);
    window.addEventListener('scroll', applyRect, { passive: true });
    window.addEventListener('resize', onResize);

    measure();
    sizeCopy();
    applyRect();

    const unsubscribe = mirror.subscribe((source) => {
      if (suspendedRef.current) {
        return;
      }
      ctx ??= canvas.getContext('2d');
      if (ctx !== null) {
        drawGlassCopy(ctx, source, viewport.w, viewport.h, GLASS_COPY_OVERSCAN_PX);
      }
    });
    mirror.requestFrame();

    return () => {
      unsubscribe();
      observer?.disconnect();
      window.removeEventListener('scroll', applyRect);
      window.removeEventListener('resize', onResize);
    };
  }, [panelRef, windowRef, canvasRef, mirror]);

  useEffect(() => {
    if (wasSuspended.current && !suspended) {
      mirror.requestFrame();
    }
    wasSuspended.current = suspended;
  }, [suspended, mirror]);
}
