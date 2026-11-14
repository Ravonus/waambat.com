import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import SiteLink from "./navigation/SiteLink";
export default function SourceLink({ href, children, ...props }: {
    href?: string;
    children?: unknown;
    [key: string]: unknown;
}) {
    return <>{href?.startsWith("/") && !href.startsWith("//") ? (<SiteLink {...props} href={href}>
      {children}
    </SiteLink>) : (<a {...props} href={href}>
      {children}
    </a>)}</>;
}
