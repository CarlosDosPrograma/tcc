# ServiçoJá — Backend

API do protótipo acadêmico ServiçoJá, destinado à divulgação
e ao agendamento de serviços locais.

## Tecnologias

- Node.js
- Express 5
- MongoDB
- Mongoose 8

O frontend será desenvolvido separadamente com HTML, CSS
e JavaScript.

## Requisitos para execução

- Node.js com suporte ao comando `node --watch`.
- npm.
- MongoDB local em execução.

## Instalação

Abra um terminal na pasta backend e execute:

```bash
npm install
```

Crie o arquivo `.env` usando `.env.example` como referência:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/servicoja_demo
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

Ajuste FRONTEND_ORIGIN ao endereço usado pelo frontend.

Não envie o arquivo `.env` com credenciais reais ao GitHub.

## Execução

Durante o desenvolvimento:

```bash
npm run dev
```

Para iniciar sem observar alterações:

```bash
npm start
```

Endereço configurado para a demonstração:

http://127.0.0.1:3001

Verificação da API:

GET /api/health

Resposta esperada com o banco conectado:

```json
{
  "status": "ok"
}
```

## Organização

```text
src/
├── config/
│   └── database.js
├── controllers/
├── middlewares/
│   └── errorHandler.js
├── models/
│   └── index.js
├── routes/
│   └── index.js
├── app.js
└── server.js
```

Nesta versão, os handlers permanecem no arquivo de rotas.
A pasta controllers está reservada para uma organização posterior.

## Rotas

| Método | Endereço | Finalidade |
|---|---|---|
| GET | /api/health | Consultar a saúde da API |
| POST | /api/prestadores | Cadastrar prestador |
| GET | /api/prestadores | Listar prestadores |
| POST | /api/servicos | Cadastrar serviço |
| GET | /api/servicos | Listar serviços ativos |
| GET | /api/servicos/:id | Consultar serviço ativo |
| PATCH | /api/servicos/:id | Editar, desativar ou reativar |
| GET | /api/servicos/:id/disponibilidade | Consultar horários livres |
| GET | /api/painel/servicos | Listar ativos e inativos |
| POST | /api/agendamentos | Criar agendamento |
| GET | /api/agendamentos | Listar e filtrar agendamentos |
| PATCH | /api/agendamentos/:id/status | Alterar status |

Consultar docs/api.md para os campos, filtros e exemplos.

## Regras do protótipo

- Atendimento de segunda a sexta, das 8h às 18h.
- Deslocamento de horário fixo em UTC-03:00.
- Sugestões de início a cada 30 minutos.
- Duração dos serviços de 15 a 480 minutos.
- O atendimento inteiro precisa caber no expediente.
- Agendamentos pendentes e confirmados ocupam a agenda.
- Conflitos são verificados por prestador, entre todos os seus serviços.
- Cancelados não bloqueiam novas reservas.
- Preço e intervalo dos agendamentos existentes não são
  alterados pela edição do serviço.
- Desativar um serviço impede novas reservas, mas não
  cancela atendimentos existentes.

## Alterações de status

- pendente → confirmado
- pendente → cancelado
- confirmado → concluido
- confirmado → cancelado

Não há reabertura de agendamentos cancelados ou concluídos.

## Limitações

- Uso exclusivamente demonstrativo local, com dados fictícios.
- Sem autenticação ou autorização.
- Sem pagamento real.
- Sem expediente personalizado por prestador.
- Listagens limitadas a 100 registros, sem paginação.
- Bloqueio de criação simultânea limitado a uma instância
  do servidor.
- A consulta de disponibilidade não reserva o horário.
- A criação aceita horários fora da grade de sugestões,
  desde que respeitem o expediente e estejam disponíveis.

As rotas do painel não devem ser expostas para uso real
sem implementação de controle de acesso.