import auth from './auth.server';
export default async function context({request}:{request:Request}){return {...await auth.session(request)};}
