import {defineState,onMount,onCleanup,state,watch} from '@kerf-js/core';
import '#/styles/media-download.css';
type File={src:string;name:string;type:string;bytes:number;original?:string;originalSrc?:string;originalName?:string;originalBytes?:number};
const download=defineState('waambat.download',()=>({open:state(false),file:state<File|null>(null),ready:state(false),error:state('')}));
export default function MediaDownload(){
 let dialog:HTMLDialogElement|undefined,controller:AbortController|undefined,focus:HTMLElement|null=null,release:(()=>void)|undefined;
 const close=()=>{controller?.abort();release?.();release=undefined;download.open.value=false;};
 const check=async(file:File,current:AbortController)=>{
  if(current.signal.aborted)return;
  download.file.value=file;const timeout=setTimeout(()=>current.abort(new Error('The file check timed out. Please try again.')),15000);
  try{const {prepareMediaSave}=await import('@kerf-js/core/media');if(current.signal.aborted)return;
   const original={src:file.originalSrc??file.src,name:file.originalName??file.name,type:file.type,bytes:file.originalBytes??file.bytes};
   const result=await prepareMediaSave({kind:file.type.startsWith('video/')?'video':'graphic',src:original.src,type:original.type,width:1,height:1,sources:[],name:original.name,original},{signal:current.signal});
   if(current.signal.aborted){result.release();return;}release=result.release;download.file.value={...file,src:result.url,name:result.name,bytes:result.bytes??file.bytes};download.ready.value=true;
  }
  catch(e){if(download.open.value&&controller===current)download.error.value=current.signal.reason instanceof Error?current.signal.reason.message:e instanceof Error?e.message:'The file is unavailable.';}
  finally{clearTimeout(timeout);}
 };
 const begin=()=>{controller?.abort();release?.();release=undefined;const current=new AbortController();controller=current;download.ready.value=false;download.error.value='';download.open.value=true;return current;};
 onMount(()=>{
  const requested=(event:MouseEvent)=>{
   const target=event.target instanceof Element?event.target:null,media=target?.closest('video,img,canvas[data-media-frames]');if(!media)return;
   event.preventDefault();focus=document.activeElement instanceof HTMLElement?document.activeElement:null;download.file.value=null;const current=begin();
   void(async()=>{const catalog=(await import('#/content/media-downloads.json')).default as {files:Record<string,File>;artworks:Record<string,string>};if(current.signal.aborted)return;
    const owner=media.closest('[data-save-url],[data-artwork]'),own=media.closest('[data-save-source]')?.getAttribute('data-save-source')??media.getAttribute('src')??'',art=owner?.getAttribute('data-save-url')??catalog.artworks[owner?.getAttribute('data-artwork')??'']??'';
    const file=media.tagName==='IMG'?(catalog.files[own]??catalog.files[art]):(catalog.files[art]??catalog.files[own]);
    if(!file)throw new Error('A local save file is not available for this artwork. Its original source link is still available on the page.');await check(file,current);
   })().catch(e=>{if(!current.signal.aborted&&controller===current)download.error.value=e instanceof Error?e.message:'File unavailable';});
  };
  document.addEventListener('contextmenu',requested);
  watch(()=>download.open.value,open=>{if(!dialog)return;if(open){if(!dialog.open)dialog.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;dialog?.close();focus?.focus({preventScroll:true});};}dialog.close();});
  onCleanup(()=>{controller?.abort();release?.();document.removeEventListener('contextmenu',requested);});
 });
 return <dialog ref={node=>{dialog=node;}} class="waambat-download" aria-labelledby="download-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}><section class="waambat-download-body"><button type="button" class="waambat-download-close" onClick={close} aria-label="Close download">×</button><p class="waambat-download-kicker">TAKE A LITTLE WAAMBAT WITH YOU</p><h2 id="download-title">{download.error.value?'File unavailable.':download.ready.value?'Ready when you are.':'Preparing your file.'}</h2><p class="waambat-download-copy">The original quality, in a format you can keep.</p>{download.file.value&&<p class="waambat-download-info">{download.file.value.type==='image/svg+xml'?'SVG':download.file.value.type.split('/')[1].toUpperCase()} · {((download.file.value.originalBytes??download.file.value.bytes)/1048576).toFixed(1)} MB</p>}{download.error.value?<div role="alert"><p>{download.error.value}</p>{download.file.value&&<button type="button" onClick={()=>{const file=download.file.value;if(file)void check(file,begin());}}>Try again</button>}</div>:download.ready.value&&download.file.value?<a class="waambat-download-save" href={download.file.value.src} download={download.file.value.name}>Save original <span aria-hidden="true">↓</span></a>:<div class="waambat-download-progress" role="status"><span aria-hidden="true"/>Checking the file…</div>}<button type="button" class="waambat-download-cancel" onClick={close}>Back to the artwork</button></section></dialog>;
}
