import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionPath = path.join(__dirname, 'HyreLog.postman_collection.json');

try {
    console.log('Validating Postman collection...\n');

    const content = fs.readFileSync(collectionPath, 'utf8');
    const data = JSON.parse(content);

    console.log('✓ Valid JSON');
    console.log(`✓ Schema: ${data.info.schema}`);
    console.log(`✓ Collection: ${data.info.name}`);
    console.log(`✓ Folders: ${data.item.length}`);

    // Check all host fields
    const hosts = [];
    function checkItem(item) {
        if (item.request?.url?.host) {
            hosts.push(...item.request.url.host);
        }
        if (item.item && Array.isArray(item.item)) {
            item.item.forEach(checkItem);
        }
    }
    data.item.forEach(checkItem);

    const badHosts = hosts.filter((h) => h === '{{base_url}}');

    console.log(`✓ Total host entries: ${hosts.length}`);

    if (badHosts.length > 0) {
        console.log(
            `❌ Found ${badHosts.length} host fields with {{base_url}}`
        );
        console.log('\nRunning fix...');

        // Fix the issues
        function fixItem(item) {
            if (item.request?.url?.host) {
                item.request.url.host = item.request.url.host.filter(
                    (h) => h !== '{{base_url}}'
                );
            }
            if (item.item && Array.isArray(item.item)) {
                item.item.forEach(fixItem);
            }
        }
        data.item.forEach(fixItem);

        fs.writeFileSync(
            collectionPath,
            JSON.stringify(data, null, '\t'),
            'utf8'
        );
        console.log('✓ Fixed and saved');
    } else {
        console.log('✓ No issues found');
    }

    console.log('\n✅ Collection is ready to import into Postman!');
} catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('JSON')) {
        const lines = content.split('\n');
        const match = error.message.match(/line (\d+)/);
        if (match) {
            const lineNum = parseInt(match[1]);
            console.error(`\nProblem at line ${lineNum}:`);
            for (
                let i = Math.max(0, lineNum - 3);
                i < Math.min(lines.length, lineNum + 2);
                i++
            ) {
                console.error(`${i + 1}: ${lines[i]}`);
            }
        }
    }
    process.exit(1);
}
