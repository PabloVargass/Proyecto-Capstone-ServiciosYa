const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/app/(tabs)/publish.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handlePublish') handler = node.initializer; ts.forEachChild(node, visit); }
visit(source);
assert.ok(handler);
const code = ts.transpileModule(`(${handler.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function screen(overrides = {}) {
  const sent = [], alerts = [], redirects = [], resets = [];
  const context = { loading: false, identity: { canPublish: true }, hours: '24', durationMinutes: () => 1440, title: 'Limpieza de prueba', description: 'Publicación ficticia para comprobar el formulario.', category: 'Limpieza', selectedRegion: { communes: [{ name: 'Maipú' }] }, commune: 'Maipú', budget: '25000', kind: 'SERVICIO', t: value => value, router: { push: path => redirects.push(path) }, Alert: { alert: (...args) => alerts.push(args) }, SecureStore: { getItemAsync: async () => 'token-ficticio' }, API_URL: 'http://api-ficticia', fetch: async (_, options) => { sent.push(JSON.parse(options.body)); return { ok: true, json: async () => ({}) }; }, setLoading: () => {}, setTitle: () => {}, setDescription: () => {}, setCategory: () => {}, setCommune: value => resets.push(['commune', value]), setRegionId: value => resets.push(['region', value]), setBudget: () => {}, console, ...overrides };
  return { run: vm.runInNewContext(code, context), sent, alerts, redirects, resets };
}
test('no envía una publicación sin región', async () => { const item = screen({ selectedRegion: undefined }); await item.run(); assert.equal(item.sent.length, 0); assert.equal(item.alerts[0][0], 'Campos incompletos'); });
test('rechaza una comuna ajena a la región elegida', async () => { const item = screen({ commune: 'Valparaíso' }); await item.run(); assert.equal(item.sent.length, 0); assert.equal(item.alerts[0][0], 'Comuna inválida'); });
test('envía nombres de categoría y comuna, y limpia ambas selecciones después del éxito', async () => { const item = screen(); await item.run(); assert.equal(item.sent[0].category, 'Limpieza'); assert.equal(item.sent[0].commune, 'Maipú'); assert.equal(item.sent[0].kind, 'SERVICIO'); assert.deepEqual(item.resets, [['commune', ''], ['region', '']]); });
test('la selección de ubicación no evita el requisito de identidad', async () => { const item = screen({ identity: { canPublish: false } }); await item.run(); assert.equal(item.sent.length, 0); assert.deepEqual(item.redirects, ['/identity']); });
