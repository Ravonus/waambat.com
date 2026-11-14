import {onCleanup} from "@kerf-js/core";
import { onMount } from '@kerf-js/core';
import { canvas } from '@kerf-js/scroll/canvas';
import type { BarFrame } from '@kerf-js/scroll';
import '#/styles/scrollbar.css';
/** Paint the document's rail; the document retains native scrolling and restoration. */
export default function CanvasScrollbar() {
    let rail: HTMLDivElement | undefined;
    onMount(() => {
        if (!rail)
            return;
        const track = rail, doc = document.documentElement;
        const renderer = canvas({ draw(ctx, f) {
                const t = f.thumb, r = Math.min(t.width / 2, 5);
                ctx.fillStyle = f.active ? '#ff70ba' : f.hover ? '#ffadd1' : '#ff94b2';
                ctx.beginPath();
                ctx.moveTo(t.x + r, t.y);
                ctx.arcTo(t.x + t.width, t.y, t.x + t.width, t.y + t.height, r);
                ctx.arcTo(t.x + t.width, t.y + t.height, t.x, t.y + t.height, r);
                ctx.arcTo(t.x, t.y + t.height, t.x, t.y, r);
                ctx.arcTo(t.x, t.y, t.x + t.width, t.y, r);
                ctx.closePath();
                ctx.fill();
            } });
        renderer.mount(track, 'y');
        if (!track.querySelector('canvas')?.getContext('2d')) {
            renderer.unmount(track);
            track.hidden = true;
            return;
        }
        doc.dataset.canvasScroll = '';
        let frame = 0, hover = false, active = false, offset = 0;
        const metrics = () => { const height = track.hidden ? Math.max(0,innerHeight-12) : track.clientHeight, total = Math.max(0, doc.scrollHeight - innerHeight), thumb = Math.min(height, Math.max(48, height * innerHeight / Math.max(1, doc.scrollHeight))); return { height, total, thumb, travel: height - thumb }; };
        const draw = () => { frame = 0; const m = metrics(), progress = m.total ? Math.min(1, Math.max(0, scrollY / m.total)) : 0, width = active || hover ? 8 : 5; track.hidden = m.total < 1; track.setAttribute('aria-valuemax', String(Math.round(m.total))); track.setAttribute('aria-valuenow', String(Math.round(scrollY))); renderer.draw(track, { axis: 'y', track: { width: 14, height: m.height }, thumb: { x: 14 - width - 2, y: m.travel * progress, width, height: m.thumb }, grow: hover || active ? 1 : 0, hover, active, progress, span: { start: 0, end: m.travel }, rtl: false, bar: { width: 5, hoverWidth: 8, inset: 2, radius: 3, color: '#ff94b2', hoverColor: '#ffadd1', activeColor: '#ff70ba', track: 'transparent', hoverTrack: 'transparent', layout: 'overlay', show: 'always', hideDelay: 0, fade: 150, trackClick: 'jump' } } satisfies BarFrame); };
        const schedule = () => { frame ||= requestAnimationFrame(draw); };
        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        const hoverIn = () => { hover = true; schedule(); }, hoverOut = () => { hover = false; schedule(); };
        const down = (e: PointerEvent) => { if (e.button !== 0)
            return; e.preventDefault(); active = true; track.setPointerCapture(e.pointerId); const m = metrics(), top = track.getBoundingClientRect().top, y = e.clientY - top, at = m.total ? scrollY / m.total * m.travel : 0; offset = y >= at && y <= at + m.thumb ? y - at : m.thumb / 2; move(e); };
        const move = (e: PointerEvent) => { if (!active)
            return; const m = metrics(); scrollTo({ top: Math.max(0, Math.min(m.travel, e.clientY - track.getBoundingClientRect().top - offset)) / Math.max(1, m.travel) * m.total, behavior: 'instant' }); schedule(); };
        const up = () => { active = false; schedule(); };
        const key = (e: KeyboardEvent) => { const jumps: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: innerHeight * .9, PageUp: -innerHeight * .9, ' ': innerHeight * .9 }; if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            scrollTo({ top: e.key === 'Home' ? 0 : doc.scrollHeight, behavior: 'instant' });
        }
        else if (e.key in jumps) {
            e.preventDefault();
            scrollBy({ top: jumps[e.key] * (e.shiftKey ? -1 : 1), behavior: 'instant' });
        } };
        addEventListener('scroll', schedule, { passive: true });
        addEventListener('resize', schedule);
        track.addEventListener('pointerenter', hoverIn);
        track.addEventListener('pointerleave', hoverOut);
        track.addEventListener('pointerdown', down);
        track.addEventListener('pointermove', move);
        track.addEventListener('pointerup', up);
        track.addEventListener('pointercancel', up);
        track.addEventListener('keydown', key);
        draw();
        onCleanup(() => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); renderer.unmount(track); delete doc.dataset.canvasScroll; track.removeEventListener('pointerenter', hoverIn); track.removeEventListener('pointerleave', hoverOut); track.removeEventListener('pointerdown', down); track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up); track.removeEventListener('keydown', key); });
    });
    return <div ref={node => { rail = node; }} class="waambat-scroll-rail" role="scrollbar" aria-label="Page scroll" aria-orientation="vertical" aria-controls="main-content" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" tabIndex={0}/>;
}
