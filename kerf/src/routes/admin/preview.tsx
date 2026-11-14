import {redirect,type LoadArgs,type RouteProps} from '@kerf-js/start';
import {derived} from '@kerf-js/core';
import {requireAdmin} from '#/server/auth';
import {getContentState} from '#/server/content';
import {activeHero} from '#/lib/hero';
import {publicForm} from '#/lib/forms';
import Layout from '#/components/Layout';
import ContentPage from '#/components/ContentPage';
import Gallery from '#/components/Gallery';
import Hero from '#/components/Hero';
export const meta={title:'Private draft preview',description:'Private preview of the saved WAAMBAT draft.',extra:[{name:'robots',content:'noindex, nofollow'}]};
export const load=async({request}:LoadArgs)=>{try{await requireAdmin(request);}catch{redirect('/admin');}return {state:await getContentState(),page:new URL(request.url).searchParams.get('page')??'nfts'};};
export default function Preview(props:RouteProps<typeof load>){const page=derived(()=>props.data.state.draft.pages.find(p=>p.slug===props.data.page)),hero=derived(()=>page.value?null:activeHero(props.data.state.draft,props.data.page));return <Layout preview theme={props.data.state.draft.theme} navigation={props.data.state.draft.navigation} wide={page.value?.layout==='archive'||props.data.page==='ordinals'} hasHero={!!hero.value} hero={hero.value&&<Hero section={hero.value.section} item={hero.value.item} preview/>}><div className="border-waambat-pink mb-8 border p-4 text-center"><strong>Private draft · revision {props.data.state.revision.slice(0,12)}</strong><p>This is the saved draft. Public visitors still see the published version.</p><a href="/admin">Return to studio</a> · <a href="/admin/preview?page=nfts">NFTs</a> · <a href="/admin/preview?page=ordinals">Ordinals</a></div>{page.value&&<ContentPage page={page.value} forms={props.data.state.draft.forms.filter(f=>f.enabled&&f.page===props.data.page).map(publicForm)} preview/>}<Gallery content={props.data.state.draft} page={props.data.page}/></Layout>;}
