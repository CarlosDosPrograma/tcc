const express = require('express');
const mongoose = require('mongoose');

const {
  Prestador,
  Servico,
  Agendamento,
} = require('../models');

const router = express.Router();

function falhar(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  throw erro;
}

function validarId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    falhar(400, 'ID inválido.');
  }
}

function texto(valor, campo, maximo) {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > maximo
  ) {
    falhar(400, `${campo} inválido.`);
  }

  return valor.trim();
}

function textoOpcional(valor, campo, maximo) {
  if (valor === undefined) return '';

  if (typeof valor !== 'string' || valor.length > maximo) {
    falhar(400, `${campo} inválido.`);
  }

  return valor.trim();
}

// Impede duas criações simultâneas para o mesmo prestador
// nesta única instância do servidor.
const reservasEmProcessamento = new Set();

router.get('/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'sem_banco',
  });
});

// PRESTADORES

router.post('/prestadores', async (req, res) => {
  const prestador = await Prestador.create({
    nome: texto(req.body.nome, 'Nome', 100),
    descricao: textoOpcional(req.body.descricao, 'Descrição', 500),
  });

  res.status(201).json(prestador);
});

router.get('/prestadores', async (req, res) => {
  const prestadores = await Prestador.find()
    .sort({ nome: 1 })
    .limit(100);

  res.json(prestadores);
});

// SERVIÇOS

router.post('/servicos', async (req, res) => {
  const {
    prestadorId,
    titulo,
    descricao,
    categoria,
    preco,
    duracao,
  } = req.body;

  validarId(prestadorId);

  if (!(await Prestador.exists({ _id: prestadorId }))) {
    falhar(404, 'Prestador não encontrado.');
  }

  if (
    typeof preco !== 'number' ||
    !Number.isFinite(preco) ||
    preco < 0
  ) {
    falhar(400, 'Preço inválido.');
  }

  if (!Number.isInteger(duracao) || duracao < 15 || duracao > 480) {
    falhar(400, 'A duração deve ser de 15 a 480 minutos.');
  }

  const servico = await Servico.create({
    prestador: prestadorId,
    titulo: texto(titulo, 'Título', 100),
    descricao: textoOpcional(descricao, 'Descrição', 1000),
    categoria: texto(categoria, 'Categoria', 60),
    preco,
    duracao,
  });

  res.status(201).json(servico);
});

router.get('/servicos', async (req, res) => {
  const filtro = { ativo: true };

  if (req.query.categoria) {
    filtro.categoria = texto(req.query.categoria, 'Categoria', 60);
  }

  if (req.query.q) {
    const termo = texto(req.query.q, 'Busca', 100);
    const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filtro.titulo = { $regex: escapado, $options: 'i' };
  }

  const servicos = await Servico.find(filtro)
    .populate('prestador', 'nome descricao')
    .sort({ titulo: 1 })
    .limit(100);

  res.json(servicos);
});

router.get('/servicos/:id', async (req, res) => {
  validarId(req.params.id);

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  }).populate('prestador', 'nome descricao');

  if (!servico) {
    falhar(404, 'Serviço não encontrado.');
  }

  res.json(servico);
});

// AGENDAMENTOS

router.post('/agendamentos', async (req, res) => {
  const {
    servicoId,
    nomeCliente,
    telefoneCliente,
    data,
    horario,
    observacoes,
  } = req.body;

  validarId(servicoId);

  const nome = texto(nomeCliente, 'Nome do cliente', 100);
  const telefone = texto(telefoneCliente, 'Telefone', 30);
  const observacao = textoOpcional(observacoes, 'Observações', 500);

  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
    typeof horario !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
  ) {
    falhar(400, 'Informe data e horário válidos.');
  }

  const dataCalendario = new Date(`${data}T00:00:00Z`);

  if (
    Number.isNaN(dataCalendario.getTime()) ||
    dataCalendario.toISOString().slice(0, 10) !== data
  ) {
    falhar(400, 'Data inexistente.');
  }

  const inicio = new Date(`${data}T${horario}:00-03:00`);

  if (Number.isNaN(inicio.getTime()) || inicio <= new Date()) {
    falhar(400, 'Escolha uma data e um horário futuros.');
  }

  const diaSemana = dataCalendario.getUTCDay();
  const [hora, minuto] = horario.split(':').map(Number);
  const minutosInicio = hora * 60 + minuto;

  const servico = await Servico.findOne({
    _id: servicoId,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Serviço não encontrado.');
  }

  if (
    diaSemana === 0 ||
    diaSemana === 6 ||
    minutosInicio < 8 * 60 ||
    minutosInicio + servico.duracao > 18 * 60
  ) {
    falhar(400, 'Atendimento de segunda a sexta, das 8h às 18h.');
  }

  const chave = String(servico.prestador);

  if (reservasEmProcessamento.has(chave)) {
    falhar(409, 'Agenda em atualização. Tente novamente.');
  }

  reservasEmProcessamento.add(chave);

  try {
    const fim = new Date(
      inicio.getTime() + servico.duracao * 60_000
    );

    const conflito = await Agendamento.exists({
      prestador: servico.prestador,
      status: { $in: ['pendente', 'confirmado'] },
      inicio: { $lt: fim },
      fim: { $gt: inicio },
    });

    if (conflito) {
      falhar(409, 'O prestador já possui atendimento nesse horário.');
    }

    const agendamento = await Agendamento.create({
      servico: servico._id,
      prestador: servico.prestador,
      nomeCliente: nome,
      telefoneCliente: telefone,
      inicio,
      fim,
      preco: servico.preco,
      observacoes: observacao,
    });

    res.status(201).json({
      mensagem: 'Agendamento criado com sucesso.',
      agendamento,
    });
  } finally {
    reservasEmProcessamento.delete(chave);
  }
});

