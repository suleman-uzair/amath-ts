import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialize, parseTree, NotInitializedError, EngineUnavailable, Model, modelJson } from '../dist/index.js';

assert.throws(() => parseTree('x'), NotInitializedError);
const parser = await initialize();
const read = async name => JSON.parse(await readFile(new URL(`fixtures/${name}.json`, import.meta.url), 'utf8'));
function plain(value) {
  if (Array.isArray(value)) return value.map(plain);
  if (!value || typeof value !== 'object') return value;
  if (Object.hasOwn(value, 'text') && Object.hasOwn(value, 'offset')) return value.text;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
}
function canonical(value, input) {
  if (value === null) return { nil: true };
  if (typeof value === 'string') return { str: value };
  if (Array.isArray(value)) return { array: value.map(v => canonical(v, input)) };
  if (Object.hasOwn(value, 'text') && Object.hasOwn(value, 'offset')) {
    const prefix = new TextDecoder().decode(new TextEncoder().encode(input).subarray(0, value.offset));
    return { slice: value.text, byte_offset: value.offset, char_offset: [...prefix].length };
  }
  return { hash: Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [{ sym: k }, canonical(v, input)]) };
}
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== 'object') return value;
  if (value.hash) return { hash: value.hash.map(([k, v]) => [k, sorted(v)]).sort(([a], [b]) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sorted(v)]));
}
const legacy = await read('legacy');
assert.equal(legacy.cases.length, 160, 'fixed expected legacy case count');
for (const row of legacy.cases) test(`legacy capture tree: ${row.id}`, () => assert.deepEqual(plain(parser.parseTree(row.input)), row.tree));
const raw = await read('asciimath');
assert.equal(raw.cases.length, 10, 'fixed expected offset-aware raw case count');
for (const row of raw.cases) test(`offset-aware tree: ${row.id}`, () => {
  const input = row.input.str;
  if (row.expected.refusal) {
    assert.throws(() => parser.parseTree(input, row.options), error => error.name === 'ParseError' && error.byteOffset === row.expected.refusal.byte_offset);
  } else assert.deepEqual(sorted(canonical(parser.parseTree(input, row.options), input)), sorted(row.expected.tree));
});
function modelTree(value) {
  if (Array.isArray(value)) return { array: value.map(modelTree) };
  if (typeof value === 'string') return { str: value };
  if (value === null) return { nil: true };
  const id = value.constructor.modelId;
  assert.equal(typeof id, 'string', 'every model is generated from LML');
  return { node: id.split('@')[0], fields: value.constructor.memberNames.filter(k => value[k] !== Model.ABSENT && value[k] !== null).map(k => [k, modelTree(value[k])]) };
}
const typed = await read('typed');
assert.equal(typed.cases.length, 10, 'fixed expected typed-model case count');
for (const row of typed.cases) test(`typed model: ${row.id}`, () => assert.deepEqual(modelTree(parser.parse(row.input.str, row.options)), row.expected.tree));
test('decimal markers retain source text', () => {
  for (const [decimal, input] of [['.', '1.5'], [',', '1,5'], ['٫', '1٫5']]) {
    assert.equal(parser.parse(input, { decimal }).decimal, decimal);
    assert.ok(JSON.stringify(plain(parser.parseTree(input, { decimal }))).includes(input));
  }
});
test('typed models and JSON codecs come from the upstream generator', () => {
  const model = parser.parse('alpha');
  assert.ok(model instanceof Model.AmathModelDocument);
  const symbol = model.expression.expr.amath_chain[0].amath_step.sequence.symbol;
  assert.equal(symbol.value, 'α');
  assert.equal(symbol.kind, 'symbol');
  const codec = modelJson.CODECS['Amath::Model::Document@default'];
  assert.deepEqual(codec.decode(codec.encode(model)), model);
});
test('unsupported engines and dialects fail explicitly', () => {
  assert.throws(() => parser.parseTree('x', { engine: 'ruby' }), EngineUnavailable);
  assert.throws(() => parser.parseTree('x', { dialect: 'pma' }), EngineUnavailable);
  assert.throws(() => parser.parseTree('x', { decimal: ';' }), RangeError);
  assert.throws(() => parser.parseTree('\ud800'), TypeError);
});
