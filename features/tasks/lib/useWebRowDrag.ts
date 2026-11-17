import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { DRAG_ACTIVATION_DELAY_MS } from '@/shared/constants/timing';
import { computeDropIndex, moveItem } from '@/features/tasks/lib/dropIndex';

// Web-only (DOM) reordering by dragging a whole row. Rows register an outer element
// (measured, never transformed) and an inner element (moved with transforms); transforms
// are written straight to the DOM so the list does not re-render on every pointer move.
//
// Mouse: the row starts moving once the pointer travels past MOUSE_DRAG_THRESHOLD; a click
// still opens the details. Touch (as on native): a quick swipe scrolls the list; holding
// the row for TOUCH_ACTIVATION_DELAY_MS lifts it, and moving then drags it. Holding without
// moving for DRAG_ACTIVATION_DELAY_MS (either pointer) and releasing calls `onHold` (enter
// selection mode); a shorter press is a tap, and a drag never enters selection mode. Rows must not also handle long presses themselves while dragging is enabled.

const MOUSE_DRAG_THRESHOLD = 8;
// Barely longer than a tap, so a drag starts almost at once while a quick swipe still
// scrolls. Well below the browser's own long press (~500ms).
const TOUCH_ACTIVATION_DELAY_MS = 150;
// A touch that moves this far before the row lifts is a scroll.
const TOUCH_SCROLL_SLOP = 10;
// Movement after the row lifts that turns the hold into a drag.
const TOUCH_DRAG_THRESHOLD = 6;
const AUTO_SCROLL_EDGE = 64;
const AUTO_SCROLL_MAX_SPEED = 18;
const SHIFT_TRANSITION = 'transform 150ms ease';
const LIFT_SHADOW = '0 10px 28px rgba(15, 23, 42, 0.22)';

interface RowEls {
  outer: HTMLElement;
  inner: HTMLElement;
}

interface Pending {
  id: number;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  // Touch: the row is lifted and moving drags it.
  armed: boolean;
  // Held still long enough that releasing counts as a hold (selection mode).
  holdReady: boolean;
}

interface DragState {
  id: number;
  fromIndex: number;
  grabOffset: number;
  pointerY: number;
  toIndex: number;
  shift: number;
}

const preventDefault = (event: Event) => event.preventDefault();

// Swallows the click that may follow a release, so a drop or hold does not also tap the row.
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 350);
}

// Stops a scroll container from scrolling (including a running fling); returns the undo.
// Programmatic scrolling (auto-scroll while dragging) still works on overflow: hidden.
function freezeScroll(node: HTMLElement | null) {
  const root = document.documentElement.style;
  const prevOverscroll = root.overscrollBehavior;
  // Also no pull-to-refresh while a row is lifted.
  root.overscrollBehavior = 'none';
  if (!node) {
    return () => {
      root.overscrollBehavior = prevOverscroll;
    };
  }
  const { overflowX, overflowY } = node.style;
  const top = node.scrollTop;
  node.style.overflowX = 'hidden';
  node.style.overflowY = 'hidden';
  node.scrollTop = top;
  return () => {
    node.style.overflowX = overflowX;
    node.style.overflowY = overflowY;
    root.overscrollBehavior = prevOverscroll;
  };
}

function setBodyDragging(on: boolean, cursor?: string) {
  const style = document.body.style as CSSStyleDeclaration & { webkitTouchCallout?: string };
  style.userSelect = on ? 'none' : '';
  style.webkitUserSelect = on ? 'none' : '';
  style.webkitTouchCallout = on ? 'none' : '';
  style.cursor = on && cursor ? cursor : '';
}

