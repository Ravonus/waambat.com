import type {Content} from './content';
const replacements:Record<string,string>={
  "https://foundation.app/@waambat/foundation/38901": "https://opensea.io/item/ethereum/0x3b3ee1931dc30c1957379fac9aba94d1c48a5405/38901",
  "https://foundation.app/@waambat/foundation/37954": "https://opensea.io/item/ethereum/0x3b3ee1931dc30c1957379fac9aba94d1c48a5405/37954",
  "https://foundation.app/waambat": "https://opensea.io/waambat"
};
/** Known original works keep their token identity when the old marketplace closes. */
export function correctMarketplaceLinks(content:Content){let changed=false;function visit(value:unknown):unknown{if(typeof value==='string'&&replacements[value]){changed=true;return replacements[value];}if(Array.isArray(value))return value.map(visit);if(value&&typeof value==='object'){const input=value as Record<string,unknown>;const output=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,visit(v)]));if((input.href&&replacements[String(input.href)])&&input.text==='Foundation')output.text='OpenSea';return output;}return value;}const updated=visit(content) as Content;return {content:changed?updated:content,changed};}
