import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/hiringStateStore.ts', import.meta.url), 'utf8');

if (!/const MAX_HIRING_STATE_LIST_ROWS = 2000/.test(source)) throw new Error('Hiring state list row bound missing');
if (!/\.limit\(MAX_HIRING_STATE_LIST_ROWS\)/.test(source)) throw new Error('Database hiring state reads must enforce a bounded result set');
if (!/\.slice\(0,MAX_HIRING_STATE_LIST_ROWS\)/.test(source)) throw new Error('Local hiring state reads must enforce a bounded result set');

console.log('Hiring state read bounds regression passed');
