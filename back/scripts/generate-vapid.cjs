const { generateVAPIDKeys } = require('web-push');
const { writeFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const output = resolve(__dirname, '../.env.vapid.local');
if (existsSync(output)) {
  console.log(
    'Las claves ya existen en back/.env.vapid.local. Se conservaron.',
  );
} else {
  const keys = generateVAPIDKeys();
  const subject =
    process.env.VAPID_SUBJECT || 'mailto:sebastiangonzalez100106@gmail.com';
  if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject))
    throw new Error('VAPID_SUBJECT debe ser mailto: o una URL HTTPS.');
  writeFileSync(
    output,
    `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=${subject}\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Claves generadas en back/.env.vapid.local (ignorado por Git). Copialas a las variables de entorno de Render; no las regeneres en cada despliegue.',
  );
}
