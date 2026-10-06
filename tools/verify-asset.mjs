/**
 * Checks that client.js embeds the current pet-line.png bytes.
 * Run after build.mjs when the artwork changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
const marker = 'const PET = "data:image/png;base64,';
const start = source.indexOf(marker);
if (start === -1) throw new Error('client.js has no embedded artwork');

const from = start + marker.length;
const to = source.indexOf('"', from);
const embedded = Buffer.from(source.slice(from, to), 'base64');
const live = fs.readFileSync(path.join(root, 'pet-line.png'));

console.log('client.js bytes       ', source.length);
console.log('embedded mask bytes   ', embedded.length);
console.log('pet-line.png bytes    ', live.length);
console.log('png signature         ', embedded.subarray(1, 4).toString('ascii'));
console.log('matches pet-line.png  ', embedded.equals(live));
if (!embedded.equals(live)) throw new Error('client.js embeds stale artwork: re-run node build.mjs');
