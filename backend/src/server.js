const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const conectarBanco = require('./config/database');
const app = require('./app');

async function iniciarServidor() {
  const porta = Number(process.env.PORT || 3001);

  if (
    !Number.isInteger(porta) ||
    porta < 1 ||
    porta > 65535
  ) {
    throw new Error('PORT deve ser uma porta válida.');
  }

  await conectarBanco();

  app.listen(porta, '127.0.0.1', () => {
    console.log(
      `API disponível em http://127.0.0.1:${porta}`
    );
  });
}

iniciarServidor().catch((erro) => {
  console.error(
    'Não foi possível iniciar o backend:',
    erro.message
  );

  process.exit(1);
});