"use client";
import type {Content} from '~/lib/content';
export default function SiteSettingsEditor({content,onChange}:{content:Content;onChange:(patch:Partial<Pick<Content,'seo'|'integrations'>>)=>void}){
 const field='mt-1 w-full rounded border border-white/30 bg-black px-3 py-2 text-white';
 return <section className="rounded border border-white/25 p-5 space-y-4" aria-label="Search, sharing and analytics">
  <h2 className="text-waambat-pink text-xl">Search, sharing &amp; analytics</h2>
  <p className="text-sm text-white/75">Save the draft, preview, then publish. Replace the measurement ID with your own to send new visits to your property. These are public settings; passwords and Google credentials never belong here.</p>
  <label className="block"><input type="checkbox" checked={content.integrations.analyticsEnabled} onChange={e=>onChange({integrations:{...content.integrations,analyticsEnabled:e.target.checked}})}/> Enable Google Analytics on the published site</label>
  <label className="block">Google Analytics measurement ID<input aria-label="Google Analytics measurement ID" placeholder="G-XXXXXXXXXX" value={content.integrations.googleAnalyticsId} onChange={e=>onChange({integrations:{...content.integrations,googleAnalyticsId:e.target.value.trim().toUpperCase()}})} className={field}/></label>
  <p className="text-sm text-white/65">Use GA4 Admin → Data streams → Web → Measurement ID. Keep Enhanced measurement off: the site sends one page view after each public page opens. Admin, previews, query strings and form contents are excluded.</p>
  <label className="block">Google Search Console verification<input aria-label="Google Search Console verification" value={content.integrations.googleSiteVerification} onChange={e=>onChange({integrations:{...content.integrations,googleSiteVerification:e.target.value.trim()}})} className={field}/></label>
  {([['homeTitle','Home page browser title'],['description','Default search description'],['socialImage','Default social image URL (empty generates a card from published content)'],['artistImage','Artist image URL'],['logo','Artist sigil / logo URL']] as const).map(([key,label])=><label key={key} className="block">{label}<input aria-label={label} value={content.seo[key]} onChange={e=>onChange({seo:{...content.seo,[key]:e.target.value}})} className={field}/></label>)}
  <p className="text-sm text-white/65">Use uploaded or site-hosted images for the generated card; paste their URL here. Each page can override its search title, description and social image. The WAAMBAT wordmark stays in place.</p>
 </section>;
}
