import Footer from './Footer';
import SiteFrame from './navigation/SiteFrame';
import { themeStyle, originalTheme, type Theme } from '#/lib/theme';
import { defaultNavigation, type Content } from '#/lib/content';
export default function Layout({ children, preview = false, navigation = defaultNavigation, wide = false, theme = originalTheme, hero, hasHero = false }: {
    children: unknown;
    preview?: boolean;
    navigation?: Content['navigation'];
    wide?: boolean;
    theme?: Theme;
    hero?: unknown; hasHero?: boolean;
}) {
    return <SiteFrame hasHero={hasHero} hero={hero} preview={preview} navigation={navigation} wide={wide} style={themeStyle(theme)} motion={theme.motion} footer={<Footer />}>{children}</SiteFrame>;
}
