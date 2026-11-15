import {writeFile} from 'node:fs/promises';
const context=process.env.CONTEXT??'development',review=process.env.WAAMBAT_PRIVATE_SITE==='1';
const stamp={context,revision:process.env.COMMIT_REF??'local-working-tree',review,contentContext:context==='deploy-preview'?`review-${process.env.REVIEW_ID??'1'}`:'production'};
await writeFile(new URL('../src/content/build-stamp.json',import.meta.url),JSON.stringify(stamp)+'\n');
console.log(`WAAMBAT build ${stamp.revision.slice(0,12)} (${context}; content ${stamp.contentContext})`);
