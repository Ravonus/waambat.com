import { derived } from '@kerf-js/core';
import { currentPath } from '@kerf-js/start';
import type { Content } from '#/lib/content';
import type { PageRoute } from '#/lib/navigation';
import Header from '../Header';
export default function SiteFrame({ children, navigation, style, motion, routes = [], hero, hasHero = false, footer, preview = false, wide = false }: {
    children: unknown;
    navigation: Content['navigation'];
    style: Record<string, string | number | undefined>;
    motion: string;
    routes?: PageRoute[];
    hero?: unknown;
    hasHero?: boolean;
    footer: unknown;
    preview?: boolean;
    wide?: boolean;
}) {
    const route = derived(() => routes.find(r => r.href === currentPath())), showHero = derived(() => preview ? hasHero : currentPath() === '/' && hasHero);
    return <>{route.value?.splash ? children : <div className="site-theme flex min-h-screen flex-col" data-motion={motion} style={style}><Header navigation={navigation} preview={preview} hero={showHero.value}/>{showHero.value && hero}<main id="main-content" tabIndex={-1} className={`site-main mx-auto w-full flex-grow ${wide || route.value?.wide ? 'site-main-wide' : ''}`}>{children}</main>{footer}</div>}</>;
}
