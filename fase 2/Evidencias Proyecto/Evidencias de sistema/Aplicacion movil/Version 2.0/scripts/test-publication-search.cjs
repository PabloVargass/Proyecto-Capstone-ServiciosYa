const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/services/publication-search.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const moduleOutput = {};
vm.runInNewContext(code, { exports: moduleOutput, require: createRequire(filename), Set, Date, JSON });
const { filterPublications, defaultPublicationFilters, chileRegions, readPublicationFilters } = moduleOutput;
const jobs = [
  { id: 'request', kind: 'OPORTUNIDAD', category: 'Limpieza', commune: 'Maipú', budget: 10000, createdAt: '2026-10-10T10:00:00Z' },
  { id: 'offer', kind: 'SERVICIO', category: 'Limpieza', commune: 'maipu', budget: 30000, createdAt: '2026-10-09T10:00:00Z' },
  { id: 'valpo', kind: 'SERVICIO', category: 'Tecnología', commune: 'Valparaíso', budget: 10000, createdAt: '2026-10-11T10:00:00Z' },
  { id: 'legacy', category: 'Armado de muebles', commune: 'La Florida', budget: 10000, createdAt: '2026-10-08T10:00:00Z' },
];
const ids = (filters = {}, excluded) => filterPublications(jobs, { ...defaultPublicationFilters, ...filters }, excluded).map(job => job.id);
test('todos incluye ofertas y solicitudes sin cambiar la colección original', () => { assert.equal(ids().length, 4); assert.equal(jobs[0].id, 'request'); });
test('el tipo separa ofertas y solicitudes y conserva publicaciones antiguas', () => { assert.deepEqual(Array.from(ids({ type: 'SERVICIO' })).sort(), ['offer', 'valpo']); assert.deepEqual(Array.from(ids({ type: 'OPORTUNIDAD' })).sort(), ['legacy', 'request']); });
test('categoría escrita permite coincidencias parciales y sin tildes', () => assert.deepEqual(Array.from(ids({ category: ' tecnologia ' })), ['valpo']));
test('región filtra por sus comunas oficiales y no por partes del nombre', () => { assert.deepEqual(Array.from(ids({ regionId: '13' })).sort(), ['legacy', 'offer', 'request']); assert.deepEqual(Array.from(ids({ regionId: '5' })), ['valpo']); });
test('comuna acepta acentos y se combina con tipo y categoría', () => assert.deepEqual(Array.from(ids({ regionId: '13', commune: 'Maipú', type: 'SERVICIO', category: 'limpieza' })), ['offer']));
test('desactivar destacados ordena por fecha sin excluir publicaciones', () => assert.deepEqual(Array.from(ids({ featured: false })), ['valpo', 'request', 'offer', 'legacy']));
test('los descartados no reaparecen al cambiar filtros', () => assert.equal(ids({}, ['offer']).includes('offer'), false));
test('catálogo completo y sin códigos duplicados: 16 regiones, 346 comunas', () => { assert.equal(chileRegions.length, 16); const communes = chileRegions.flatMap(region => region.communes); assert.equal(communes.length, 346); assert.equal(new Set(communes.map(item => item.id)).size, 346); assert.equal(chileRegions.find(region => region.id === '12').communes.find(item => item.name === 'Antártica').id, '12202'); });
test('parámetros inválidos de navegación vuelven a filtros seguros', () => { assert.equal(readPublicationFilters('invalido').type, 'ALL'); assert.equal(readPublicationFilters('{"type":"ADMIN","regionId":"999"}').regionId, ''); });
