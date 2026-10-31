# ServiçoJá — Backend

Backend do protótipo acadêmico ServiçoJá, desenvolvido para
divulgação e agendamento de serviços locais.

O frontend fica em pasta separada e será desenvolvido com
HTML, CSS e JavaScript básico.

## 1. Objetivo

Disponibilizar uma API para:

- Cadastrar prestadores.
- Cadastrar e gerenciar serviços.
- Consultar horários disponíveis.
- Registrar agendamentos.
- Consultar atendimentos.
- Confirmar, concluir e cancelar solicitações.

O foco é apresentar um fluxo funcional de ponta a ponta,
com integração entre interface, servidor e banco de dados.

## 2. Escopo da versão

Esta versão é um protótipo para demonstração local.

Não possui:

- Autenticação ou autorização.
- Pagamento real.
- Chat.
- Envio de notificações.
- Recuperação de senha.
- Reagendamento.
- Exclusão de registros.
- Configuração de expediente por prestador.

Utilize dados fictícios.

Não publique esta versão para uso real sem implementar
os controles de acesso e revisar as demais limitações.

## 3. Tecnologias

- Node.js.
- Express 5.
- MongoDB.
- Mongoose 8.
- CORS.
- Dotenv.

O código utiliza CommonJS:

```js
const modulo = require('modulo');

module.exports = modulo;
```

O package.json deve estar compatível com CommonJS.
O campo `type` pode estar ausente ou definido como `commonjs`.

## 4. Pré-requisitos

- Node.js compatível com as dependências e com `node --watch`.
- npm.
- MongoDB local instalado e executando.
- Terminal, como PowerShell do VS Code.

O ambiente informado durante o desenvolvimento utiliza Node.js 24.

MongoDB Compass é opcional.
Ele não substitui o servidor MongoDB.

## 5. Estrutura

```text
backend/
├── docs/
│   └── api.md
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── prestador.controller.js
│   │   ├── servico.controller.js
│   │   ├── agendamento.controller.js
│   │   └── painel.controller.js
│   ├── middlewares/
│   │   └── errorHandler.js
│   ├── models/
│   │   └── index.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── prestador.routes.js
│   │   ├── servico.routes.js
│   │   ├── agendamento.routes.js
│   │   └── painel.routes.js
│   ├── services/
│   │   └── agenda.service.js
│   ├── utils/
│   │   └── validacoes.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

Os arquivos `.env` e a pasta `node_modules` existem localmente,
mas não devem ser enviados ao GitHub.

## 6. Responsabilidade dos arquivos

| Parte | Responsabilidade |
|---|---|
| server.js | Carregar ambiente, conectar ao banco e iniciar o servidor |
| app.js | Configurar CORS, JSON, rotas e tratamento de erros |
| routes | Associar endereços e métodos aos controllers |
| controllers | Validar entradas, coordenar operações e enviar respostas |
| agenda.service.js | Disponibilidade, conflitos e criação de reservas |
| validacoes.js | Funções de validação compartilhadas |
| models/index.js | Definir Prestador, Servico e Agendamento |
| database.js | Conectar ao MongoDB |
| errorHandler.js | Padronizar respostas de erro |

Fluxo principal:

```text
Cliente HTTP
    ↓
Rotas
    ↓
Controllers
    ↓
Service de agenda, quando necessário
    ↓
Models
    ↓
MongoDB
```

Operações simples de cadastro e consulta podem acessar
os models diretamente pelo controller.

## 7. Instalação

### Entrar na pasta backend

```powershell
cd "CAMINHO_DO_PROJETO\backend"
```

Substitua CAMINHO_DO_PROJETO pelo caminho real.

Execute os próximos comandos na pasta que contém
o package.json do backend.

### Instalar dependências

```powershell
npm install
```

Não é necessário executar npm init novamente.

Mantenha package-lock.json versionado.
Não apague o lockfile como primeira tentativa para corrigir erros.

## 8. Configurar variáveis de ambiente

Se ainda não existir `.env`, copie `.env.example`:

```powershell
Copy-Item .env.example .env
```

Não sobrescreva um `.env` já configurado sem revisar seu conteúdo.

Configuração demonstrativa:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/servicoja_demo
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

| Variável | Função |
|---|---|
| PORT | Porta do backend |
| MONGO_URI | Endereço de conexão com MongoDB |
| FRONTEND_ORIGIN | Origem permitida para o frontend no navegador |

O server.js procura o `.env` dentro de backend.

Não envie credenciais reais ao GitHub.
O `.env.example` deve conter somente valores demonstrativos.

## 9. Iniciar o MongoDB

Confirme que sua instância local está executando.

A forma de iniciar depende da instalação.
Se o MongoDB foi instalado como serviço do Windows,
verifique seu estado no aplicativo Serviços.

## 10. Executar o backend

Durante o desenvolvimento:

```powershell
npm run dev
```

Saída esperada:

```text
MongoDB conectado com sucesso.
API disponível em http://127.0.0.1:3001
```

Deixe esse terminal aberto.

Para parar:

```text
Ctrl+C
```

Para iniciar sem monitorar alterações:

```powershell
npm start
```

Scripts esperados no package.json:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "node --watch src/server.js"
}
```

