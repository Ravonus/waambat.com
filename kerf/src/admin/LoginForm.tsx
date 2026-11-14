import {state} from '@kerf-js/core';
export async function signIn(provider:string,fields:Record<string,string>={}){
 const csrf=await fetch('/api/auth/csrf').then(r=>r.json()) as {csrfToken:string};
 const response=await fetch(`/api/auth/${provider==='credentials'?'callback':'signin'}/${provider}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({...fields,csrfToken:csrf.csrfToken,callbackUrl:'/admin'})});
 const result=await response.json() as {url?:string};
 if(!response.ok||!result.url||new URL(result.url,location.origin).searchParams.has('error'))throw new Error('Sign-in could not be completed. Check your credentials and try again.');
 location.assign(result.url);
}
export default function LoginForm(){
 const busy=state(false),error=state('');
 const submit=async(e:Event & {currentTarget:HTMLFormElement})=>{e.preventDefault();if(busy.value)return;const form=new FormData(e.currentTarget);busy.value=true;error.value='';try{await signIn('credentials',{username:String(form.get('username')??''),password:String(form.get('password')??'')});}catch(e){error.value=e instanceof Error?e.message:'Sign-in unavailable';}finally{busy.value=false;}};
 return <form onSubmit={submit} className="mt-8 space-y-4"><h2 className="text-waambat-pink">Administrator login</h2><label className="block">Username<input name="username" defaultValue="admin" autoComplete="username" required maxLength={40} className="mt-2 block w-full border border-white/30 bg-black p-2"/></label><label className="block">Password<input name="password" type="password" autoComplete="current-password" required maxLength={200} className="mt-2 block w-full border border-white/30 bg-black p-2"/></label><button disabled={busy.value} className="border-waambat-pink rounded border px-5 py-2">{busy.value?'Signing in…':'Sign in with password'}</button>{error.value&&<p role="alert">{error.value}</p>}</form>;
}
