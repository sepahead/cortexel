import { buildFigure } from './src/render/buildFigure.js';
import fs from 'node:fs';

const ex = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-torusprime-Development-sepahead-github-cortexel/8f0f1472-0d6b-468c-b0b9-aac74db5af3a/scratchpad/wm_ex2.json','utf8'));
const res: any = buildFigure(ex);
console.log('ok?', res.ok);
if (!res.ok) { console.log('errors', JSON.stringify(res.errors, null, 1)); process.exit(0); }
console.log('TABLE (target, source, value):');
for (const row of res.table.rows) console.log('  ', JSON.stringify(row));
