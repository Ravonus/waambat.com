import ts from '../node_modules/@kerf-js/cli/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const f=ts.factory,printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
for(const file of files('src/components').filter(f=>/\.tsx?$/.test(f))){
 const original=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);let changed=false;
 const result=ts.transform(sf,[ctx=>{
  const visit=n=>{
   if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='onMount'&&n.arguments[0]&&ts.isArrowFunction(n.arguments[0])&&ts.isBlock(n.arguments[0].body)){
    const action=n.arguments[0],last=action.body.statements.at(-1);
    if(last&&ts.isReturnStatement(last)&&last.expression&&(ts.isArrowFunction(last.expression)||ts.isFunctionExpression(last.expression))){
     changed=true;const body=f.updateBlock(action.body,[...action.body.statements.slice(0,-1),f.createExpressionStatement(f.createCallExpression(f.createIdentifier('onCleanup'),undefined,[last.expression]))]);
     return f.updateCallExpression(n,n.expression,n.typeArguments,[f.updateArrowFunction(action,action.modifiers,action.typeParameters,action.parameters,action.type,action.equalsGreaterThanToken,body)]);
    }
   }return ts.visitEachChild(n,visit,ctx);
  };return root=>ts.visitNode(root,visit);
 }]);
 if(changed){let text=printer.printFile(result.transformed[0]);if(!/import[^;]*\bonCleanup\b[^;]*from\s*['"]@kerf-js\/core/.test(original))text='import {onCleanup} from "@kerf-js/core";\n'+text;fs.writeFileSync(file,text);}result.dispose();
}
