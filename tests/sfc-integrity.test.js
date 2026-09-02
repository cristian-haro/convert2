import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('SFC & Tool Integrity Suite', () => {
    const rootDir = process.cwd();
    const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
    const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

    // Extract toolCategories from app.js
    const matchCategories = appJsContent.match(/const toolCategories = {([\s\S]*?)};/);
    assert.ok(matchCategories, 'toolCategories mapping must exist in app.js');
    
    const categoryEntries = matchCategories[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith("'") || line.startsWith('"'))
        .map(line => {
            const parts = line.replace(/['",]/g, '').split(':').map(p => p.trim());
            return { tabId: parts[0], folder: parts[1] };
        });

    test('validates that all tool files declared in app.js exist', () => {
        assert.ok(categoryEntries.length >= 20, `Expected at least 20 tools, found ${categoryEntries.length}`);
        for (const entry of categoryEntries) {
            const filePath = path.join(rootDir, 'js', entry.folder, `${entry.tabId}.js`);
            assert.ok(fs.existsSync(filePath), `Tool file must exist: js/${entry.folder}/${entry.tabId}.js`);
        }
    });

    for (const entry of categoryEntries) {
        test(`SFC contract validation for [${entry.folder}/${entry.tabId}]`, async () => {
            const filePath = path.join(rootDir, 'js', entry.folder, `${entry.tabId}.js`);
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // 1. Must export html template
            assert.match(fileContent, /export\s+const\s+html\s*=/, `[${entry.tabId}] must export const html template`);
            
            // 2. Panel ID must match panel-<tabId>
            assert.match(fileContent, new RegExp(`id=["']panel-${entry.tabId}["']`), `[${entry.tabId}] html must contain id="panel-${entry.tabId}"`);

            // 3. Tab panel class
            assert.match(fileContent, /class=["'][^"']*tab-panel[^"']*["']/, `[${entry.tabId}] must have tab-panel class`);

            // 4. Verify DOM element references in JS match elements in HTML template or index.html
            const idMatches = [...fileContent.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)];
            for (const m of idMatches) {
                const targetId = m[1];
                const existsInTemplate = fileContent.includes(`id="${targetId}"`) || fileContent.includes(`id='${targetId}'`);
                const existsInGlobal = indexHtmlContent.includes(`id="${targetId}"`) || indexHtmlContent.includes(`id='${targetId}'`);
                assert.ok(
                    existsInTemplate || existsInGlobal,
                    `[${entry.tabId}] getElementById('${targetId}') must exist in component template or index.html`
                );
            }
        });
    }

    test('validates navigation tabs in index.html match toolCategories in app.js', () => {
        for (const entry of categoryEntries) {
            assert.ok(
                indexHtmlContent.includes(`data-tab="${entry.tabId}"`),
                `index.html must include nav item for data-tab="${entry.tabId}"`
            );
        }
    });
});
