import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
import type {} from 'nitro/vite';
export default defineConfig({plugins:[tailwindcss()],nitro:{routeRules:{
 '/api/contact':{proxy:'/_kerf/x/waambat/contact'},
 '/api/admin/**':{proxy:'/_kerf/x/waambat/admin/**'},
 '/api/media/**':{proxy:'/_kerf/x/waambat/media/**'},
 '/robots.txt':{proxy:'/_kerf/x/waambat/robots'},
 '/sitemap.xml':{proxy:'/_kerf/x/waambat/sitemap'},
}}});