O servidor demonstrativo escuta em 127.0.0.1.
Ele não está configurado para acesso por outros computadores.

## 11. Verificar a API

Em outro terminal:

```powershell
$baseUrl = "http://127.0.0.1:3001/api"

Invoke-RestMethod -Uri "$baseUrl/health"
```

Resposta esperada:

```json
{
  "status": "ok"
}
```

Se a inicialização falhar, confira primeiro o terminal do backend.

## 12. Primeiro cadastro sem Postman

Os exemplos usam PowerShell.

Execute os blocos na ordem e no mesmo terminal.

Repetir os comandos de cadastro pode criar registros duplicados.

### Cadastrar prestador

```powershell
$baseUrl = "http://127.0.0.1:3001/api"

$dadosPrestador = @{
    nome = "Profissional de demonstracao"
    descricao = "Atendimento de beleza."
} | ConvertTo-Json

$prestador = Invoke-RestMethod `
    -Uri "$baseUrl/prestadores" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $dadosPrestador `
    -ErrorAction Stop

$prestador | Format-List
```

### Cadastrar serviço

```powershell
$dadosServico = @{
    prestadorId = $prestador._id
    titulo = "Corte de cabelo"
    descricao = "Servico demonstrativo."
    categoria = "Beleza"
    preco = 40
    duracao = 30
} | ConvertTo-Json

$servico = Invoke-RestMethod `
    -Uri "$baseUrl/servicos" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $dadosServico `
    -ErrorAction Stop

$servico | Format-List
```

### Consultar serviços

```powershell
Invoke-RestMethod -Uri "$baseUrl/servicos"

Invoke-RestMethod -Uri "$baseUrl/painel/servicos"
```

Consulte docs/api.md para os exemplos dos outros endpoints.

Não há script automático de seed nesta implementação.

## 13. Regras da agenda

- Atendimento de segunda a sexta.
- Expediente das 08:00 às 18:00.
- Sem pausa de almoço configurada.
- Deslocamento fixo UTC-03:00.
- Sugestões de início a cada 30 minutos.
- Duração do serviço de 15 a 480 minutos.
- A duração inteira precisa caber no expediente.
- Pendentes e confirmados bloqueiam horários.
- Conflitos consideram o prestador, não somente o serviço.
- Cancelados e concluídos não bloqueiam a agenda.
- Consultar disponibilidade não reserva a vaga.
- O POST verifica conflitos novamente.
- O POST aceita minutos fora da grade de sugestões.

Preço e início/fim ficam registrados no agendamento.
Alterar o serviço depois não recalcula esses dados.

Desativar um serviço impede novas reservas, mas não cancela
os atendimentos existentes.

## 14. Status dos agendamentos

Transições permitidas:

```text
pendente → confirmado
pendente → cancelado
confirmado → concluido
confirmado → cancelado
```

Não é possível reabrir cancelados ou concluídos.

A implementação não verifica se o horário já passou antes
de permitir a conclusão.

Evite concluir antecipadamente durante testes em que
o atendimento ainda deva bloquear o horário.

## 15. Integração com o frontend

O frontend fica fora de backend.

O Express atual não entrega as páginas HTML.

Para integrar:

1. Inicie o backend.
2. Inicie um servidor local para o frontend.
3. Configure FRONTEND_ORIGIN com a origem exata das páginas.
4. Reinicie o backend após alterar o `.env`.
5. Use a base http://127.0.0.1:3001/api no JavaScript.
6. Trate carregamento, erro, sucesso e lista vazia.

localhost e 127.0.0.1 são origens diferentes.

Não abra as páginas apenas por duplo clique no HTML.

CORS não substitui autenticação ou autorização.

Outro computador não consegue acessar esta API usando
o próprio endereço 127.0.0.1.

### Atenção ao formato das respostas

Nem todas as rotas usam o mesmo formato:

- Listagens retornam arrays.
- Cadastro de prestador e serviço retorna documento diretamente.
- Criação de agendamento retorna mensagem e agendamento.
- Edição de serviço retorna mensagem e servico.
- Alteração de status retorna documento diretamente.

