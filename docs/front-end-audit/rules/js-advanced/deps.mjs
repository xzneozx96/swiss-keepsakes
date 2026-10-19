import { createRequire } from "node:module"; import fs from "node:fs"; import path from "node:path";
const root="/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end";
const ts=createRequire(root+"/package.json")("typescript");
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.tsx?$/.test(e.name))files.push(p)}})(root+"/src");
const names=new Map(); let n=0, noDeps=0;
for(const f of files){const sf=ts.createSourceFile(f,fs.readFileSync(f,"utf8"),99,true,f.endsWith("x")?4:3);
(function v(x){ if(ts.isCallExpression(x)&&ts.isIdentifier(x.expression)&&/^use(Layout)?Effect$/.test(x.expression.text)){ n++; if(!x.arguments[1]) noDeps++; else if(ts.isArrayLiteralExpression(x.arguments[1])) for(const e of x.arguments[1].elements){const t=e.getText(sf); if(!names.has(t))names.set(t,[]); names.get(t).push(path.relative(root,f)+":"+(sf.getLineAndCharacterOfPosition(x.getStart(sf)).line+1));}}
ts.forEachChild(x,v)})(sf)}
console.log("effects",n,"no-deps",noDeps);
for(const [k,v] of [...names].sort()) console.log(k.padEnd(40), v.length, v[0]);
