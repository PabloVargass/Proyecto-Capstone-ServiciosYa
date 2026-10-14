const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.join(__dirname, '../src', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  } });
  return exports;
}

const themes = load('constants/app-theme.ts');
const translations = load('constants/translations.ts');

// Ejecutar el proveedor real con almacenamiento y ciclo de hooks controlados.
function provider(saved = null, platform = 'android') {
  let cursor = 0;
  const slots = [];
  const effects = [];
  const storage = new Map([['accessToken', 'sesion-existente'], ['user', 'usuario-existente']]);
  if (saved !== null) storage.set('serviciosya.preferences', saved);
  const writes = [];
  let fail = false;
  const mockReact = {
    createContext: () => ({ Provider: 'Preferences' }),
    useContext: () => {},
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useRef: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = value; }];
    },
    useEffect: fn => {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = true; effects.push(fn); }
    },
  };
  const secureStore = {
    getItemAsync: async key => storage.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (fail) throw new Error('Storage unavailable');
      writes.push(key);
      storage.set(key, value);
    },
  };
  const code = fs.readFileSync(path.join(__dirname, '../src/context/app-preferences.tsx'), 'utf8');
  const output = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const mocks = {
    react: mockReact,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { Platform: { OS: platform }, StyleSheet: { create: styles => styles } },
    'expo-secure-store': secureStore,
    '@/constants/app-theme': themes,
    '@/constants/translations': translations,
  };
  vm.runInNewContext(output, {
    exports,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (fail) throw new Error('Storage unavailable');
        writes.push(key); storage.set(key, value);
      },
    },
    require: name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; },
  });
  function render() {
    cursor = 0;
    return exports.AppPreferencesProvider({ children: null }).props.value;
  }
  return {
    exports, storage, writes, render,
    failStorage: () => { fail = true; },
    async mount() {
      render();
      effects.forEach(effect => effect());
      // Esperar la lectura y el finally de hidratación.
      await new Promise(resolve => setImmediate(resolve));
      return render();
    },
  };
}

for (const platform of ['android', 'web']) {
  test(`${platform}: cambiar idioma y tema persiste al volver a abrir y conserva JWT/usuario`, async () => {
    const p = provider(null, platform);
    let value = await p.mount();
    assert.equal(value.ready, true);
    await value.setLanguage('en');
    value = p.render();
    await value.setTheme('light');
    value = p.render();
    assert.equal(value.t('Mis trabajos'), 'My jobs');
    assert.equal(value.colors.background, themes.appThemes.light.background);
    const restarted = provider(p.storage.get('serviciosya.preferences'), platform);
    const restored = await restarted.mount();
    assert.equal(restored.language, 'en');
    assert.equal(restored.theme, 'light');
    assert.equal(p.storage.get('accessToken'), 'sesion-existente');
    assert.equal(p.storage.get('user'), 'usuario-existente');
    assert.ok(p.writes.every(key => key === 'serviciosya.preferences'));
  });
}

test('Cambios rápidos de idioma y tema conservan ambas preferencias', async () => {
  const p = provider();
  const value = await p.mount();
  await Promise.all([value.setLanguage('en'), value.setTheme('light'), value.setLanguage('es')]);
  const saved = JSON.parse(p.storage.get('serviciosya.preferences'));
  assert.deepEqual(saved, { language: 'es', theme: 'light' });
});

test('Un fallo al guardar no muestra una preferencia que no se ha persistido', async () => {
  const p = provider();
  const value = await p.mount();
  p.failStorage();
  await assert.rejects(value.setTheme('light'));
  assert.equal(p.render().theme, 'dark');
  assert.equal(p.storage.get('accessToken'), 'sesion-existente');
});

test('Preferencias corruptas o desconocidas recuperan valores válidos', async () => {
  for (const saved of ['{invalid', 'null', '42', '{"language":"fr","theme":"sepia"}']) {
    const value = await provider(saved).mount();
    assert.equal(value.language, 'es');
    assert.equal(value.theme, 'dark');
    assert.equal(value.ready, true);
  }
});

test('Las traducciones interpolan nombres sin modificar el contenido escrito por usuarios', () => {
  const message = translations.translate('¿Quieres rechazar la solicitud de {name}?', 'en', { name: 'María' });
  assert.equal(message, 'Do you want to reject the request from María?');
  assert.equal(translations.translate('Mi trabajo personalizado', 'en'), 'Mi trabajo personalizado');
  assert.equal(translations.translate('Mis trabajos', 'es'), 'Mis trabajos');
});

function luminance(hex) {
  const rgb = hex.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('Los textos y botones principales mantienen contraste legible en ambos temas', () => {
  for (const colors of Object.values(themes.appThemes)) {
    for (const [foreground, background] of [[colors.text, colors.background], [colors.text, colors.surface], [colors.muted, colors.surface], [colors.onPrimary, colors.primary]]) {
      const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
      assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${foreground} / ${background}`);
    }
  }
});
