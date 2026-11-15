import {readFileSync} from 'node:fs';
import { defineConfig } from '@kerf-js/core/config';
import { definePlugin, defineSlot, provide } from '@kerf-js/core/plugin';
import { media } from '@kerf-js/media';
import { mediaFfmpeg } from '@kerf-js/media-ffmpeg';
import socialImages from './src/content/social-images.json' with {type:'json'};
const api = definePlugin({
 name:'@waambat/api', version:'1.0.0', kerf:'*', namespace:'WA', permissions:{},
 contribute:()=>({provides:[provide(defineSlot({id:'server.extension',version:1,cardinality:'keyed',sides:['server']}),{key:'waambat',sides:{server:{module:'./src/api.server.ts',export:'extension'}}})]}),
});
const immutable={'Cache-Control':'public, max-age=31536000, immutable'};
export default defineConfig({
 tasks:{contracts:{run:'node --import tsx --test test/*.test.ts',description:'Exercise content, storage concurrency, security and media contracts',sideEffects:['network:localhost','fs:/tmp/**']},'media.prepare':{run:'node --import tsx scripts/prepare-media.mjs',description:'Acquire public originals and verify lossless image and video variants',sideEffects:['network','fs:public/media-*/**','fs:src/content/*.json','fs:media/**','fs:.kerf/media-cache/**']},'build.stamp':{run:'node scripts/build-stamp.mjs',description:'Record deploy revision and isolate preview content stores',sideEffects:['fs:src/content/build-stamp.json']}} ,
 hydration:'partial',
 site:{name:'WAAMBAT',url:'https://waamb.at',locale:'en_US',title:'%s — waambat',description:'Video paintings, cryptoart and Ordinals by Lindsay Scoggins, WAAMBAT.',image:{url:socialImages.home,width:1200,height:630},head:`<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=9e9e47ec"><link rel="alternate icon" href="/favicon.ico?v=9e9e47ec"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=9e9e47ec"><link rel="preconnect" href="https://use.typekit.net" crossorigin><style>${readFileSync(new URL('./public/original-fonts.css',import.meta.url),'utf8')}</style>`,limits:{body:2097152,upload:157286400},headers:{'/previews/**':immutable,'/streams/**':immutable,'/paintings/**':immutable,'/media-optimized/**':immutable,'/social/cards/**':immutable,'/hero/**':{'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400'},'/admin/**':{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}}},
 plugins:[api(),media({formats:['avif','webp'],quality:{lossless:true,target:90},placeholder:false,encoder:'compatible',swap:'manual',video:{delivery:'auto',lossless:false,codecs:['av1'],widths:[480,960,1920]}}),mediaFfmpeg()],
});
