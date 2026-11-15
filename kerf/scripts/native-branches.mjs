// Finish the one-time port: conditional returns must live in JSX because Kerf setup runs once.
import ts from '../node_modules/@kerf-js/cli/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const f=ts.factory,printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const file of files('src/components').filter(f=>f.endsWith('.tsx'))){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const result=ts.transform(sf,[ctx=>{
  const visit=n=>{
   if(ts.isFunctionDeclaration(n)&&n.name&&/^[A-Z]/.test(n.name.text)&&n.body){
    const guards=[];let last;
    for(const s of n.body.statements){if(ts.isIfStatement(s)&&!s.elseStatement&&ts.isReturnStatement(s.thenStatement)&&s.thenStatement.expression)guards.push(s);if(ts.isReturnStatement(s))last=s;}
    if(last?.expression&&(guards.length||ts.isConditionalExpression(last.expression))){
     let expr=last.expression;
     for(const g of guards.reverse())expr=f.createConditionalExpression(g.expression,f.createToken(ts.SyntaxKind.QuestionToken),g.thenStatement.expression,f.createToken(ts.SyntaxKind.ColonToken),expr);
     const fragment=f.createJsxFragment(f.createJsxOpeningFragment(),[f.createJsxExpression(undefined,expr)],f.createJsxJsxClosingFragment());
     const statements=n.body.statements.filter(s=>s!==last&&!guards.includes(s));statements.push(f.createReturnStatement(fragment));
     return f.updateFunctionDeclaration(n,n.modifiers,n.asteriskToken,n.name,n.typeParameters,n.parameters,n.type,f.createBlock(statements,true));
    }
   }
   return ts.visitEachChild(n,visit,ctx);
  };return root=>ts.visitNode(root,visit);
 }]);fs.writeFileSync(file,printer.printFile(result.transformed[0]));result.dispose();
}
