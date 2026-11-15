import {onMount,watch} from '@kerf-js/core';
import {currentPath} from '@kerf-js/start';
import type {Content} from '#/lib/content';
import {trackPublicPage,trackingTitle} from '#/lib/analytics';
export default function Analytics(props:{content:Pick<Content,'integrations'>&Parameters<typeof trackingTitle>[0];allowed:boolean}){onMount(()=>watch(()=>[currentPath(),props.content.integrations] as const,([path,settings])=>trackPublicPage(settings,path,trackingTitle(props.content,path),props.allowed)));return null;}
