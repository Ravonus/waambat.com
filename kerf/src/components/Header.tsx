import { derived, onMount, watch, onCleanup } from '@kerf-js/core';
import { currentPath } from '@kerf-js/start';
import type { Content } from '#/lib/content';
import SiteLink from './navigation/SiteLink';
import { navigation as useNavigation } from './navigation/NavigationProvider';
import { mountMobileMenu } from './navigation/mobile-menu';
import styles from './Header.module.css';
export default function Header({ navigation, hero = false, preview = false }: {
    navigation: Content['navigation'];
    hero?: boolean;
    preview?: boolean;
}) {
    const nav = useNavigation, open = derived(() => nav.menu.value !== 'closed');
    let header: HTMLElement | undefined, button: HTMLButtonElement | undefined, controller: ReturnType<typeof mountMobileMenu>;

    // "closing" must always reach "closed": viewport playback waits for it. animationend
    // never fires when the panel is already hidden (a route change closed the dialog),
    // has no animation, or the tab is in the background, so finish at once in the first
    // cases and by a deadline past the longest close animation (300ms) otherwise.
    onMount(() => watch(() => nav.menu.value, phase => { if(phase!=='closing')return; if(currentPath()!==nav.origin.value)controller?.releaseForNavigation(); const panel=header?.querySelector('dialog'); if(!panel||!panel.open||document.hidden||getComputedStyle(panel).animationName==='none'){queueMicrotask(nav.finish);return;} const deadline=setTimeout(()=>{if(nav.menu.value==='closing')nav.finish();},600); return ()=>clearTimeout(deadline); }));
    onCleanup(() => controller?.dispose());
    return <header ref={node => { header = node; }} data-menu-open={open.value || undefined} data-with-hero={hero || undefined} className="site-header mx-auto w-full max-w-none text-center">
  <SiteLink href={preview ? '/admin/preview?page=nfts' : '/'} className={`site-logo text-waambat-logo font-brand inline-block font-normal tracking-normal ${styles.logo}`} aria-label="waambat home"><img src="/brand/waambat-sigil-original.svg" width={484} height={500} alt=""/></SiteLink>
  <button ref={node => { button = node; }} onClick={() => nav.open(currentPath())} aria-expanded={open.value} aria-haspopup="dialog" aria-controls="mobile-site-menu" aria-label="Menu" className={styles.menuButton}><MenuGlyph/></button>
  <nav aria-label="Main navigation" className="mt-[20px] hidden flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 md:flex"><HeaderLinks navigation={navigation} preview={preview} mobile={false}/></nav>
  {open.value && <dialog ref={node => { if (header) {
            const mounted=mountMobileMenu(node,header,button??null,nav.close,nav.finish);controller=mounted;onCleanup(()=>{mounted?.dispose();if(controller===mounted)controller=undefined;}); queueMicrotask(()=>{if(node.isConnected&&nav.menu.value==='open')node.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')?.focus({preventScroll:true});});

        } }} id="mobile-site-menu" role="presentation" className={styles.overlay} data-phase={nav.menu.value} onCancel={e => { e.preventDefault(); nav.close(); }} onAnimationEnd={e => { if (e.target === e.currentTarget && nav.menu.value === 'closing')
            nav.finish(); }}>
    <div className={styles.overlayHeader}><button onClick={() => nav.close()} className={styles.closeButton} aria-label="Close menu"><MenuGlyph/></button></div>
    <nav className={styles.mobileNav} aria-label="Mobile navigation"><HeaderLinks navigation={navigation} preview={preview} mobile={true}/></nav>
  </dialog>}
 </header>;
}

/** Three strokes in the header; inside the open menu the same strokes fold into the close X. */
function MenuGlyph(){
    return <svg aria-hidden="true" className={styles.glyph} width="26" height="22" viewBox="0 0 26 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path className={styles.barTop} d="M2 3h22"/><path className={styles.barMid} d="M2 11h22"/><path className={styles.barBottom} d="M2 19h22"/></svg>;
}

function HeaderLinks({navigation,preview,mobile}:{navigation:Content["navigation"];preview:boolean;mobile:boolean}){
    return <>{navigation.filter(item => !item.archived).map((item, index) => <SiteLink key={item.id} href={preview && item.href.startsWith('/') ? `/admin/preview?page=${item.href === '/' ? 'nfts' : item.href.slice(1)}` : item.href} aria-current={currentPath() === item.href ? 'page' : undefined} label={item.label} style={mobile ? {'--i': index} : undefined} className={`site-nav-link ${styles.link} ${mobile ? styles.mobileLink : ''} leading-[19.503px] tracking-[.06em]`}>{mobile ? <><span className={`${styles.index} ${styles.arrive}`} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className={styles.arrive}>{item.label}</span></> : item.label}<span className={styles.linkProgress} aria-hidden="true"/></SiteLink>)}</>;
}
