function errorHandler(erro, req, res, next) {
  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'O corpo da requisição deve ser um JSON válido.',
    });
  }

  if (erro.type === 'entity.too.large') {
    return res.status(413).json({
      erro: 'A requisição excede o tamanho permitido.',
    });
  }

  if (
    erro.name === 'ValidationError' ||
    erro.name === 'CastError'
  ) {
    return res.status(400).json({
      erro: 'Dados inválidos. Verifique os campos enviados.',
    });
  }

  if (erro.code === 11000) {
    return res.status(409).json({
      erro: 'Já existe um registro com esses dados.',
    });
  }

  const status =
    Number.isInteger(erro.status) &&
    erro.status >= 400 &&
    erro.status <= 599
      ? erro.status
      : 500;

  if (status >= 500) {
    console.error(erro);
  }

  return res.status(status).json({
    erro:
      status >= 500
        ? 'Erro interno do servidor.'
        : erro.message,
  });
}

module.exports = errorHandler;