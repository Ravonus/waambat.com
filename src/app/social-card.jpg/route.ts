import {getPublishedContent} from '~/server/content';
import {requirePreviewAccess} from '~/server/preview-access';
import {socialCardResponse} from '~/server/social-card';
export const dynamic='force-dynamic';
export async function GET(request:Request){await requirePreviewAccess();return socialCardResponse(request,await getPublishedContent());}
export const HEAD=GET;
