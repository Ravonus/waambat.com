import type {LoadArgs,RouteProps} from '@kerf-js/start';
import {state} from '@kerf-js/core';
import {requireAdmin,authConfigured,githubConfigured,googleConfigured} from '#/server/auth';
import {passwordConfigured} from '#/server/admin-database';
import {getContentState} from '#/server/content';
import Editor from '#/admin/Editor';
import LoginForm,{signIn} from '#/admin/LoginForm';
export const meta={title:'Content studio',description:'WAAMBAT private content studio.',extra:[{name:'robots',content:'noindex, nofollow'}]};
export const load=async({request}:LoadArgs)=>{let authorized=false;try{await requireAdmin(request);authorized=true;}catch{}return {authorized,configured:authConfigured(),password:passwordConfigured(),google:googleConfigured(),github:githubConfigured(),state:authorized?await getContentState():null};};
export default function Admin(props:RouteProps<typeof load>){const error=state('');const oauth=async(provider:string)=>{try{await signIn(provider);}catch(e){error.value=e instanceof Error?e.message:'Sign-in unavailable';}};
 const signOut=async()=>{const csrf=await fetch('/api/auth/csrf').then(r=>r.json());await fetch('/api/auth/signout',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:csrf.csrfToken,callbackUrl:'/admin'})});location.assign('/admin');};
 return <main id="main-content" className={props.data.authorized?'mx-auto max-w-6xl p-5 md:p-10':'mx-auto max-w-xl p-8 pt-20'}>{props.data.authorized&&props.data.state?<><div className="mb-8 flex items-center justify-between"><a href="/" className="text-waambat-logo text-xl">waambat / content studio</a><button onClick={signOut}>Sign out</button></div><Editor initial={props.data.state}/></>:<><a href="/" className="text-waambat-logo">waambat</a><h1 className="text-waambat-pink mt-6 text-3xl">Content studio</h1><p className="my-6">Manage artwork, sections and videos. Saved drafts stay private until you publish.</p>{props.data.configured?<>{props.data.google&&<button onClick={()=>oauth('google')} className="border-waambat-pink rounded border px-5 py-2">Sign in with Google</button>}{props.data.github&&<button onClick={()=>oauth('github')} className="border-waambat-pink rounded border px-5 py-2">Sign in with GitHub</button>}{props.data.password&&<LoginForm/>}{error.value&&<p role="alert">{error.value}</p>}</>:<p role="status">Admin is disabled until authorized sign-in and storage are configured. Contact the site maintainer to enable access.</p>}</>}</main>;
}
