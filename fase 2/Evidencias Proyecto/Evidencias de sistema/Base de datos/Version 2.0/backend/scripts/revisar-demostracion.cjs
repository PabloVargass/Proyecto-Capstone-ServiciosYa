// Ejecutar desde backend. Solo consulta la API; no prepara ni reinicia datos.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { JwtService } = require('@nestjs/jwt');
const root = path.resolve(__dirname, '..');
const dev = dotenv.parse(fs.readFileSync(path.join(root, '.env.development.local')));
const primary = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const endpoint = value => { const u = new URL(value); return u.hostname.replace('-pooler.', '.') + u.pathname; };
if (endpoint(dev.DATABASE_URL) === endpoint(primary.DATABASE_URL) || dev.JWT_SECRET === primary.JWT_SECRET) throw Error('Destino de desarrollo no aislado');
const accounts = JSON.parse(fs.readFileSync(path.join(root, '.temp/presentation-accounts.private.json')));
const stage = JSON.parse(fs.readFileSync(path.join(root, '.temp/presentation-stage-results.json')));
async function api(route, token, body, expected = 200) {
  const response = await fetch('http://127.0.0.1:3000' + route, {
    method: body ? 'POST' : 'GET',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== expected) throw Error(route + ': HTTP ' + response.status);
  return route === '/' ? response.text() : response.json();
}
(async () => {
  const results = [];
  await api('/'); results.push('Backend responde');
  for (const actor of accounts) {
    const session = await api('/auth/login', null, { email: actor.email, password: actor.password }, 201);
    new JwtService().verify(session.accessToken, { secret: dev.JWT_SECRET });
    results.push('Login ' + actor.purpose);
    if (['cliente', 'trabajador'].includes(actor.purpose)) {
      const identity = await api('/identity/me', session.accessToken);
      if (!identity.canPublish) throw Error('Identidad sin aprobación: ' + actor.purpose);
      const jobs = await api('/jobs/mis-trabajos', session.accessToken);
      if (!JSON.stringify(jobs).includes(stage.jobId)) throw Error('Respaldo ausente: ' + actor.purpose);
      const detail = await api('/jobs/' + stage.jobId, session.accessToken);
      if (detail.status !== 'ASIGNADO') throw Error('El respaldo ya fue utilizado. Estado: ' + detail.status);
      results.push('Identidad y respaldo ' + actor.purpose);
    }
    await api('/admin/summary', session.accessToken, undefined, actor.purpose === 'administrador' ? 200 : 403);
    results.push('Permiso administrativo ' + actor.purpose);
  }
  const report = { checkedAt: new Date().toISOString(), passed: results.length, results, note: 'Falta comprobar visualmente el emulador. Crear la publicación principal el día de la presentación.' };
  fs.writeFileSync(path.join(root, '.temp/presentation-preflight-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(error => {
  console.error(String(error.message).replace(/Bearer\s+\S+/g, '[sesión ocultada]'));
  console.error('Comprobación fallida. Revisar backend de desarrollo, conexión a Internet, cuentas e historial del respaldo. No se muestran credenciales.');
  process.exitCode = 1;
});
