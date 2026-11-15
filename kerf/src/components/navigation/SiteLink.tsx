import {navigate,currentPath} from '@kerf-js/start';
import {navigation} from './NavigationProvider';
export default function SiteLink({href,children,label,onClick,...props}:{href:string;children?:unknown;label?:string;onClick?:(event:MouseEvent & {currentTarget:HTMLAnchorElement})=>void;[key:string]:unknown}){
 const nav=navigation;
 const follow=(event:MouseEvent & {currentTarget:HTMLAnchorElement})=>{
  onClick?.(event);
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!href.startsWith('/')||href.startsWith('//')||(props.target&&props.target!=='_self')||props.download!==undefined)return;
  event.preventDefault();
  if(href===location.pathname+location.search+location.hash){nav.close();return;}
  nav.begin(href,label??(typeof children==='string'?children:'page'));
  void navigate(href).catch(()=>{}).finally(()=>{if(nav.pendingHref.value===href)nav.arrived();if(nav.menu.value==='open'&&currentPath()!==nav.origin.value)nav.close();});
 };
 return <a {...props} href={href} data-pending={nav.pendingHref.value===href||undefined} onClick={follow}>{children}</a>;
}
