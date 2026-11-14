import {getPublishedContent} from './content';
import type {Content} from '#/lib/content';
export function publicContent(content:Content):Content{return {...content,email:{...content.email,from:'',replyTo:'',enabled:false},forms:content.forms.map(form=>({...form,recipient:'',emailNotifications:false}))};}
const snapshots=new WeakMap<Request,Promise<Content>>();
export function getPublicContent(request?:Request){if(!request)return getPublishedContent().then(publicContent);let snapshot=snapshots.get(request);if(!snapshot){snapshot=getPublishedContent().then(publicContent);snapshots.set(request,snapshot);}return snapshot;}
