import {reviewBuild} from '#/lib/deployment';
import {redirect} from '@kerf-js/start';
import {requireAdmin} from './auth';
export const isPrivateSite=()=>process.env.WAAMBAT_PRIVATE_SITE==='1'||reviewBuild();
export async function requirePreviewAccess(request:Request){if(isPrivateSite()){try{await requireAdmin(request);}catch{redirect('/admin');}}}