O contrato completo está em docs/api.md.

## 16. Testes antes da apresentação

- Verificar saúde da API.
- Cadastrar e consultar prestador.
- Cadastrar e consultar serviço.
- Consultar disponibilidade em dia útil futuro.
- Criar agendamento.
- Repetir reserva e confirmar erro 409.
- Testar sobreposição parcial.
- Testar sobreposição entre serviços do mesmo prestador.
- Confirmar e cancelar.
- Verificar liberação do horário após cancelamento.
- Testar datas passadas e inexistentes.
- Testar fora do expediente.
- Testar preço e duração inválidos.
- Testar transição de status proibida.
- Editar, desativar e reativar serviço.
- Testar filtros.
- Reiniciar a API e verificar persistência.

Não existe suíte automatizada ou script npm test
definido nesta versão.

A lista acima é um roteiro de verificação manual,
não uma declaração de que todos os testes foram executados.

## 17. Solução de problemas

### Impossível conectar ao servidor remoto

Confira:

- Se o backend está executando.
- Se a mensagem de API disponível apareceu.
- Se houve erro antes da inicialização.
- Se a URL usa a porta correta.
- Se o MongoDB está disponível.

### Cannot find module '../services/agenda.service'

O arquivo precisa estar em:

```text
backend/src/services/agenda.service.js
```

Não deve estar:

```text
backend/src/controllers/agenda.service.js.js
```

Confira o nome, a extensão e os imports.

Se houver uma cópia antiga, verifique qual arquivo está sendo
usado antes de removê-la.

### Erro de conexão com MongoDB

Verifique:

- MongoDB em execução.
- MONGO_URI no `.env`.
- Endereço e porta do banco.
- Mensagem completa no terminal.

A variável usada por esta implementação é MONGO_URI.

### require is not defined

O código usa CommonJS.

Confira se package.json não está definido como:

```json
{
  "type": "module"
}
```

Para esta base, use CommonJS sem misturar os sistemas de módulos.

### Handler inválido no router

Confira os nomes das funções exportadas nos controllers
e utilizados pelos arquivos de rotas.

Exemplo:

```js
router.get('/', servicoController.listar);
```

Exige uma função:

```js
exports.listar = async (req, res) => {
  // Implementação.
};
```

### Porta já está em uso

Verifique se outra instância do backend está executando.
Pare a instância anterior ou altere PORT.

Se mudar a porta, atualize os clientes da API.

### Funciona no PowerShell, mas não no navegador

Confira:

- FRONTEND_ORIGIN.
- Endereço utilizado pelo frontend.
- Console e aba de rede do navegador.
- Terminal do backend.
- Se as páginas estão sendo servidas por HTTP.

Não desative a segurança do navegador para contornar o erro.

### Horários com diferença de três horas

Respostas com Z representam UTC.

O frontend deve formatar as datas de forma coerente com
a agenda UTC-03:00.

Não remova o Z nem altere horas manualmente sem uma regra
de conversão.

## 18. Git e arquivos locais

Conteúdo sugerido de backend/.gitignore:

```gitignore
node_modules/
.env
*.log
```

Versione:

- Código-fonte.
- Documentação.
- package.json.
- package-lock.json.
- .env.example com valores fictícios.

Não versione:

- node_modules.
- .env com credenciais.
- Dados pessoais reais.
- Cópias incorretas de arquivos.
- Logs com informações sensíveis.

Antes do commit:

```powershell
git status
git diff --cached
```

Se o Git abrir um visualizador, pressione q para sair.

## 19. Limitações conhecidas

- Sem autenticação ou autorização.
- Rotas administrativas sem proteção.
- Contatos dos clientes acessíveis pela listagem.
- Controle de criação simultânea apenas em memória.
- Esse controle vale somente para uma instância do servidor.
- Não há proteção completa contra todas as alterações concorrentes.
- Sem paginação.
- Limite de 100 registros por listagem.
- Expediente e deslocamento de horário fixos.
- Sem validação completa de telefone.
- Sem pagamentos.
- Sem testes automatizados.

A organização em camadas facilita a manutenção, mas não elimina
essas limitações.

O sistema deve ser apresentado como protótipo funcional acadêmico,
não como plataforma comercial pronta.

## 20. Documentação complementar

O contrato dos endpoints está em:

```text
docs/api.md
```

Atualize a documentação sempre que alterar:

- Rotas.
- Campos obrigatórios.
- Formatos de resposta.
- Filtros.
- Regras de negócio.
- Códigos de erro.