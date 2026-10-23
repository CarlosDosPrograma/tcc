const mongoose = require('mongoose');

async function conectarBanco() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      'MONGO_URI não foi definida. Confira o arquivo backend/.env.'
    );
  }

  await mongoose.connect(uri);

  console.log('MongoDB conectado com sucesso.');
}

module.exports = conectarBanco;