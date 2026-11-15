import stamp from '#/content/build-stamp.json';
export const deployContext=()=>process.env.WAAMBAT_DEPLOY_CONTEXT??process.env.CONTEXT??stamp.context;
export const contentContext=()=>process.env.WAAMBAT_CONTENT_CONTEXT??stamp.contentContext;
export const buildRevision=()=>process.env.WAAMBAT_BUILD_REVISION??stamp.revision;
export const reviewBuild=()=>process.env.WAAMBAT_REVIEW_BUILD==='1'||stamp.review;
