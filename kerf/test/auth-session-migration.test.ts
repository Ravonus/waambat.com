import test from 'node:test';
import assert from 'node:assert/strict';
import {encode} from '@auth/core/jwt';

const secret = 'waambat-local-session-migration-fixture-only-64-characters-long';
Object.assign(process.env, {
 AUTH_SECRET:secret,
 AUTH_GITHUB_ID:'fixture', AUTH_GITHUB_SECRET:'fixture', ADMIN_GITHUB_IDS:'42',
 AUTH_GOOGLE_ID:'fixture', AUTH_GOOGLE_SECRET:'fixture', ADMIN_EMAILS:'owner@example.test',
});
const {requireAdmin,authConfig}=await import('../src/server/auth');
authConfig.logger={error(){},warn(){},debug(){}};

async function request(token:Record<string,unknown>,secure=true,maxAge=300){
 const cookie=secure?'__Secure-authjs.session-token':'authjs.session-token';
 const value=await encode({secret,salt:cookie,token,maxAge});
 return new Request(`${secure?'https':'http'}://waamb.at/api/admin/content`,{headers:{cookie:`${cookie}=${value}`}});
}

test('existing Auth.js secure and local session cookies still authorize an approved GitHub ID',async()=>{
 assert.equal(await requireAdmin(await request({adminId:'42',sub:'42'})),'42');
 assert.equal(await requireAdmin(await request({adminId:'42',sub:'42'},false)),'42');
});

test('existing Google sessions keep their verified-email requirement',async()=>{
 assert.equal(await requireAdmin(await request({adminId:'google:owner@example.test',verifiedEmail:true})),'google:owner@example.test');
 await assert.rejects(()=>request({adminId:'google:owner@example.test',verifiedEmail:false}).then(requireAdmin),{status:401});
});

test('a validly signed but unapproved ID and an expired session remain unauthorized',async()=>{
 await assert.rejects(()=>request({adminId:'999',sub:'999'}).then(requireAdmin),{status:401});
 await assert.rejects(()=>request({adminId:'42'},true,-3600).then(requireAdmin),{status:401});
 await assert.rejects(()=>requireAdmin(new Request('https://waamb.at/api/admin/content')),{status:401});
});