export function useWebRowDrag<T extends { id: number }>(
  items: readonly T[],
  enabled: boolean,
  onReorder: (next: T[]) => void,
  onHold: (id: number) => void,
  getScrollNode: () => HTMLElement | null
) {
  const rows = useRef(new Map<number, RowEls>());
  const pending = useRef<Pending | null>(null);
  const drag = useRef<DragState | null>(null);
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const latest = useRef({ items, enabled, onReorder, onHold });
  useLayoutEffect(() => {
    latest.current = { items, enabled, onReorder, onHold };
  });

  const register = useCallback((id: number, part: 'outer' | 'inner', el: HTMLElement | null) => {
    const current = rows.current.get(id);
    if (!el) {
      if (current) rows.current.delete(id);
      return;
    }
    if (part === 'outer') rows.current.set(id, { outer: el, inner: current?.inner ?? el });
    else rows.current.set(id, { outer: current?.outer ?? el, inner: el });
  }, []);

  const layout = useCallback(() => {
    const state = drag.current;
    if (!state) return;
    const list = latest.current.items;
    const mids = list.map((item) => {
      const els = rows.current.get(item.id);
      if (!els) return undefined;
      const rect = els.outer.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    const toIndex = computeDropIndex(state.fromIndex, mids, state.pointerY);
    state.toIndex = toIndex;

    list.forEach((item, index) => {
      const els = rows.current.get(item.id);
      if (!els) return;
      if (item.id === state.id) {
        const top = els.outer.getBoundingClientRect().top;
        els.inner.style.transform = `translateY(${state.pointerY - state.grabOffset - top}px)`;
        return;
      }
      let offset = 0;
      if (toIndex > state.fromIndex && index > state.fromIndex && index <= toIndex) {
        offset = -state.shift;
      } else if (toIndex < state.fromIndex && index >= toIndex && index < state.fromIndex) {
        offset = state.shift;
      }
      els.inner.style.transform = offset ? `translateY(${offset}px)` : '';
    });
  }, []);

  // Scrolls the list while the pointer is held near its top or bottom edge.
  const startAutoScroll = useCallback(() => {
    const tick = () => {
      const state = drag.current;
      const node = getScrollNode();
      if (!state || !node) {
        frame.current = null;
        return;
      }
      const rect = node.getBoundingClientRect();
      let speed = 0;
      if (state.pointerY < rect.top + AUTO_SCROLL_EDGE) {
        speed =
          -AUTO_SCROLL_MAX_SPEED *
          Math.min(1, (rect.top + AUTO_SCROLL_EDGE - state.pointerY) / AUTO_SCROLL_EDGE);
      } else if (state.pointerY > rect.bottom - AUTO_SCROLL_EDGE) {
        speed =
          AUTO_SCROLL_MAX_SPEED *
          Math.min(1, (state.pointerY - (rect.bottom - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE);
      }
      if (speed !== 0) {
        node.scrollTop += speed;
        layout();
      }
      frame.current = requestAnimationFrame(tick);
    };
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }, [getScrollNode, layout]);

  const lift = (els: RowEls) => {
    els.inner.style.transition = 'box-shadow 150ms ease';
    els.inner.style.position = 'relative';
    els.inner.style.zIndex = '10';
    els.inner.style.boxShadow = LIFT_SHADOW;
    els.inner.style.borderRadius = '14px';
  };

  const beginDrag = useCallback(
    (p: Pending, clientY: number) => {
      const list = latest.current.items;
      const fromIndex = list.findIndex((item) => item.id === p.id);
      const els = rows.current.get(p.id);
      if (fromIndex < 0 || !els) return false;

      // Keep the pointer on the dragged row: the release then lands on it rather than on
      // the row's Pressable, so no click (open details) follows the drop.
      // Touch drags run on touch events, which stay with the touched element anyway.
      if (!p.touch) {
        try {
          els.inner.setPointerCapture(p.pointerId);
        } catch {
          // The pointer may already be gone; the window listeners still end the drag.
        }
      }

      const rect = els.outer.getBoundingClientRect();
      const neighbour =
        rows.current.get(list[fromIndex + 1]?.id ?? -1) ??
        rows.current.get(list[fromIndex - 1]?.id ?? -1);
      const neighbourTop = neighbour?.outer.getBoundingClientRect().top;
      const shift = neighbourTop === undefined ? rect.height : Math.abs(neighbourTop - rect.top);

      drag.current = {
        id: p.id,
        fromIndex,
        grabOffset: p.startY - rect.top,
        pointerY: clientY,
        toIndex: fromIndex,
        shift,
      };
      rows.current.forEach(({ inner }, rowId) => {
        if (rowId !== p.id) inner.style.transition = SHIFT_TRANSITION;
      });
      lift(els);
      window.getSelection()?.removeAllRanges();
      setBodyDragging(true, 'grabbing');
      layout();
      startAutoScroll();
      return true;
    },
    [layout, startAutoScroll]
  );

  const resetRows = useCallback(() => {
    rows.current.forEach(({ inner }) => {
      inner.style.transition = '';
      inner.style.transform = '';
      inner.style.zIndex = '';
      inner.style.boxShadow = '';
      inner.style.borderRadius = '';
      inner.style.position = '';
    });
    setBodyDragging(false);
  }, []);

  // outcome: 'drop' commits a drag, 'release' ends a press (a hold if held long enough),
  // 'cancel' aborts.
  const end = useCallback(
    (outcome: 'drop' | 'release' | 'cancel') => {
      cleanup.current?.();
      cleanup.current = null;
      const p = pending.current;
      pending.current = null;
      const state = drag.current;
      drag.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      resetRows();

      if (state) {
        swallowNextClick();
        // A drag never enters selection mode, even when dropped back in place.
        if (outcome !== 'cancel' && state.toIndex !== state.fromIndex) {
          latest.current.onReorder(moveItem(latest.current.items, state.fromIndex, state.toIndex));
        }
        return;
      }
      if (outcome === 'release' && p?.holdReady) {
        swallowNextClick();
        latest.current.onHold(p.id);
      }
    },
    [resetRows]
  );

  // Abort a press or drag in progress if the list unmounts.
  useEffect(() => () => end('cancel'), [end]);

  const onPointerDown = useCallback(
    (id: number, event: ReactPointerEvent<HTMLElement>) => {
      if (!latest.current.enabled || event.button !== 0) return;
      if (pending.current || drag.current) return;
      const p: Pending = {
        id,
        pointerId: event.pointerId,
        touch: event.pointerType === 'touch',
        startX: event.clientX,
        startY: event.clientY,
        armed: false,
        holdReady: false,
      };
      pending.current = p;
      let unfreeze: (() => void) | null = null;

      const holdTimer = setTimeout(() => {
        if (pending.current !== p || drag.current) return;
        p.holdReady = true;
        // Tells a touch user that releasing now selects the task.
        if (p.touch) navigator.vibrate?.(15);
      }, DRAG_ACTIVATION_DELAY_MS);

      const liftTimer = p.touch
        ? setTimeout(() => {
            if (pending.current !== p) return;
            p.armed = true;
            // From here on the finger drags the row instead of scrolling the list. Freezing
            // the scroll container works whether or not the browser lets touchmove be
            // cancelled (it does not while a fling is still gliding), and stops such a fling.
            unfreeze = freezeScroll(getScrollNode());
            const els = rows.current.get(id);
            if (els) lift(els);
          }, TOUCH_ACTIVATION_DELAY_MS)
        : null;

      // Shared by mouse (pointer events) and touch (touch events) input.
      const handleMove = (x: number, y: number) => {
        let state = drag.current;
        if (!state) {
          if (!latest.current.enabled) {
            end('cancel');
            return false;
          }
          const distance = Math.hypot(x - p.startX, y - p.startY);
          if (p.touch && !p.armed) {
            // Moving before the row lifts: the browser scrolls, this press is over.
            if (distance > TOUCH_SCROLL_SLOP) end('cancel');
            return false;
          }
          if (!p.touch && distance < MOUSE_DRAG_THRESHOLD) return false;
          // A lifted row ignores finger jitter: below this it is still a hold (selection).
          if (p.touch && distance < TOUCH_DRAG_THRESHOLD) return true;
          if (!beginDrag(p, y)) {
            end('cancel');
            return false;
          }
          state = drag.current;
          if (!state) return false;
        }
        state.pointerY = y;
        layout();
        return true;
      };

      let detachInput: () => void;
      if (p.touch) {
        // Touch events keep arriving for the whole gesture, even after the browser has sent
        // pointercancel for it, so they drive touch drags.
        const touchMove = (e: TouchEvent) => {
          if (e.touches.length !== 1) {
            end('cancel');
            return;
          }
          const t = e.touches[0];
          handleMove(t.clientX, t.clientY);
        };
        const touchEnd = (e: TouchEvent) => {
          if (e.touches.length === 0) end(drag.current ? 'drop' : 'release');
        };
        const touchCancel = () => end('cancel');
        // Passive: scrolling never waits for this listener; a lifted row stops the list from
        // scrolling by freezing it instead.
        window.addEventListener('touchmove', touchMove, { passive: true });
        window.addEventListener('touchend', touchEnd);
        window.addEventListener('touchcancel', touchCancel);
        // A long press would otherwise open the context menu or start selecting text.
        window.addEventListener('contextmenu', preventDefault, { capture: true });
        setBodyDragging(true);
        detachInput = () => {
          window.removeEventListener('touchmove', touchMove);
          window.removeEventListener('touchend', touchEnd);
          window.removeEventListener('touchcancel', touchCancel);
          window.removeEventListener('contextmenu', preventDefault, { capture: true });
        };
      } else {
        const move = (e: PointerEvent) => {
          if (e.pointerId === p.pointerId && handleMove(e.clientX, e.clientY)) e.preventDefault();
        };
        const up = (e: PointerEvent) => {
          if (e.pointerId === p.pointerId) end(drag.current ? 'drop' : 'release');
        };
        const cancel = (e: PointerEvent) => {
          if (e.pointerId === p.pointerId) end('cancel');
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        detachInput = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', cancel);
        };
      }

      cleanup.current = () => {
        clearTimeout(holdTimer);
        if (liftTimer) clearTimeout(liftTimer);
        detachInput();
        unfreeze?.();
      };
    },
    [beginDrag, end, getScrollNode, layout]
  );

  return { register, onPointerDown };
}
