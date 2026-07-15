import { buildFigure } from './src/render/buildFigure.js';
import fs from 'node:fs';
const ex = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-torusprime-Development-sepahead-github-cortexel/8f0f1472-0d6b-468c-b0b9-aac74db5af3a/scratchpad/psth_edge.json','utf8'));
const res: any = buildFigure(ex);
console.log('ok?', res.ok);
if(!res.ok){console.log(JSON.stringify(res.errors,null,1));process.exit(0);}
console.log('rows (binStart,binEnd,value):');
for (const r of res.table.rows) console.log('  ', JSON.stringify(r));
console.log('NOTE: spike at relative time 20 (== final edge). Declared finalEdgeInclusive=false => should be EXCLUDED; last bin should stay 2 events (0.5/trial).');
