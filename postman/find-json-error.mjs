import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionPath = path.join(__dirname, 'HyreLog.postman_collection.json');

const content = fs.readFileSync(collectionPath, 'utf8');
const lines = content.split('\n');

try {
    JSON.parse(content);
    console.log('✅ JSON is valid!');
} catch (error) {
    console.error('❌ JSON Error:', error.message);

    // Extract line number from error
    const match = error.message.match(/line (\d+)/);
    if (match) {
        const lineNum = parseInt(match[1]);
        console.log(`\n📍 Error at line ${lineNum}:`);
        console.log('─'.repeat(60));

        // Show context around the error
        const start = Math.max(0, lineNum - 5);
        const end = Math.min(lines.length, lineNum + 5);

        for (let i = start; i < end; i++) {
            const marker = i === lineNum - 1 ? '>>>' : '   ';
            console.log(`${marker} ${i + 1}: ${lines[i]}`);
        }

        console.log('─'.repeat(60));

        // Check for common issues
        const problemLine = lines[lineNum - 1];
        if (problemLine.includes('{') && !problemLine.includes('"')) {
            console.log(
                '\n💡 Possible issue: Missing property name or comma before opening brace'
            );
        }
        if (problemLine.trim().startsWith('{') && lineNum > 1) {
            const prevLine = lines[lineNum - 2];
            if (
                !prevLine.trim().endsWith(',') &&
                !prevLine.trim().endsWith('[') &&
                !prevLine.trim().endsWith('{')
            ) {
                console.log(
                    '💡 Possible issue: Missing comma before this object'
                );
            }
        }
    }

    // Also check position if available
    const posMatch = error.message.match(/position (\d+)/);
    if (posMatch) {
        const pos = parseInt(posMatch[1]);
        console.log(`\n📍 Error at character position ${pos}:`);
        const start = Math.max(0, pos - 30);
        const end = Math.min(content.length, pos + 30);
        console.log('Context:', JSON.stringify(content.substring(start, end)));
        console.log('Character:', JSON.stringify(content[pos]));
    }
}
