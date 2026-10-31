const { Agendamento } = require('../models');

const {
  falhar,
  validarData,
} = require('../utils/validacoes');

const ABERTURA = 8 * 60;
const FECHAMENTO = 18 * 60;
const INTERVALO = 30;
const DESLOCAMENTO_UTC = '-03:00';

// Bloqueio local, limitado a uma instância do servidor.
const reservasEmProcessamento = new Set();

function montarInicio(data, horario) {
  return new Date(
    `${data}T${horario}:00${DESLOCAMENTO_UTC}`
  );
}

function montarFim(inicio, duracao) {
  return new Date(
    inicio.getTime() + duracao * 60_000
  );
}

function ehDiaUtil(dataCalendario) {
  const dia = dataCalendario.getUTCDay();

  return dia !== 0 && dia !== 6;
}

async function consultarDisponibilidade(servico, data) {
  const dataCalendario = validarData(data);

  const resposta = {
    servicoId: servico._id,
    data,
    deslocamentoUTC: DESLOCAMENTO_UTC,
    duracao: servico.duracao,
    intervaloSugestoes: INTERVALO,
    horarios: [],
  };

  if (!ehDiaUtil(dataCalendario)) {
    return resposta;
  }

  const inicioExpediente = montarInicio(data, '08:00');
  const fimExpediente = montarInicio(data, '18:00');
  const agora = new Date();

  if (fimExpediente <= agora) {
    return resposta;
  }

  const ocupados = await Agendamento.find({
    prestador: servico.prestador,
    status: {
      $in: ['pendente', 'confirmado'],
    },
    inicio: {
      $lt: fimExpediente,
    },
    fim: {
      $gt: inicioExpediente,
    },
  })
    .select('inicio fim -_id')
    .lean();

  for (
    let minutos = ABERTURA;
    minutos + servico.duracao <= FECHAMENTO;
    minutos += INTERVALO
  ) {
    const hora = String(
      Math.floor(minutos / 60)
    ).padStart(2, '0');

    const minuto = String(
      minutos % 60
    ).padStart(2, '0');

    const horario = `${hora}:${minuto}`;
    const inicio = montarInicio(data, horario);
    const fim = montarFim(inicio, servico.duracao);

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

  return resposta;
}

async function criarReserva({
  servico,
  nomeCliente,
  telefoneCliente,
  data,
  horario,
  observacoes,
}) {
  const dataCalendario = validarData(data);

  if (
    typeof horario !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)
  ) {
    falhar(400, 'Informe o horario no formato HH:MM.');
  }

  const inicio = montarInicio(data, horario);

  if (
    Number.isNaN(inicio.getTime()) ||
    inicio <= new Date()
  ) {
    falhar(400, 'Escolha uma data e um horario futuros.');
  }

  const [hora, minuto] = horario.split(':').map(Number);
  const minutosInicio = hora * 60 + minuto;

  if (
    !ehDiaUtil(dataCalendario) ||
    minutosInicio < ABERTURA ||
    minutosInicio + servico.duracao > FECHAMENTO
  ) {
    falhar(
      400,
      'Atendimento de segunda a sexta, das 8h as 18h.'
    );
  }

  const chave = String(servico.prestador);

  if (reservasEmProcessamento.has(chave)) {
    falhar(409, 'Agenda em atualizacao. Tente novamente.');
  }

  reservasEmProcessamento.add(chave);

  try {
    const fim = montarFim(inicio, servico.duracao);

    const conflito = await Agendamento.exists({
      prestador: servico.prestador,
      status: {
        $in: ['pendente', 'confirmado'],
      },
      inicio: {
        $lt: fim,
      },
      fim: {
        $gt: inicio,
      },
    });

    if (conflito) {
      falhar(
        409,
        'O prestador ja possui atendimento nesse horario.'
      );
    }

    const agendamento = await Agendamento.create({
      servico: servico._id,
      prestador: servico.prestador,
      nomeCliente,
      telefoneCliente,
      inicio,
      fim,
      preco: servico.preco,
      observacoes,
    });

    return agendamento;
  } finally {
    reservasEmProcessamento.delete(chave);
  }
}

module.exports = {
  consultarDisponibilidade,
  criarReserva,
};