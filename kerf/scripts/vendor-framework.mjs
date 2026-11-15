// Pin reviewed local Kerf packages without depending on unpublished platform addons.
// Like Kerf's release staging, absent compiler packages use the bundled WASM fallback.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync,readdirSync,unlinkSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
if(!process.argv[2]||process.argv[2].startsWith('--'))throw new Error('Usage: node scripts/vendor-framework.mjs /path/to/kerf [--only=media]');
const framework=resolve(process.argv[2]);
const selected=process.argv.find(value=>value.startsWith('--only='))?.slice(7).split(',');
const app=resolve(import.meta.dirname,'..'),vendor=join(app,'vendor');
const receipt=JSON.parse(readFileSync(join(vendor,'framework-media.json'),'utf8'));
const pkg=JSON.parse(readFileSync(join(app,'package.json'),'utf8'));
for(const entry of Object.values(receipt.packages))entry.sourceRevision??=receipt.sourceRevision;
receipt.sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:framework,encoding:'utf8'}).trim();
receipt.manifestAdjustments={'@kerf-js/core':{omittedOptionalDependencies:['@kerf-js/compiler-win32-arm64'],reason:'No 0.1.0 package exists on npm; Windows ARM uses the bundled matching WASM compiler, as in Kerf release staging.'}};
if(!selected||selected.includes('core'))execFileSync(process.execPath,['packages/core/scripts/copy-docs.mjs'],{cwd:framework,stdio:'inherit'});
for(const name of ['core','media','media-ffmpeg','veneer-core']){
 if(selected&&!selected.includes(name))continue;
 const packed=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',vendor],{cwd:join(framework,'packages',name),encoding:'utf8'}))[0];
 let file=join(vendor,packed.filename);
 if(name==='core'){
  const staging=mkdtempSync(join(tmpdir(),'waambat-framework-'));
  try{
   execFileSync('tar',['-xzf',file,'-C',staging]);
   const manifest=join(staging,'package/package.json'),value=JSON.parse(readFileSync(manifest,'utf8'));
   delete value.optionalDependencies['@kerf-js/compiler-win32-arm64'];
   writeFileSync(manifest,JSON.stringify(value,null,2)+'\n');
   const result=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',staging],{cwd:join(staging,'package'),encoding:'utf8'}))[0];
   unlinkSync(file);renameSync(join(staging,result.filename),file);
  }finally{rmSync(staging,{recursive:true,force:true});}
 }
 const sha256=createHash('sha256').update(readFileSync(file)).digest('hex');
 const target=`kerf-${name}-media-${sha256.slice(0,12)}.tgz`;
 renameSync(file,join(vendor,target));
 receipt.packages[`@kerf-js/${name}`]={file:target,sha256,size:statSync(join(vendor,target)).size,sourceRevision:receipt.sourceRevision};
 pkg.dependencies[`@kerf-js/${name}`]=`file:vendor/${target}`;
}
writeFileSync(join(vendor,'framework-media.json'),JSON.stringify(receipt,null,2)+'\n');
writeFileSync(join(app,'package.json'),JSON.stringify(pkg,null,2)+'\n');
const used=new Set(Object.values(receipt.packages).map(p=>p.file));
for(const file of readdirSync(vendor))if(/^kerf-.*-media-.*\.tgz$/.test(file)&&!used.has(file))unlinkSync(join(vendor,file));
console.log(JSON.stringify(receipt,null,2));
