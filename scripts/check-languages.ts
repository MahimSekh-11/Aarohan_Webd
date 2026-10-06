import fs from 'node:fs';
import ts from 'typescript';
import { t, LANGUAGE_NAMES } from '../src/i18n/translations';
const keys = new Set<string>();
const files = ['shared/voiceCommands.ts','backend/agent/tools.ts','backend/agent/providers.ts','backend/agent/router.ts', ...['src/pages','src/components'].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => `${dir}/${f}`))];
for (const file of files) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node: ts.Node) {
    if (ts.isNewExpression(node) && node.expression.getText(ast)==='Error' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]))keys.add(node.arguments[0].text);
    if (ts.isCallExpression(node) && ['t','respond','setReply'].includes(node.expression.getText(ast)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) keys.add(node.arguments[0].text);
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'message' && ts.isStringLiteral(node.initializer)) keys.add(node.initializer.text);
    ts.forEachChild(node,visit);
  }
  visit(ast);
}
const identities = ['A','T','TIORKHALI','MART','TIORKHALI MART','Mahim Ali Sekh','&times;','Invalid assistant response'];
const languages = Object.keys(LANGUAGE_NAMES).filter(lang => lang !== 'en') as (keyof typeof LANGUAGE_NAMES)[];
const missing = [...keys].filter(key => !identities.includes(key) && languages.some(lang => t(key,lang) === key));
console.log(JSON.stringify(missing, null, 2));
if (missing.length) process.exitCode = 1;
