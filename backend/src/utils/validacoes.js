const mongoose = require('mongoose');

function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function validarId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    falhar(400, 'ID invalido.');
  }
}

function texto(valor, campo, maximo) {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > maximo
  ) {
    falhar(400, `${campo} invalido.`);
  }

  return valor.trim();
}

function textoOpcional(valor, campo, maximo) {
  if (valor === undefined) {
    return '';
  }

  if (
    typeof valor !== 'string' ||
    valor.length > maximo
  ) {
    falhar(400, `${campo} invalido.`);
  }

  return valor.trim();
}

function validarData(data) {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    falhar(400, 'Informe a data no formato AAAA-MM-DD.');
  }

  const dataCalendario = new Date(`${data}T00:00:00Z`);

  if (
    Number.isNaN(dataCalendario.getTime()) ||
    dataCalendario.toISOString().slice(0, 10) !== data
  ) {
    falhar(400, 'Data inexistente.');
  }

  return dataCalendario;
}

module.exports = {
  falhar,
  validarId,
  texto,
  textoOpcional,
  validarData,
};