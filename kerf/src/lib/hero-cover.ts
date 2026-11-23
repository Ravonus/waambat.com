import desktop from '#/assets/covers/hero-desktop.webp?inline';
import mobile from '#/assets/covers/hero-mobile.webp?inline';
/** Inline only the verified tiny covers for the shipped loop; artist replacements use their own cover. */
export function inlineHeroCover(preview:{src:string}|undefined){
 if(preview?.src==='/display-previews/first-c23d905e6921efbfb26b-1280-08ba1786fba18e9dd5f1.webp')return desktop;
 if(preview?.src==='/display-previews/first-71ca69d9e796b02a22d5-720-ed5622ed9b6696cf4060.webp')return mobile;
 return undefined;
}
