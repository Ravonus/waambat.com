#!/usr/bin/env node
// Builds the WAAMBAT hero timeline (Keel trailer timeline-v1) from the composition below.
//
//   node keel/hero/build-timeline.mjs [--out timeline.json] [--scale 1] [--fps 24]
//
// One timeline renders both deliveries: "desktop" (1280x720, wordmark column on the left) and
// "mobile" (720x900, wordmark band on top). Layer rects are derived from stage fractions so the
// two frames stay compositions of the same shots, not crops of each other.
//
// Every source is one of WAAMBAT's own works. Nothing is rotated or restyled: layers only crop,
// place, blend and push in slowly. Datamosh / mosaic / displace transitions bridge the shots, and the
// last shot hands over to the first so the video loops without a join.
import {writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';

const {values:args}=parseArgs({options:{out:{type:'string',default:'keel/hero/timeline.json'},scale:{type:'string',default:'1'},fps:{type:'string',default:'24'}}});
const K=Number(args.scale),FPS=Number(args.fps);

// ---- sources (see sources.json for provenance). `d` is duration in seconds.
const S={
  feels404:{file:'artwork-01-feels-404',d:30},animal:{file:'artwork-02-animal-spirits',d:30},swap:{file:'artwork-03-swap-exchange',d:30},
  boiama:{file:'artwork-05-enter-boi-ama',d:30},disco:{file:'artwork-06-fap-disco',d:30},haptic:{file:'artwork-07-haptic-feedback',d:30},
  swipe:{file:'artwork-08-swipe-swag',d:30},profits:{file:'artwork-09-profits',d:30},netmelt:{file:'artwork-10-net-melt',d:30},
  troll:{file:'artwork-11-troll-crash',d:30},goat:{file:'artwork-12-goat',d:30},cord:{file:'artwork-13-cord-cutter',d:30},
  hard:{file:'artwork-14-hard-launch',d:20},future:{file:'artwork-15-fucking-future',d:20},lore:{file:'artwork-16-joys-of-lore',d:30},
  meta:{file:'artwork-17-meta-matters',d:30},cheers:{file:'artwork-18-cheers-chad',d:30},catfish:{file:'artwork-19-catfish-glitch',d:30},
  axiom:{file:'artwork-20-axiom-glow-up',d:60,w:960,h:1706},deep:{file:'artwork-21-deep-linking',d:30},sus:{file:'artwork-22-sus-singularity',d:30,w:960,h:1706},
  abacus:{file:'artwork-23-abacus-ram',d:9.2,w:960,h:506},selfie:{file:'art-video-3',d:13.7,w:960,h:1200},mass:{file:'art-video-4',d:60},
  gallery:{file:'art-video-2',d:24.4,w:720,h:404},bio:{file:'bio-animation',d:9.1,w:960,h:1196},
  // Text-bearing source videos are used only through crops that exclude the text.
  eggplant:{file:'contact-video',d:1.8,crop:{x:20,y:80,width:410,height:820}},
  fire:{file:'mechanics-2',d:23.6,crop:{x:110,y:380,width:740,height:580},in:20,out:22.7},
  tweet:{file:'press-3',d:6.6,crop:{x:190,y:360,width:710,height:700},in:4.5,loop:false},
  strip:{file:'press-1',d:3.3,crop:{x:14,y:146,width:468,height:196},hold:36},
  faces:{file:'press-5',d:44.7,in:10},selfieLo:{file:'press-2',d:13.6,w:320,h:400},
  lux:{file:'lux',d:28,kind:'captured',blackPoint:.12},kismet:{file:'kismet',d:15,kind:'captured'},
};

// ---- stage geometry. Placement is [cx, cy, w, h]: stage fractions for the centre, widths in units of
// the shorter frame side (720px) so squares stay square in both deliveries.
const U=720;
const FORMATS={
  desktop:{width:Math.round(1280*K),height:Math.round(720*K),stage:{x:300,y:0,w:980,h:720}},
  mobile:{width:Math.round(720*K),height:Math.round(900*K),stage:{x:0,y:168,w:720,h:732}},
};
const rectOf=(f,[cx,cy,w,h])=>{const st=f.stage;return{x:Math.round(K*(st.x+cx*st.w-w*U/2)),y:Math.round(K*(st.y+cy*st.h-h*U/2)),width:Math.max(2,Math.round(K*w*U)),height:Math.max(2,Math.round(K*h*U))};};

// ---- layers
let cursor=0;
function layer(src,o={}){
  const s=S[src];if(!s)throw Error('unknown source '+src);
  const at=o.at??[.55,.5,.95,.95],m=o.m??at;
  const dur=s.d;const start=o.in??s.in??Math.max(0,(cursor++*3.37)%Math.max(.5,dur-3.5));
  const L={source:src,fit:o.fit??'cover',blend:o.blend??'normal'};
  if(s.crop)L.crop=s.crop;
  if(o.crop)L.crop=o.crop;
  if(s.hold!==undefined)L.holdFrame=s.hold;else{L.in=+start.toFixed(2);if(s.out!==undefined)L.out=s.out;if(dur<7&&s.out===undefined&&s.loop!==false)L.loop=true;}
  for(const k of ['opacity','mask','feather','scaleFrom','scaleTo','driftX','driftY','fadeInBeats','fadeOutBeats','invert','posterize'])if(o[k]!==undefined)L[k]=o[k];
  if(s.blackPoint)L.blackPoint=s.blackPoint;
  const wide=o.stage==='full';
  const rects={};for(const [id,f] of Object.entries(FORMATS)){
    const place=id==='desktop'?at:m;
    rects[id]=wide?{x:Math.round(K*f.stage.x),y:Math.round(K*f.stage.y),width:Math.round(K*f.stage.w),height:Math.round(K*f.stage.h)}:rectOf(f,place);
  }
  L.rect=rects.desktop;L.rectVariants=[{target:'mobile',rect:rects.mobile}];
  return L;
}
const bg=(src,o={})=>layer(src,{stage:'full',blend:'add',opacity:.3,mask:'ellipse',feather:.95,scaleFrom:1,scaleTo:1.1,...o});

const quiet={bloom:{radius:26*K,gain:.32,threshold:.55},chroma:{pixels:1.5*K,radial:true},pulse:{periodBeats:9,amount:.012}};
const loud={bloom:{radius:34*K,gain:.5,threshold:.5},chroma:{pixels:4*K,radial:true},pulse:{periodBeats:9,amount:.02}};

// ---- shots: [id, post, transition-in, layers]. Each lasts 6 beats (3 s at 120 bpm).
const shots=[
  {id:'goat',post:quiet,layers:[
    bg('mass'),
    layer('goat',{at:[.57,.5,.96,.96],m:[.5,.52,.9,.9],scaleFrom:1,scaleTo:1.06}),
    layer('kismet',{at:[.1,.82,.28,.28],m:[.3,.945,.2,.2],in:1.2,blend:'screen',fadeInBeats:1}),
    layer('cord',{at:[.97,.15,.24,.24],m:[.86,.065,.2,.2],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'lux',post:quiet,transition:{type:'displace',beats:1.5,strength:26*K},layers:[
    bg('deep',{opacity:.22}),
    layer('lux',{at:[.57,.5,.8,.8],m:[.5,.52,.8,.8],blend:'screen',scaleFrom:1,scaleTo:1.05}),
    layer('disco',{at:[.07,.2,.3,.3],m:[.13,.07,.21,.21],blend:'screen',fadeInBeats:1}),
    layer('profits',{at:[.05,.86,.3,.3],m:[.88,.94,.21,.21],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'faces',post:loud,transition:{type:'datamosh',beats:2,blockSize:16,strength:1.1},layers:[
    bg('catfish',{opacity:.34}),
    layer('selfie',{at:[.58,.5,.78,.97],m:[.5,.52,.72,.9],fit:'cover',in:.4,scaleFrom:1,scaleTo:1.04}),
    layer('eggplant',{at:[.06,.79,.16,.34],m:[.1,.93,.12,.2],blend:'screen',fadeInBeats:1}),
    layer('haptic',{at:[.93,.2,.28,.28],m:[.9,.07,.2,.2],blend:'lighten',fadeInBeats:1.5}),
    layer('selfieLo',{at:[.95,.82,.17,.2],m:[.1,.07,.13,.16],blend:'screen',opacity:.8,fadeInBeats:2}),
  ]},
  {id:'hard',post:quiet,transition:{type:'mosaic',beats:1.5,blockSize:64*K},layers:[
    bg('axiom',{opacity:.2}),
    layer('hard',{at:[.57,.5,.96,.96],m:[.5,.52,.9,.9],scaleFrom:1,scaleTo:1.06}),
    layer('troll',{at:[.07,.78,.3,.3],m:[.3,.945,.2,.2],blend:'screen',fadeInBeats:1}),
    layer('future',{at:[.94,.17,.25,.25],m:[.86,.065,.2,.2],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'kismet',post:quiet,transition:{type:'displace',beats:1.5,strength:30*K},layers:[
    bg('sus',{opacity:.2}),
    layer('kismet',{at:[.57,.5,.86,.86],m:[.5,.52,.84,.84],in:3.8,blend:'screen',scaleFrom:1,scaleTo:1.04}),
    layer('feels404',{at:[.07,.2,.3,.3],m:[.13,.07,.21,.21],blend:'screen',fadeInBeats:1}),
    layer('fire',{at:[.07,.8,.22,.2],m:[.88,.94,.2,.17],blend:'screen',fadeInBeats:1,fadeOutBeats:1}),
    layer('netmelt',{at:[.95,.82,.26,.26],m:[.3,.945,.2,.2],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'animal',post:quiet,transition:{type:'datamosh',beats:2,blockSize:16,strength:1},layers:[
    bg('faces',{opacity:.24}),
    layer('animal',{at:[.57,.5,.96,.96],m:[.5,.52,.9,.9],scaleFrom:1,scaleTo:1.05}),
    layer('bio',{at:[.05,.8,.2,.26],m:[.88,.07,.14,.18],in:1.9,blend:'screen',opacity:.9,fadeInBeats:1.5}),
    layer('tweet',{at:[.95,.82,.22,.22],m:[.3,.945,.2,.2],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'dense',post:loud,transition:{type:'mosaic',beats:1.5,blockSize:96*K},layers:[
    layer('faces',{at:[.58,.5,.96,.96],m:[.5,.52,.92,.92],blend:'normal',in:24,scaleFrom:1,scaleTo:1.07}),
    layer('boiama',{at:[.07,.78,.34,.34],m:[.3,.93,.22,.22],blend:'screen',fadeInBeats:1}),
    layer('meta',{at:[.95,.2,.3,.3],m:[.86,.075,.22,.22],blend:'lighten',fadeInBeats:1.5}),
  ]},
  {id:'lore',post:quiet,transition:{type:'displace',beats:1.5,strength:24*K},layers:[
    layer('lore',{at:[.55,.5,.92,.92],m:[.5,.52,.9,.9],scaleFrom:1,scaleTo:1.05}),
    layer('cheers',{at:[.93,.8,.46,.46],m:[.84,.9,.4,.4],blend:'screen',scaleFrom:1,scaleTo:1.06,fadeInBeats:1.5}),
    layer('swipe',{at:[.1,.82,.3,.3],m:[.3,.945,.2,.2],blend:'lighten',fadeInBeats:1.5}),
    layer('abacus',{at:[.2,.1,.4,.21],m:[.3,.07,.5,.14],blend:'screen',opacity:.85,fadeInBeats:1.5,fit:'cover'}),
    layer('gallery',{at:[.94,.1,.3,.17],m:[.82,.07,.34,.14],blend:'screen',opacity:.8,in:17,fadeInBeats:2}),
  ]},
  // Pre-seam tail: its last beats are replaced by the hand-over to the first shot.
  {id:'tail',post:quiet,transition:{type:'datamosh',beats:2,blockSize:16,strength:1},beats:3,layers:[
    bg('swap',{opacity:.9,mask:'ellipse',feather:.5}),
    layer('strip',{at:[.2,.16,.26,.14],m:[.2,.07,.34,.15],blend:'screen',opacity:.9}),
  ]},
];
const BEATS=6,SEAM=3,beatsOf=s=>s.beats??BEATS;
let at=0;
const timelineShots=shots.map(s=>{
  const shot={id:s.id,kind:'stage',startBeat:at,beats:beatsOf(s),layers:s.layers,post:s.post};
  if(s.transition)shot.transition=s.transition;
  at+=beatsOf(s);return shot;
});

const sources=Object.entries(S).map(([id,s])=>({id,kind:'video',path:`src/${s.file}.mp4`}));
const timeline={
  version:1,name:'waambat-hero',brief:'WAAMBAT hero montage: her own works layered on black, bridged by datamosh, mosaic and chromatic displacement, looping seamlessly.',
  fps:FPS,seed:7,tempo:{bpm:120,firstDownbeat:0},background:'#000000',sources,shots:timelineShots,
  loop:{seamBeats:SEAM,transition:{type:'datamosh',beats:2.4,blockSize:16,strength:1}},
  targets:[
    {id:'desktop',width:FORMATS.desktop.width,height:FORMATS.desktop.height,silent:true,maxBytes:3900000,posterBeat:SEAM},
    {id:'mobile',width:FORMATS.mobile.width,height:FORMATS.mobile.height,silent:true,maxBytes:2900000,posterBeat:SEAM},
  ],
};
writeFileSync(args.out,JSON.stringify(timeline,null,1)+'\n');
const total=at*.5-SEAM*.5;
console.error(`wrote ${args.out}: ${timelineShots.length} shots, ${sources.length} sources, ${total}s output at ${FPS} fps`);
