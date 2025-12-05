#!/usr/bin/env node
/**
 * Fixes Postman collection format issues
 *
 * Issues fixed:
 * 1. Removes {{base_url}} from host fields (variables should only be in 'raw')
 * 2. Ensures schema version is v2.0.0 for compatibility
 * 3. Adds empty response arrays if missing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we're using CommonJS require for this script
// Since package.json has "type": "module", we need to use .mjs extension or ES modules

const collectionPath = path.join(__dirname, 'HyreLog.postman_collection.json');

console.log('Reading Postman collection...');
const content = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(content);

// Fix schema version
if (data.info.schema.includes('v2.1.0')) {
    data.info.schema =
        'https://schema.getpostman.com/json/collection/v2.0.0/collection.json';
    console.log('✓ Updated schema to v2.0.0');
}

let fixedCount = 0;

function fixItem(item) {
    if (item.request && item.request.url) {
        const url = item.request.url;

        // Fix host field - remove {{base_url}} variable
        if (Array.isArray(url.host)) {
            const originalLength = url.host.length;
            url.host = url.host.filter((h) => h !== '{{base_url}}');
            if (originalLength !== url.host.length) {
                fixedCount++;
            }
        }

        // Ensure response array exists
        if (!item.request.response) {
            item.request.response = [];
        }
    }

    // Recursively fix nested items
    if (item.item && Array.isArray(item.item)) {
        item.item.forEach(fixItem);
    }
}

// Fix all items
data.item.forEach(fixItem);

// Write back
fs.writeFileSync(collectionPath, JSON.stringify(data, null, '\t'), 'utf8');

console.log(`✓ Fixed ${fixedCount} URL host fields`);
console.log(`✓ Collection: ${data.info.name}`);
console.log(`✓ Schema: ${data.info.schema}`);
console.log(
    '\n✅ Postman collection fixed! You can now import it into Postman.'
);
