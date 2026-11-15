import Sigil from './Sigil';
import {navIndicator} from '@kerf-js/veneer-core/nav';
import { derived, onMount, watch, onCleanup } from '@kerf-js/core';
import { currentPath } from '@kerf-js/start';
import type { Content } from '#/lib/content';
import SiteLink from './navigation/SiteLink';
import { navigation as useNavigation } from './navigation/NavigationProvider';
import { mountMobileMenu } from './navigation/mobile-menu';
import { mountFollowingNav } from './navigation/following-nav';
import styles from './Header.module.css';
export default function Header({ navigation, hero = false, preview = false }: {
    navigation: Content['navigation'];
    hero?: boolean;
    preview?: boolean;
}) {
    const nav = useNavigation, open = derived(() => nav.menu.value !== 'closed');
    let desktopNav:HTMLElement|undefined;
    onMount(()=>{if(!desktopNav)return;const binding=navIndicator(desktopNav);onCleanup(()=>binding.destroy());});
    let header: HTMLElement | undefined, chrome: HTMLElement | undefined, dock: HTMLElement | undefined, button: HTMLButtonElement | undefined, trigger: HTMLButtonElement | undefined, controller: ReturnType<typeof mountMobileMenu>;
    onMount(()=>{if(!header||!chrome||!dock)return;const following=mountFollowingNav(header,chrome,dock);onCleanup(following.dispose);return watch(()=>currentPath(),()=>following.reset());});

    // "closing" must always reach "closed": viewport playback waits for it. animationend
    // never fires when the panel is already hidden (a route change closed the dialog),
    // has no animation, or the tab is in the background, so finish at once in the first
    // cases and by a deadline past the longest close animation (300ms) otherwise.
    onMount(() => watch(() => nav.menu.value, phase => { if(phase!=='closing')return; if(currentPath()!==nav.origin.value)controller?.releaseForNavigation(); const panel=header?.querySelector('dialog'); if(!panel||!panel.open||document.hidden||getComputedStyle(panel).animationName==='none'){queueMicrotask(nav.finish);return;} const deadline=setTimeout(()=>{if(nav.menu.value==='closing')nav.finish();},600); return ()=>clearTimeout(deadline); }));
    onCleanup(() => controller?.dispose());
    return <header ref={node => { header = node; }} data-menu-open={open.value || undefined} data-with-hero={hero || undefined} className="site-header mx-auto w-full max-w-none text-center">

  <div ref={node=>chrome=node} data-header-chrome className={styles.chrome}>
  <button ref={node => { button = node; }} onClick={event => {trigger=event.currentTarget;nav.open(currentPath());}} aria-expanded={open.value} aria-haspopup="dialog" aria-controls="mobile-site-menu" aria-label="Menu" className={styles.menuButton}><MenuGlyph/></button>
  <nav ref={node=>desktopNav=node} data-wa-nav aria-label="Main navigation" className="hidden flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 md:flex"><HeaderLinks navigation={navigation} preview={preview} mobile={false}/><span data-part="indicator" aria-hidden="true" className={styles.navIndicator}/></nav>
  <SiteLink href={preview ? '/admin/preview?page=nfts' : '/'} className={`site-logo text-waambat-logo font-brand inline-block font-normal tracking-normal ${styles.logo}`} aria-label="waambat home"><span data-brand-wordmark data-kerf-shared={!hero?'waambat-wordmark':undefined} data-kerf-shared-fit="text">waambat</span><span data-kerf-shared={!hero?'waambat-sigil':undefined} className={styles.sigil}><Sigil/></span></SiteLink>
  </div>
  <nav ref={node=>dock=node} data-mobile-dock className={styles.dock} aria-label="Quick navigation" inert>
    {navigation.filter(item=>!item.archived&&(item.href==='/'||item.href==='/ordinals')).map(item=><SiteLink key={item.id} href={preview ? `/admin/preview?page=${item.href==='/'?'nfts':item.href.slice(1)}` : item.href} aria-current={currentPath()===item.href?'page':undefined} label={item.label} className={styles.dockLink}>{item.label}</SiteLink>)}
    <button onClick={event=>{trigger=event.currentTarget;nav.open(currentPath());}} aria-label="Open all pages" aria-expanded={open.value} aria-controls="mobile-site-menu" aria-haspopup="dialog" className={styles.dockMenu}><span>Menu</span><MenuGlyph/></button>
  </nav>
  {open.value && <dialog ref={node => { if (header) {
            const mounted=mountMobileMenu(node,header,trigger??button??null,nav.close,nav.finish);controller=mounted;onCleanup(()=>{mounted?.dispose();if(controller===mounted)controller=undefined;}); queueMicrotask(()=>{if(node.isConnected&&nav.menu.value==='open')node.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')?.focus({preventScroll:true});});

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
