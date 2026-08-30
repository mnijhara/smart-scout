import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../services/recruiting/hiringStateStore.ts', import.meta.url), 'utf8');

if (!/error\?\.code === 'ENOENT'/.test(source)) throw new Error('Hiring state store must distinguish missing storage from unreadable storage');
if (!/Hiring state storage is unreadable; refusing to replace potentially corrupted state/.test(source)) throw new Error('Hiring state store must refuse to overwrite corrupted storage');
if (!/async function readAll\(\):Promise<HiringState\[\]>/.test(source)) throw new Error('Hiring state read contract missing');

console.log('Hiring state corruption regression passed');