router.get('/agendamentos', async (req, res) => {
  const agendamentos = await Agendamento.find()
    .populate('servico', 'titulo categoria')
    .populate('prestador', 'nome')
    .sort({ inicio: 1 })
    .limit(100);

  res.json(agendamentos);
});

router.patch('/agendamentos/:id/status', async (req, res) => {
  validarId(req.params.id);

  const transicoes = {
    confirmado: ['pendente'],
    concluido: ['confirmado'],
    cancelado: ['pendente', 'confirmado'],
  };

  const status = req.body.status;

  if (!Object.hasOwn(transicoes, status)) {
    falhar(400, 'Status inválido.');
  }

  const atualizado = await Agendamento.findOneAndUpdate(
    {
      _id: req.params.id,
      status: { $in: transicoes[status] },
    },
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!atualizado) {
    const existe = await Agendamento.exists({ _id: req.params.id });

    if (!existe) {
      falhar(404, 'Agendamento não encontrado.');
    }

    falhar(409, 'Esta alteração de status não é permitida.');
  }

  res.json(atualizado);
});

router.get('/servicos/:id/disponibilidade', async (req, res) => {
  validarId(req.params.id);

  const { data } = req.query;

  // Valida o formato da data.
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    falhar(400, 'Informe a data no formato AAAA-MM-DD.');
  }

  const dataCalendario = new Date(`${data}T00:00:00Z`);

  // Rejeita datas inexistentes, como 2026-02-30.
  if (
    Number.isNaN(dataCalendario.getTime()) ||
    dataCalendario.toISOString().slice(0, 10) !== data
  ) {
    falhar(400, 'Data inexistente.');
  }

  const servico = await Servico.findOne({
    _id: req.params.id,
    ativo: true,
  });

  if (!servico) {
    falhar(404, 'Servico nao encontrado.');
  }

  const resposta = {
    servicoId: servico._id,
    data,
    deslocamentoUTC: '-03:00',
    duracao: servico.duracao,
    intervaloSugestoes: 30,
    horarios: [],
  };

  const diaSemana = dataCalendario.getUTCDay();

  // Não há atendimento aos sábados e domingos.
  if (diaSemana === 0 || diaSemana === 6) {
    return res.json(resposta);
  }

  // Mesmo deslocamento fixo usado na criação dos agendamentos.
  const inicioExpediente = new Date(`${data}T08:00:00-03:00`);
  const fimExpediente = new Date(`${data}T18:00:00-03:00`);
  const agora = new Date();

  if (fimExpediente <= agora) {
    return res.json(resposta);
  }

  // Busca todos os atendimentos ativos do prestador
  // que se sobrepõem ao expediente consultado.
  const ocupados = await Agendamento.find({
    prestador: servico.prestador,
    status: { $in: ['pendente', 'confirmado'] },
    inicio: { $lt: fimExpediente },
    fim: { $gt: inicioExpediente },
  })
    .select('inicio fim -_id')
    .lean();

  const abertura = 8 * 60;
  const fechamento = 18 * 60;
  const intervalo = 30;

  for (
    let minutos = abertura;
    minutos + servico.duracao <= fechamento;
    minutos += intervalo
  ) {
    const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
    const minuto = String(minutos % 60).padStart(2, '0');
    const horario = `${hora}:${minuto}`;

    const inicio = new Date(`${data}T${horario}:00-03:00`);
    const fim = new Date(
      inicio.getTime() + servico.duracao * 60_000
    );

    if (inicio <= agora) {
      continue;
    }

    const possuiConflito = ocupados.some((agendamento) => {
      return (
        inicio < agendamento.fim &&
        fim > agendamento.inicio
      );
    });

    if (!possuiConflito) {
      resposta.horarios.push(horario);
    }
  }

  return res.json(resposta);
});

module.exports = router;