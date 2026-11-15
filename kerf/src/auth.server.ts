import {defineAuth} from '@kerf-js/start/auth';
import {auth,handler} from './server/auth';
export default defineAuth({handler,async session(request){const value=await auth(request);return {user:value?.user??null,session:value};}});
