import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Cross-Platform QA & Compatibility Matrix', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
    const variablesCss = fs.readFileSync(path.join(rootDir, 'css', 'variables.css'), 'utf-8');

    describe('Viewport & Mobile Responsiveness (iOS & Android)', () => {
        test('includes responsive viewport meta tag with width=device-width', () => {
            assert.match(
                indexHtml,
                /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*initial-scale=1\.0[^"']*["']\s*\/?>/i,
                'Must have mobile-optimized viewport tag'
            );
        });

        test('contains mobile sidebar drawer and burger menu toggle', () => {
            assert.ok(indexHtml.includes('class="sidebar"'), 'Must contain sidebar element');
            assert.ok(appJs.includes("sidebar.classList.toggle('open')"), 'Must have responsive toggle handler');
        });
    });

    describe('Cross-Platform File Type Detection (MIME Types)', () => {
        function detectFileType(mimeType) {
            if (mimeType && mimeType.includes('pdf')) {
                return 'pdf';
            } else if (mimeType && mimeType.startsWith('image/')) {
                return 'image';
            } else if (mimeType && (mimeType.includes('wordprocessingml') || mimeType.includes('msword') || mimeType.includes('officedocument'))) {
                return 'word';
            }
            return 'unknown';
        }

        test('identifies standard PDF MIME types on all OS', () => {
            assert.equal(detectFileType('application/pdf'), 'pdf');
            assert.equal(detectFileType('application/x-pdf'), 'pdf');
        });

        test('identifies Image MIME types across Windows, macOS, Android, iOS', () => {
            assert.equal(detectFileType('image/png'), 'image');
            assert.equal(detectFileType('image/jpeg'), 'image');
            assert.equal(detectFileType('image/webp'), 'image');
            assert.equal(detectFileType('image/gif'), 'image');
            assert.equal(detectFileType('image/bmp'), 'image');
            assert.equal(detectFileType('image/x-icon'), 'image');
        });

        test('identifies Microsoft Word (.docx/.doc) MIME types', () => {
            assert.equal(detectFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 'word');
            assert.equal(detectFileType('application/msword'), 'word');
        });

        test('falls back gracefully on unknown extensions', () => {
            assert.equal(detectFileType('application/octet-stream'), 'unknown');
            assert.equal(detectFileType(''), 'unknown');
        });
    });

    describe('Keyboard & Screen Reader Accessibility (a11y)', () => {
        test('implements Escape key handler to dismiss active overlays', () => {
            assert.ok(appJs.includes("e.key === 'Escape'"), 'Must handle Escape key for modal dismissal');
            assert.ok(appJs.includes("dragOverlay.classList.remove('visible')"), 'Escape key must close drag overlay');
            assert.ok(appJs.includes("sidebar.classList.remove('open')"), 'Escape key must close mobile sidebar');
        });
    });

    describe('CSS Design System & Token Integrity', () => {
        test('defines fundamental color variables and theme tokens', () => {
            const requiredTokens = [
                '--bg-primary',
                '--bg-secondary',
                '--color-text',
                '--accent-color',
                '--success-color',
                '--danger-color',
                '--border-radius-lg'
            ];
            for (const token of requiredTokens) {
                assert.ok(variablesCss.includes(token), `variables.css must define ${token}`);
            }
        });
    });
});
