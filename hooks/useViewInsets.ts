// ╔══════════════════════════════════════════════════════════╗
// ║  useViewInsets — 窄螢幕底部 UI 遮擋量測（契約 R3）         ║
// ║  職責：唯一量測底部面板（ToolWindow）與播放列（PlaybackHUD）║
// ║        蓋住畫布容器高度的模組；值變更時透過 UI_COMMAND     ║
// ║        送出 SET_VIEW_INSETS。                              ║
// ║  [ARCH] 只在 GameCanvas 掛一次。寬螢幕（> SHEET_BREAKPOINT）║
// ║  浮動視窗不算遮擋，直接送全 0 且不掛觀察器。                ║
// ╚══════════════════════════════════════════════════════════╝

import { useEffect, useRef, type RefObject } from 'react';
import type { GameEngine } from '../engine/game';
import type { ViewInsets } from '../engine/presentation/ViewInsets';
import { useCompactViewport } from './useCompactViewport';

/** 契約 R3：底部面板（ToolWindow）與播放列（PlaybackHUD）掛在 DOM 上的遮擋標記（唯一定義點） */
export const VIEW_INSET_KIND = {
    BOTTOM_SHEET: 'bottom',
    BOTTOM_BAR: 'bottom-bar',
} as const;

const VIEW_INSET_ATTR = 'data-view-inset';
const VIEW_INSET_SELECTOR = `[${VIEW_INSET_ATTR}]`;

export interface InsetRectLike {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export interface InsetOccluderSample {
    kind: typeof VIEW_INSET_KIND.BOTTOM_SHEET | typeof VIEW_INSET_KIND.BOTTOM_BAR;
    rect: InsetRectLike;
}

const ZERO_INSETS: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function insetsEqual(a: ViewInsets, b: ViewInsets): boolean {
    return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

/**
 * 依畫布容器與窄螢幕底部遮擋元素計算四邊 inset（CSS px）。
 * 底部面板一律計算至畫布下緣的遮擋；可拖曳的播放列僅在畫布下半部時算入（忽略初始 0,0 或拖至上方）。
 */
export function computeViewInsets(
    container: InsetRectLike,
    occluders: readonly InsetOccluderSample[],
): ViewInsets {
    if (container.width <= 0 || container.height <= 0) {
        return ZERO_INSETS;
    }

    const midY = container.top + container.height / 2;
    let bottom = 0;

    for (const { kind, rect } of occluders) {
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.bottom <= container.top || rect.top >= container.bottom) continue;
        if (kind === VIEW_INSET_KIND.BOTTOM_BAR && rect.top < midY) continue;
        const covered = Math.min(container.height, container.bottom - rect.top);
        if (covered > bottom) bottom = covered;
    }

    return {
        top: 0,
        right: 0,
        bottom: Math.max(0, Math.round(bottom)),
        left: 0,
    };
}

function nodeTouchesOccluder(node: Node): boolean {
    if (node.nodeType !== 1) return false;
    const el = node as Element;
    return el.matches(VIEW_INSET_SELECTOR) || el.querySelector(VIEW_INSET_SELECTOR) !== null;
}

function recordTouchesOccluder(record: MutationRecord): boolean {
    if (record.type === 'attributes') return true;
    for (let i = 0; i < record.addedNodes.length; i++) {
        if (nodeTouchesOccluder(record.addedNodes[i])) return true;
    }
    for (let i = 0; i < record.removedNodes.length; i++) {
        if (nodeTouchesOccluder(record.removedNodes[i])) return true;
    }
    return false;
}

export function useViewInsets(containerRef: RefObject<HTMLElement | null>, engine: GameEngine): void {
    const isCompact = useCompactViewport();
    const lastSentRef = useRef<ViewInsets>(ZERO_INSETS);

    useEffect(() => {
        const emitIfChanged = (next: ViewInsets) => {
            if (insetsEqual(lastSentRef.current, next)) return;
            lastSentRef.current = next;
            engine.bus.emit('UI_COMMAND', { type: 'SET_VIEW_INSETS', ...next });
        };

        if (!isCompact) {
            emitIfChanged(ZERO_INSETS);
            return;
        }

        if (typeof document === 'undefined' || typeof window === 'undefined') return;
        const container = containerRef.current;
        if (!container) return;

        let rafId: number | null = null;
        const observedResize = new Set<Element>();
        const observedBars = new Set<Element>();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => scheduleMeasure())
            : null;
        const barStyleObserver = typeof MutationObserver !== 'undefined'
            ? new MutationObserver(() => scheduleMeasure())
            : null;
        const domObserver = typeof MutationObserver !== 'undefined'
            ? new MutationObserver((records) => {
                if (records.some(recordTouchesOccluder)) scheduleMeasure();
            })
            : null;

        const syncObservers = (els: Element[]) => {
            if (resizeObserver) {
                const nextSet = new Set<Element>(els);
                for (const el of observedResize) {
                    if (!nextSet.has(el)) {
                        resizeObserver.unobserve(el);
                        observedResize.delete(el);
                    }
                }
                for (const el of els) {
                    if (!observedResize.has(el)) {
                        resizeObserver.observe(el);
                        observedResize.add(el);
                    }
                }
            }

            if (barStyleObserver) {
                const nextBars = els.filter((el) => el.getAttribute(VIEW_INSET_ATTR) === VIEW_INSET_KIND.BOTTOM_BAR);
                const changed = nextBars.length !== observedBars.size
                    || nextBars.some((el) => !observedBars.has(el));
                if (changed) {
                    barStyleObserver.disconnect();
                    observedBars.clear();
                    for (const el of nextBars) {
                        barStyleObserver.observe(el, { attributes: true, attributeFilter: ['style'] });
                        observedBars.add(el);
                    }
                }
            }
        };

        const measure = () => {
            const host = containerRef.current;
            if (!host) return;
            const els = Array.from(document.querySelectorAll(VIEW_INSET_SELECTOR));
            syncObservers(els);

            const samples: InsetOccluderSample[] = [];
            for (const el of els) {
                const attr = el.getAttribute(VIEW_INSET_ATTR);
                if (attr !== VIEW_INSET_KIND.BOTTOM_SHEET && attr !== VIEW_INSET_KIND.BOTTOM_BAR) continue;
                samples.push({ kind: attr, rect: el.getBoundingClientRect() });
            }
            emitIfChanged(computeViewInsets(host.getBoundingClientRect(), samples));
        };

        const scheduleMeasure = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                measure();
            });
        };

        resizeObserver?.observe(container);
        domObserver?.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [VIEW_INSET_ATTR],
        });
        window.addEventListener('resize', scheduleMeasure);

        measure();
        scheduleMeasure();

        return () => {
            if (rafId !== null) window.cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            barStyleObserver?.disconnect();
            domObserver?.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [containerRef, engine, isCompact]);
}
