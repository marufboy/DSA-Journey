import test from 'node:test';
import assert from 'node:assert/strict';
import {stdinLines} from '../dist/runtime-contract.js';
test('stdin has EOF rather than a fabricated extra blank line',()=>{assert.deepEqual(stdinLines(''),[]);assert.deepEqual(stdinLines('one\n'),['one']);assert.deepEqual(stdinLines('\n'),['']);assert.deepEqual(stdinLines('one\n\n'),['one','']);assert.deepEqual(stdinLines('a\r\nb\r\n'),['a','b']);});
