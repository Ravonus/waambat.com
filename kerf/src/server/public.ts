import {getPublishedContent} from './content';
import type {Content} from '#/lib/content';
import {publicContent} from '#/lib/public-view';
export {publicContent} from '#/lib/public-view';
const snapshots=new WeakMap<Request,Promise<Content>>();
export function getPublicContent(request?:Request){if(!request)return getPublishedContent().then(publicContent);let snapshot=snapshots.get(request);if(!snapshot){snapshot=getPublishedContent().then(publicContent);snapshots.set(request,snapshot);}return snapshot;}
