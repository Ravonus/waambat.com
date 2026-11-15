// Read data pushes rather than scanning inside signatures or compressed image bytes.
function instructions(script){
 const tokens=[];
 for(let offset=0;offset<script.length;){
  const op=script[offset++];let length;
  if(op<=75)length=op;
  else if(op>=76&&op<=78){const count=2**(op-76);if(offset+count>script.length)throw new Error('Truncated push length');length=script.readUIntLE(offset,count);offset+=count;}
  else{tokens.push(op);continue;}
  if(offset+length>script.length)throw new Error('Truncated push data');
  tokens.push(script.subarray(offset,offset+length));offset+=length;
 }
 return tokens;
}
export function inscriptionBodies(transaction){
 const result=[];
 for(const input of transaction.vin){
  const witness=[...(input.witness??[])];if(witness.at(-1)?.startsWith('50'))witness.pop();
  const control=Buffer.from(witness.at(-1)??'','hex');
  if(control.length<33||(control.length-33)%32!==0)continue;
  const tokens=instructions(Buffer.from(witness.at(-2)??'','hex'));
  for(let index=0;index<tokens.length-2;index++){
   if(!Buffer.isBuffer(tokens[index])||tokens[index].length||tokens[index+1]!==0x63||!Buffer.isBuffer(tokens[index+2])||tokens[index+2].toString()!=='ord')continue;
   let position=index+3;const fields=new Map();
   while(Buffer.isBuffer(tokens[position])&&tokens[position].length){
    const tag=tokens[position++].toString('hex'),value=tokens[position++];
    if(!Buffer.isBuffer(value)||fields.has(tag))throw new Error('Unsupported inscription fields');fields.set(tag,value);
   }
   if(!Buffer.isBuffer(tokens[position])||tokens[position++].length)throw new Error('Missing inscription body separator');
   const chunks=[];while(Buffer.isBuffer(tokens[position]))chunks.push(tokens[position++]);
   if(tokens[position]!==0x68)throw new Error('Unsupported inscription envelope');
   if(fields.has('0b')||fields.has('09'))throw new Error('Delegated or encoded inscriptions require their own resolver');
   result.push({type:fields.get('01')?.toString(),bytes:Buffer.concat(chunks)});index=position;
  }
 }
 return result;
}
