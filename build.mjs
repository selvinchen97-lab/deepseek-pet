/**
 * Builds client.js from ui-template.mjs with the pet line mask inlined.
 *
 * Run after editing the template or replacing pet-line.png:
 *   node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { UI_TEMPLATE } from './ui-template.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const petBytes = fs.readFileSync(path.join(root, 'pet-line.png'));
const marker = '__PET_DATA_URI__';
if (!UI_TEMPLATE.includes(marker)) throw new Error('ui-template.mjs lost its ' + marker + ' placeholder');

const dataUri = `data:image/png;base64,${petBytes.toString('base64')}`;
const client = UI_TEMPLATE.replace(marker, JSON.stringify(dataUri));

fs.writeFileSync(path.join(root, 'client.js'), client);
console.log('wrote client.js', Buffer.byteLength(client), 'bytes from pet-line.png', petBytes.length, 'bytes');
