import { buildFigure } from './src/render/buildFigure.js';
import fs from 'node:fs';
const ex = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-torusprime-Development-sepahead-github-cortexel/8f0f1472-0d6b-468c-b0b9-aac74db5af3a/scratchpad/psth0.json','utf8'));
const res: any = buildFigure(ex);
console.log('ok?', res.ok);
if(!res.ok){console.log(JSON.stringify(res.errors,null,1));process.exit(0);}
console.log('declared normalization:', ex.parameters.normalization);
console.log('y column header:', res.table.columns[res.table.columns.length-1].header);
console.log('rows (binStart,binEnd,value):');
for (const r of res.table.rows) console.log('  ', JSON.stringify(r));
