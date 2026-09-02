import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes } from '../js/helpers.js';

describe('Helper Utilities - Cross-Platform QA', () => {
    describe('formatBytes()', () => {
        test('formats 0 bytes correctly', () => {
            assert.equal(formatBytes(0), '0 Bytes');
        });

        test('formats bytes (< 1024)', () => {
            assert.equal(formatBytes(500), '500 Bytes');
            assert.equal(formatBytes(1023), '1023 Bytes');
        });

        test('formats KB properly', () => {
            assert.equal(formatBytes(1024), '1 KB');
            assert.equal(formatBytes(2048), '2 KB');
            assert.equal(formatBytes(1536), '1.5 KB');
        });

        test('formats MB and decimals', () => {
            assert.equal(formatBytes(1048576), '1 MB');
            assert.equal(formatBytes(5242880), '5 MB');
            assert.equal(formatBytes(5767168, 1), '5.5 MB');
        });

        test('formats GB for large datasets', () => {
            assert.equal(formatBytes(1073741824), '1 GB');
            assert.equal(formatBytes(2684354560, 2), '2.5 GB');
        });

        test('handles negative decimals without throwing', () => {
            assert.equal(formatBytes(1536, -1), '2 KB');
        });
    });
});
