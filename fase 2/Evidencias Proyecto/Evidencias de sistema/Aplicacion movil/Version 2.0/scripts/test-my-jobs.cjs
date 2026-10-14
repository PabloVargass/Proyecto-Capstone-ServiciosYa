// Ejecuta los callbacks reales de la pantalla sin requerir un emulador.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function callback(file, name, context) {
  const filename = path.join(__dirname, '../src/app', file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(initializer, `No se encontró ${name}`);
  const code = ts.transpileModule(`(${initializer.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(code, context);
}

function screen(status = 200, token = 'jwt-de-login') {
  const calls = [];
  const redirects = [];
  const alerts = [];
  const keys = [];
  const data = { publicados: [], postulados: [], asignados: [], completados: [], resumen: {} };
  const context = {
    API_URL: 'http://backend-configurado:3000',
    t: text => text,
    locale: 'es-CL',
    SecureStore: { getItemAsync: async key => { keys.push(key); return key === 'accessToken' ? token : null; } },
    router: { replace: route => redirects.push(route) },
    Alert: { alert: (...args) => alerts.push(args) },
    useCallback: fn => fn,
    setLoading: () => {}, setRefreshing: () => {}, setActionLoading: () => {},
    setData: value => { context.loaded = value; },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: status === 200, status, json: async () => status === 200 ? data : { message: 'Token inválido o expirado.' } };
    },
  };
  context.loadJobs = callback('my-jobs.tsx', 'loadJobs', context);
  return { context, calls, redirects, alerts, keys, data };
}

test('Mis trabajos usa la sesión del login y envía Bearer a la API configurada', async () => {
  const s = screen();
  const stored = new Map();
  s.context.SecureStore.setItemAsync = async (key, value) => stored.set(key, value);
  s.context.SecureStore.getItemAsync = async key => { s.keys.push(key); return stored.get(key) ?? null; };
  s.context.setWelcomeName = () => {};
  s.context.setWelcomeVisible = () => {};
  await callback('login.tsx', 'guardarSesion', s.context)('jwt-de-login', { id: 'usuario-1', name: 'Usuario' });
  await s.context.loadJobs();
  assert.deepEqual(s.keys, ['accessToken']);
  assert.equal(s.calls[0].url, 'http://backend-configurado:3000/jobs/mis-trabajos');
  assert.equal(s.calls[0].options.headers.Authorization, 'Bearer jwt-de-login');
  assert.equal(s.context.loaded, s.data);
  assert.deepEqual(s.redirects, []);
});

for (const [name, route] of [['iniciarTrabajo', 'iniciar'], ['completarTrabajo', 'completar']]) {
  test(`${name} reutiliza el JWT y recarga Mis trabajos`, async () => {
    const s = screen();
    await callback('my-jobs.tsx', name, s.context)('job-1');
    assert.equal(s.calls[0].url, `http://backend-configurado:3000/jobs/job-1/${route}`);
    assert.equal(s.calls[0].options.method, 'PATCH');
    assert.equal(s.calls[0].options.headers.Authorization, 'Bearer jwt-de-login');
    assert.equal(s.calls[1].url, 'http://backend-configurado:3000/jobs/mis-trabajos');
    assert.deepEqual(s.keys, ['accessToken', 'accessToken']);
    assert.deepEqual(s.redirects, []);
  });
}

test('Sin sesión se solicita login sin enviar una petición', async () => {
  const s = screen(200, null);
  await s.context.loadJobs();
  assert.deepEqual(s.redirects, ['/login']);
  assert.equal(s.calls.length, 0);
});

for (const status of [401, 500]) {
  test(`HTTP ${status} muestra un error sin borrar la sesión ni redirigir`, async () => {
    const s = screen(status);
    await s.context.loadJobs();
    assert.equal(s.context.loaded, undefined);
    assert.equal(s.alerts[0][0], 'Error');
    assert.deepEqual(s.redirects, []);
    assert.equal(await s.context.SecureStore.getItemAsync('accessToken'), 'jwt-de-login');
  });
}

test('Un error de red muestra un error y conserva la sesión', async () => {
  const s = screen();
  s.context.fetch = async () => { throw new Error('Sin conexión'); };
  await s.context.loadJobs();
  assert.equal(s.alerts[0][0], 'Error');
  assert.deepEqual(s.redirects, []);
});
