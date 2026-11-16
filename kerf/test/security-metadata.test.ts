import test from 'node:test';
import assert from 'node:assert/strict';
import {contentSecurityPolicy,analyticsScriptURL} from '../src/lib/security';
import {artistGraph,pageGraph,robotsMeta} from '../src/lib/site-settings';
import {seedContent} from '../src/content/seed';
import {trackPublicPage} from '../src/lib/analytics';

test('the policy enforces nonce scripts and named Trusted Types; analytics accepts only a GA4 identifier',()=>{
 assert.match(contentSecurityPolicy,/script-src 'nonce-\{kerf\}' 'strict-dynamic'/);
 assert.match(contentSecurityPolicy,/require-trusted-types-for 'script'/);
 assert.match(contentSecurityPolicy,/trusted-types kerf-html waambat-analytics goog#html/);
 assert.ok(!contentSecurityPolicy.includes('unsafe-eval'));
 assert.ok(!contentSecurityPolicy.includes('trusted-types default'));
 assert.equal(analyticsScriptURL('G-1234567890'),'https://www.googletagmanager.com/gtag/js?id=G-1234567890');
 for(const id of ['GTM-ABC','G-1234567890&evil=1','https://evil.test','G-<script>'])assert.throws(()=>analyticsScriptURL(id));
});

test('published page graphs use the real artist, current page and current sharing image',()=>{
 const content=structuredClone(seedContent);content.seo.socialImage='/artist-updated.jpg';
 const graph=pageGraph(content,'/bio-waambat','Artist biography','Current published biography','AboutPage');
 const page=graph['@graph'].at(-1)!;
 assert.equal(page['@type'],'AboutPage');assert.equal(page['@id'],'https://waamb.at/bio-waambat#page');
 assert.ok(JSON.stringify(page).includes('https://waamb.at/artist-updated.jpg'));
 assert.ok(JSON.stringify(page).includes('https://waamb.at/#artist'));
 assert.equal(robotsMeta(false).content,'noindex, nofollow');
});

test('the artist brand uses the published sigil without inventing an organization',()=>{
 const content=structuredClone(seedContent);content.seo.logo='/custom-sigil.svg';
 const graph=artistGraph(content),brand=graph['@graph'].find(node=>node['@type']==='Brand');
 assert.ok(JSON.stringify(brand).includes('https://waamb.at/custom-sigil.svg'));
 assert.ok(JSON.stringify(graph).includes('https://waamb.at/#brand'));
 assert.ok(!JSON.stringify(graph).includes('Organization'));
});

test('page views queue immediately, but the GA4 script waits for load and idle and respects disabling',()=>{
 const previous={window:globalThis.window,document:globalThis.document,location:globalThis.location};
 const events:unknown[][]=[],scripts:unknown[]=[];let loaded:()=>void=()=>{},idle:()=>void=()=>{};
 const win={gtag:(...args:unknown[])=>events.push(args),addEventListener:(_name:string,run:()=>void)=>{loaded=run;},requestIdleCallback:(run:()=>void)=>{idle=run;}};
 const settings={analyticsEnabled:true,googleAnalyticsId:'G-0987654321',googleSiteVerification:''};
 Object.assign(globalThis,{window:win,location:{hostname:'waamb.at'},document:{readyState:'loading',querySelector:()=>null,createElement:()=>({dataset:{}}),head:{append:(script:unknown)=>scripts.push(script)}}});
 try{
  trackPublicPage(settings,'/','waambat',true);
  assert.equal(events.filter(e=>e[0]==='event').length,1);assert.equal(scripts.length,0);
  loaded();assert.equal(scripts.length,0);idle();assert.equal(scripts.length,1);
  trackPublicPage({...settings,analyticsEnabled:false},'/','waambat',true);
  assert.equal((win as Record<string,unknown>)['ga-disable-G-0987654321'],true);
 }finally{Object.assign(globalThis,previous);}
});
