import {analyticsScriptURL} from './security';
import type {Content} from './content';
type GAWindow=Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;[key:`ga-disable-${string}`]:boolean};
let active='',last='',scheduled=false;
function scheduleAnalytics(){
 if(scheduled||document.querySelector('script[data-waambat-analytics]'))return;
 scheduled=true;
 const run=()=>{scheduled=false;if(!active||document.querySelector('script[data-waambat-analytics]'))return;
  const script=document.createElement('script');script.async=true;script.dataset.waambatAnalytics='';script.src=analyticsScriptURL(active);document.head.append(script);
 };
 const idle=()=>{if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:2500});else setTimeout(run,0);};
 if(document.readyState==='complete')idle();else window.addEventListener('load',idle,{once:true});
}
export function trackingTitle(content:Pick<Content,'seo'>&{pages:Pick<Content['pages'][number],'slug'|'title'|'seo'>[]},path:string){const clean=path.split(/[?#]/)[0];if(clean==='/')return content.seo.homeTitle;const page=content.pages.find(p=>'/'+p.slug===clean);return `${page?.seo.title||page?.title||(clean==='/ordinals'?'Ordinals':'WAAMBAT')} — waambat`;}
export function trackPublicPage(settings:Content['integrations'],path:string,title:string,allowed:boolean){
 if(typeof window==='undefined')return;
 const win=window as unknown as GAWindow;
 const enabled=allowed&&location.hostname==='waamb.at'&&settings.analyticsEnabled&&/^G-[A-Z0-9]{6,20}$/.test(settings.googleAnalyticsId)&&!/^\/(admin|api|_kerf)(\/|$)/.test(path);
 const id=enabled?settings.googleAnalyticsId:'';
 if(active&&active!==id){win[`ga-disable-${active}`]=true;last='';}
 if(!id){active='';return;}
 win[`ga-disable-${id}`]=false;
 win.dataLayer??=[];
 // eslint-disable-next-line prefer-rest-params -- Google's documented gtag queue uses an Arguments object.
 win.gtag??=function(){win.dataLayer!.push(arguments);};
 const cleanLocation=`https://waamb.at${path.split(/[?#]/)[0]}`;
 win.gtag('set',{page_location:cleanLocation,page_referrer:'',page_title:title});
 if(active!==id){active=id;last='';win.gtag('js',new Date());win.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});}
 scheduleAnalytics();
 const key=id+path;if(last===key)return;last=key;
 win.gtag('event','page_view',{send_to:id,page_location:cleanLocation,page_title:title,page_referrer:''});
}
