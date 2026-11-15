import test from 'node:test';
import assert from 'node:assert/strict';
import {inscriptionBodies} from '../scripts/media/inscription-body.mjs';
const transaction=(script:Buffer)=>({vin:[{witness:['00'.repeat(64),script.toString('hex'),'c0'+'00'.repeat(32)]}]});
test('standalone inscription image recovery concatenates data pushes without interpreting image bytes as opcodes',()=>{
 const image=Buffer.concat([Buffer.from('GIF89a'),Buffer.from('0063036f7264','hex')]);
 const push=(bytes:Buffer)=>Buffer.concat([Buffer.from([bytes.length]),bytes]);
 const script=Buffer.concat([Buffer.from('0063','hex'),push(Buffer.from('ord')),push(Buffer.from([1])),push(Buffer.from('image/gif')),Buffer.from([0]),push(image.subarray(0,4)),push(image.subarray(4)),Buffer.from([0x68])]);
 const bodies=inscriptionBodies(transaction(script));
 assert.equal(bodies[0].type,'image/gif');assert.deepEqual(bodies[0].bytes,image);
});
test('encoded or delegated envelopes are refused instead of claiming their body is the original image',()=>{
 const script=Buffer.from('0063036f7264010109696d6167652f676966010902627200010168','hex');
 assert.throws(()=>inscriptionBodies(transaction(script)),/own resolver/);
});
test('truncated pushes from an upstream transaction are refused',()=>{
 assert.throws(()=>inscriptionBodies(transaction(Buffer.from('4dffff01','hex'))),/Truncated push/);
});
