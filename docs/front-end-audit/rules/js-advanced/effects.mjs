import { createRequire } from "node:module"; import fs from "node:fs"; import path from "node:path";
const root="/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end";
const ts=createRequire(root+"/package.json")("typescript");
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.tsx?$/.test(e.name))files.push(p)}})(root+"/src");
let n=0;
for(const f of files){const sf=ts.createSourceFile(f,fs.readFileSync(f,"utf8"),99,true,f.endsWith("x")?4:3);
(function v(x){ if(ts.isCallExpression(x)&&ts.isIdentifier(x.expression)&&/^use(Layout)?Effect$/.test(x.expression.text)&&x.arguments[1]&&ts.isArrayLiteralExpression(x.arguments[1])&&x.arguments[1].elements.length===0){n++;const t=x.arguments[0].getText(sf).replace(/\s+/g," ");const line=sf.getLineAndCharacterOfPosition(x.getStart(sf)).line+1;console.log(path.relative(root,f)+":"+line+"\t"+t.slice(0,120));}
ts.forEachChild(x,v)})(sf)}
console.log("total",n);
