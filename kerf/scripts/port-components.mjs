// One-time source migration. Symbols, rather than names, preserve shadowed event/list variables.
import ts from '../node_modules/@kerf-js/cli/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const original = path.resolve('../src');
const target = path.resolve('src');
const all = (dir) => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? all(path.join(dir,e.name)) : [path.join(dir,e.name)]);
for (const dir of ['lib','server','content','styles']) fs.cpSync(path.join(original,dir),path.join(target,dir),{recursive:true});
const files = all(path.join(original,'app')).filter(f => /\.(tsx?|css)$/.test(f) && !f.includes('/api/') && !f.includes('/(site)/'));
const program = ts.createProgram(files.filter(f => /\.tsx?$/.test(f)), {allowJs:true,jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ESNext});
const checker = program.getTypeChecker();
const f = ts.factory;
const printer = ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
for (const file of files) {
  const relative = path.relative(path.join(original,'app'),file);
  if (/^(layout|error|sitemap|robots|not-found)\./.test(relative) || relative.endsWith('/page.tsx') || relative.endsWith('/loading.tsx') || relative.endsWith('/login-action.ts')) continue;
  const out = path.join(target,relative.startsWith('admin/') ? relative : relative.replace(/^components\//,'components/'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  if (file.endsWith('.css')) { fs.copyFileSync(file,out); continue; }
  const sf = program.getSourceFile(file);
  const boxes = new Map(), setters = new Map(), refSymbols = new Set(), derivedSymbols = new Map(), propSymbols = new Set();
  const sym = n => checker.getSymbolAtLocation(n);
  const visitAll = (n,fn) => { fn(n); ts.forEachChild(n,c => visitAll(c,fn)); };
  visitAll(sf,n => {
    if(ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer?.getText(sf)==='lifecycle') for(const e of n.name.elements) if(ts.isIdentifier(e.name) && ['requested','wanted'].includes(e.name.text)) boxes.set(sym(e.name),e.name.text);
    if(ts.isFunctionDeclaration(n) && n.name && /^[A-Z]|^use/.test(n.name.text)) for(const param of n.parameters) visitAll(param.name,c=>{if(ts.isIdentifier(c)) propSymbols.add(sym(c));});
    if (!ts.isVariableDeclaration(n) || !n.initializer || !ts.isCallExpression(n.initializer)) return;
    const call = n.initializer;
    if (ts.isIdentifier(call.expression) && call.expression.text === 'useState' && ts.isArrayBindingPattern(n.name)) {
      const [value,set] = n.name.elements;
      if (value && ts.isIdentifier(value.name)) {
        boxes.set(sym(value.name),value.name.text);
        if (set && ts.isIdentifier(set.name)) setters.set(sym(set.name),value.name.text);
      }
    }
    if (ts.isIdentifier(n.name) && ts.isIdentifier(call.expression) && call.expression.text === 'useRef') refSymbols.add(sym(n.name));
    if (ts.isIdentifier(n.name) && ts.isIdentifier(call.expression) && ['useMediaPreference','useSaveData'].includes(call.expression.text)) boxes.set(sym(n.name),n.name.text);
  });
  // Render-time calculations become live derivations. Event-local calculations remain plain values.
  let changed = true;
  while (changed) {
    changed = false;
    visitAll(sf,n => {
      if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || boxes.has(sym(n.name)) || derivedSymbols.has(sym(n.name)) || refSymbols.has(sym(n.name))) return;
      if (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer) || ts.isJsxElement(n.initializer) || ts.isJsxSelfClosingElement(n.initializer)) return;
      if (ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && /^use/.test(n.initializer.expression.text)) return;
      let parent = n.parent, body;
      while(parent && !ts.isFunctionLike(parent)) parent=parent.parent;
      if (!parent || !ts.isFunctionDeclaration(parent) || !parent.name || !/^[A-Z]|^use/.test(parent.name.text)) return;
      let depends = false;
      visitAll(n.initializer,c => { if(ts.isIdentifier(c) && (boxes.has(sym(c)) || derivedSymbols.has(sym(c)) || propSymbols.has(sym(c)))) depends=true; });
      if (depends) { derivedSymbols.set(sym(n.name),n.name.text); changed=true; }
    });
  }
  const result = ts.transform(sf,[context => {
    const v = n => {
      if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === 'react') return undefined;
      if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === 'react-dom') return undefined;
      if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === 'next/link') return f.createImportDeclaration(undefined,f.createImportClause(false,undefined,f.createNamedImports([f.createImportSpecifier(false,f.createIdentifier('Link'),f.createIdentifier(n.importClause.name.text))])),f.createStringLiteral('@kerf-js/start'));
      if (ts.isExpressionStatement(n) && ts.isStringLiteral(n.expression) && n.expression.text === 'use client') return undefined;
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer)) {
        const call=n.initializer, name=ts.isIdentifier(call.expression) ? call.expression.text : '';
        if(name==='useState' && ts.isArrayBindingPattern(n.name)) {
          const value=n.name.elements[0].name;
          let init=call.arguments[0] ?? f.createIdentifier('undefined');
          if(ts.isArrowFunction(init) || ts.isFunctionExpression(init)) init=f.createCallExpression(f.createParenthesizedExpression(init),undefined,[]);
          return f.createVariableDeclaration(value,undefined,undefined,f.createCallExpression(f.createIdentifier('cell'),call.typeArguments,[ts.visitNode(init,v)]));
        }
        if(name==='useRef') return f.updateVariableDeclaration(n,n.name,n.exclamationToken,undefined,f.createObjectLiteralExpression([f.createPropertyAssignment('current',call.typeArguments?.[0] ? f.createAsExpression(call.arguments[0] ?? f.createIdentifier('undefined'), f.createUnionTypeNode([call.typeArguments[0],f.createLiteralTypeNode(f.createNull()),f.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)])) : call.arguments[0] ?? f.createIdentifier('undefined'))]));
      }
      if(ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && derivedSymbols.has(sym(n.name))) return f.updateVariableDeclaration(n,n.name,n.exclamationToken,undefined,f.createCallExpression(f.createIdentifier('derived'),undefined,[f.createArrowFunction(undefined,undefined,[],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),ts.visitNode(n.initializer,v))]));
      if(ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        if(setters.has(sym(n.expression))) return f.createCallExpression(f.createIdentifier('update'),undefined,[f.createIdentifier(setters.get(sym(n.expression))), ...n.arguments.map(a=>ts.visitNode(a,v))]);
        if(n.expression.text==='useCallback' || n.expression.text==='useEffectEvent') return ts.visitNode(n.arguments[0],v);
        if(n.expression.text==='useEffect') {
          const action=ts.visitNode(n.arguments[0],v), deps=ts.visitNode(n.arguments[1] ?? f.createArrayLiteralExpression(),v);
          return f.createCallExpression(f.createIdentifier('onMount'),undefined,[f.createArrowFunction(undefined,undefined,[],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),f.createCallExpression(f.createIdentifier('watch'),undefined,[f.createArrowFunction(undefined,undefined,[],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),deps),action]))]);
        }
        if(n.expression.text==='useId') return f.createStringLiteral('contact-form');
      }
      if(ts.isJsxAttribute(n) && n.name.text==='ref' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && ts.isIdentifier(n.initializer.expression) && refSymbols.has(sym(n.initializer.expression))) {
        const id=n.initializer.expression;
        return f.createJsxAttribute(n.name,f.createJsxExpression(undefined,f.createArrowFunction(undefined,undefined,[f.createParameterDeclaration(undefined,undefined,'node')],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),f.createBlock([f.createExpressionStatement(f.createAssignment(f.createPropertyAccessExpression(id,'current'),f.createIdentifier('node')))],true))));
      }
      if(ts.isShorthandPropertyAssignment(n) && (boxes.has(sym(n.name)) || derivedSymbols.has(sym(n.name)))) return f.createPropertyAssignment(n.name,f.createPropertyAccessExpression(f.createIdentifier(n.name.text),'value'));
      if(ts.isIdentifier(n)) {
        const s=sym(n);
        if(boxes.has(s)||derivedSymbols.has(s)) {
          const p=n.parent;
          if((ts.isVariableDeclaration(p)&&p.name===n) || ts.isBindingElement(p) || (ts.isPropertyAccessExpression(p)&&p.name===n) || (ts.isPropertyAssignment(p)&&p.name===n) || ts.isTypeReferenceNode(p)) return n;
          return f.createPropertyAccessExpression(f.createIdentifier(n.text),'value');
        }
        if(setters.has(s)) return f.createArrowFunction(undefined,undefined,[f.createParameterDeclaration(undefined,undefined,'next')],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),f.createCallExpression(f.createIdentifier('update'),undefined,[f.createIdentifier(setters.get(s)),f.createIdentifier('next')]));
      }
      return ts.visitEachChild(n,v,context);
    };
    return root=>ts.visitNode(root,v);
  }]);
  let text=printer.printFile(result.transformed[0]);
  text=text.replace(/React\.ReactNode|\bReactNode\b/g,'unknown').replace(/React\.CSSProperties|\bCSSProperties\b/g,'Record<string, string | number | undefined>');
  text=text.replace(/\bupdate\((?=(?:[A-Za-z]+),)/g,'writeBox(');
  text=text.replace(/\b(?:React\.)?FormEvent<([^>]+)>/g,'Event & { currentTarget: $1 }').replace(/\b(?:React\.)?KeyboardEvent<([^>]+)>/g,'KeyboardEvent & { currentTarget: $1 }');
  fs.writeFileSync(out,'import { state as cell, derived, onMount, watch, onCleanup } from "@kerf-js/core";\nimport { update as writeBox } from "#/lib/reactive";\n'+text);
  result.dispose();
}
fs.symlinkSync('../public',path.resolve('public'),'dir');
