"use client";
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import type {Content} from '~/lib/content';
import {trackPublicPage,trackingTitle} from '~/lib/analytics';
export default function Analytics({content,allowed}:{content:Content;allowed:boolean}){const path=usePathname();useEffect(()=>{trackPublicPage(content.integrations,path,trackingTitle(content,path),allowed);return ()=>trackPublicPage(content.integrations,path,document.title,false);},[content,path,allowed]);return null;}
