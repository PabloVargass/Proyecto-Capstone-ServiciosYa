const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, '.env.development.local');

function endpoint(value) {
  const url = new URL(value);
  return `${url.hostname.replace('-pooler.', '.')}|${url.pathname}`;
}

try {
  const config = dotenv.parse(fs.readFileSync(configPath));
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_APP_PASSWORD']) {
    if (!config[key]?.trim()) throw new Error(`Falta ${key} en .env.development.local.`);
  }
  const primaryPath = path.join(root, '.env');
  if (!fs.existsSync(primaryPath)) {
    throw new Error('No se puede contrastar el destino de desarrollo con la conexión principal.');
  }
  const primary = dotenv.parse(fs.readFileSync(primaryPath));
  if (!primary.DATABASE_URL) throw new Error('No se puede identificar la conexión principal.');
  let same;
  try {
    same = endpoint(config.DATABASE_URL) === endpoint(primary.DATABASE_URL);
  } catch {
    throw new Error('Una conexión de base de datos tiene formato inválido.');
  }
  if (same) throw new Error('Desarrollo no puede usar el mismo servidor y base que la conexión principal.');

  console.log('Iniciando desarrollo con configuración local y destino distinto del principal.');
  const child = spawn(process.execPath, [require.resolve('@nestjs/cli/bin/nest.js'), 'start', '--watch'], {
    cwd: root,
    env: { ...process.env, ...config, NODE_ENV: 'development' },
    stdio: 'inherit',
  });
  child.on('error', () => {
    console.error('No se pudo iniciar NestJS.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo cargar la configuración de desarrollo.');
  process.exitCode = 1;
}
