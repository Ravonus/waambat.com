import {scrollPage} from '@kerf-js/veneer-core/page-scroll';
import {onCleanup} from "@kerf-js/core";
import { onMount } from '@kerf-js/core';
import { canvas } from '@kerf-js/scroll/canvas';
import type { BarFrame } from '@kerf-js/scroll';
import '#/styles/scrollbar.css';
/** Paint the document's rail; the document retains native scrolling and restoration. */
export default function CanvasScrollbar({behavior='smooth'}:{behavior?:'smooth'|'instant'}={}) {
    let rail: HTMLDivElement | undefined;
    onMount(() => {
        if (!rail)
            return;
        const track = rail, doc = document.documentElement;
        // The rail is the wordmark/title pink, read from the shared CSS tokens. A light-to-deep
        // sheen along the thumb echoes the cursor; dragging splits it for the datamosh look.
        const tokens = getComputedStyle(track), token = (name: string, fallback: string) => tokens.getPropertyValue(name).trim() || fallback;
        // Read on every draw, so a theme change (the :root vars) reaches the rail.
        const colors = { rest: '', light: '', deep: '', split: '' };
        const readColors = () => { colors.rest = token('--ui-cursor', '#ff94b2'); colors.light = token('--ui-cursor-light', '#ffb5c8'); colors.deep = token('--ui-cursor-deep', '#e27092'); colors.split = token('--ui-accent', '#e1bcc2'); };
        const still = matchMedia('(prefers-reduced-motion: reduce)');
        const thumb = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
                const r = Math.min(width / 2, 5);
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + width, y, x + width, y + height, r);
                ctx.arcTo(x + width, y + height, x, y + height, r);
                ctx.arcTo(x, y + height, x, y, r);
                ctx.arcTo(x, y, x + width, y, r);
                ctx.closePath();
                ctx.fill();
        };
        // Scroll energy drives the datamosh: it rises with scroll speed and decays each frame,
        // so the thumb tears while the page moves and settles to its clean sheen when it stops.
        let energy = 0, direction = 1, lastY = scrollY;
        // The theme root is looked up once and again only if it is replaced.
        let site: HTMLElement | null = null;
        const glitchAllowed = () => { if (!site?.isConnected) site = document.querySelector<HTMLElement>('.site-theme'); return !still.matches && (site?.dataset.motion ?? 'full') === 'full'; };
        const renderer = canvas({ draw(ctx, f) {
                const t = f.thumb, e = glitchAllowed() ? Math.max(energy, f.active ? 0.45 : 0) : 0;
                if (e > 0.02) {
                    // Afterimage trailing the direction of travel.
                    ctx.globalAlpha = 0.3 * e;
                    ctx.fillStyle = colors.deep;
                    thumb(ctx, t.x, t.y - direction * 22 * e, t.width, t.height);
                    // Chromatic split.
                    ctx.globalAlpha = 0.75;
                    ctx.fillStyle = colors.deep;
                    thumb(ctx, t.x - 1 - 2 * e, t.y + direction * 3 * e, t.width, t.height);
                    ctx.fillStyle = colors.split;
                    thumb(ctx, t.x + 1 + 2 * e, t.y - direction * 2 * e, t.width, t.height);
                    ctx.globalAlpha = 1;
                }
                const sheen = ctx.createLinearGradient(0, t.y, 0, t.y + t.height);
                sheen.addColorStop(0, f.hover || f.active ? colors.light : colors.rest);
                sheen.addColorStop(0.55, colors.rest);
                sheen.addColorStop(1, f.active || e > 0.3 ? colors.deep : colors.rest);
                ctx.fillStyle = sheen;
                if (e > 0.02) {
                    // Slice the thumb into bands that shear sideways by different amounts.
                    const bands = 5, band = t.height / bands;
                    for (let i = 0; i < bands; i++) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(0, t.y + i * band, 14, band + 0.5);
                        ctx.clip();
                        thumb(ctx, t.x + Math.round((Math.random() - 0.5) * 5 * e), t.y, t.width, t.height);
                        ctx.restore();
                    }
                }
                else
                    thumb(ctx, t.x, t.y, t.width, t.height);
            } });
        renderer.mount(track, 'y');
        if (!track.querySelector('canvas')?.getContext('2d')) {
            renderer.unmount(track);
            track.hidden = true;
            return;
        }
        doc.dataset.canvasScroll = '';
        let frame = 0, hover = false, active = false, offset = 0, dragging=false, pointerStart=0;
        const metrics = () => { const height = track.hidden ? Math.max(0,innerHeight-12) : track.clientHeight, total = Math.max(0, doc.scrollHeight - innerHeight), thumb = Math.min(height, Math.max(48, height * innerHeight / Math.max(1, doc.scrollHeight))); return { height, total, thumb, travel: height - thumb }; };
        const draw = () => { frame = 0; readColors(); const m = metrics(), progress = m.total ? Math.min(1, Math.max(0, scrollY / m.total)) : 0, width = active || hover ? 8 : 5; track.hidden = m.total < 1; track.setAttribute('aria-valuemax', String(Math.round(m.total))); track.setAttribute('aria-valuenow', String(Math.round(scrollY))); renderer.draw(track, { axis: 'y', track: { width: 14, height: m.height }, thumb: { x: 14 - width - 2, y: m.travel * progress, width, height: m.thumb }, grow: hover || active ? 1 : 0, hover, active, progress, span: { start: 0, end: m.travel }, rtl: false, bar: { width: 5, hoverWidth: 8, inset: 2, radius: 3, color: colors.rest, hoverColor: colors.light, activeColor: colors.deep, track: 'transparent', hoverTrack: 'transparent', layout: 'overlay', show: 'always', hideDelay: 0, fade: 150, trackClick: 'jump' } } satisfies BarFrame); if (energy > 0.02) { energy *= 0.84; schedule(); } else energy = 0; };
        const schedule = () => { frame ||= requestAnimationFrame(draw); };
        const scrolled = () => { const dy = scrollY - lastY; lastY = scrollY; if (dy && glitchAllowed()) { direction = Math.sign(dy); energy = Math.min(1, energy + Math.abs(dy) / 90); } schedule(); };
        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        const hoverIn = () => { hover = true; schedule(); }, hoverOut = () => { hover = false; schedule(); };
        const destination=(y:number)=>{const m=metrics();return Math.max(0,Math.min(m.travel,y-track.getBoundingClientRect().top-offset))/Math.max(1,m.travel)*m.total;};
        const down=(e:PointerEvent)=>{if(e.button!==0)return;e.preventDefault();active=true;pointerStart=e.clientY;track.setPointerCapture(e.pointerId);const m=metrics(),y=e.clientY-track.getBoundingClientRect().top,at=m.total?scrollY/m.total*m.travel:0;dragging=y>=at&&y<=at+m.thumb;offset=dragging?y-at:m.thumb/2;if(!dragging)scrollPage(destination(e.clientY),behavior);schedule();};
        const move=(e:PointerEvent)=>{if(!active||(!dragging&&Math.abs(e.clientY-pointerStart)<3))return;dragging=true;scrollPage(destination(e.clientY),'instant');schedule();};
        const up=()=>{active=false;dragging=false;schedule();};
        const key = (e: KeyboardEvent) => { const jumps: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: innerHeight * .9, PageUp: -innerHeight * .9, ' ': innerHeight * .9 }; if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            scrollPage(e.key === 'Home' ? 0 : doc.scrollHeight,'instant');
        }
        else if (e.key in jumps) {
            e.preventDefault();
            scrollPage(scrollY+jumps[e.key]!*(e.shiftKey?-1:1),'instant');
        } };
        addEventListener('scroll', scrolled, { passive: true });
        addEventListener('resize', schedule);
        track.addEventListener('pointerenter', hoverIn);
        track.addEventListener('pointerleave', hoverOut);
        track.addEventListener('pointerdown', down);
        track.addEventListener('pointermove', move);
        track.addEventListener('pointerup', up);
        track.addEventListener('pointercancel', up);
        track.addEventListener('keydown', key);
        draw();
        onCleanup(() => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', scrolled); removeEventListener('resize', schedule); renderer.unmount(track); delete doc.dataset.canvasScroll; track.removeEventListener('pointerenter', hoverIn); track.removeEventListener('pointerleave', hoverOut); track.removeEventListener('pointerdown', down); track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up); track.removeEventListener('keydown', key); });
    });
    return <div ref={node => { rail = node; }} class="waambat-scroll-rail" role="scrollbar" aria-label="Page scroll" aria-orientation="vertical" aria-controls="main-content" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" tabIndex={0}/>;
}
