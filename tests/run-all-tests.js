import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('====================================================');
console.log('🧪 Convert2 - Cross-Platform QA Maestro Test Runner');
console.log(`OS: ${process.platform} (${process.arch}) | Node: ${process.version}`);
console.log('====================================================\n');

const testFiles = [
    path.join(__dirname, 'helpers.test.js'),
    path.join(__dirname, 'sfc-integrity.test.js'),
    path.join(__dirname, 'cross-platform-matrix.test.js')
];

run({ files: testFiles })
    .compose(spec)
    .pipe(process.stdout);
