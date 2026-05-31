# Fiamma Pizza Backend

Backend API for the Fiamma Pizza application. It serves the restaurant menu, calculates order totals, creates Mercado Pago checkout preferences, receives payment webhooks, and stores order/payment status in PostgreSQL.

## Features

- Express 5 API written in TypeScript.
- PostgreSQL schema initialization for categories, products, and orders.
- Seed SQL with menu categories and products.
- Mercado Pago checkout preference creation.
- Payment webhook processing and order status updates.
- Health check endpoint that verifies database connectivity.
- CORS configured from environment variables.

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Mercado Pago SDK
- dotenv

## Requirements

- Node.js 20 or newer recommended.
- npm
- PostgreSQL
- Mercado Pago access token for payment routes.

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/fiamma_pizza
ORIGIN=http://localhost:4200
MP_ACCESS_TOKEN=your_mercado_pago_access_token
MP_WEBHOOK_URL=https://your-public-domain.com/api/payments/webhook
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `PORT` | No | API port. Defaults to `3000`. |
| `ORIGIN` | No | Allowed CORS origin. Defaults to `http://localhost:4200`. |
| `MP_ACCESS_TOKEN` | For payment integration | Mercado Pago access token. |
| `MP_WEBHOOK_URL` | No | Public webhook URL sent to Mercado Pago preferences. |

## Installation

```bash
npm install
```

## Database Setup

The server creates the required tables on startup. To also seed the database with the menu products, run:

```bash
npm run db:init
```

This command executes `sql/init.sql` using `DATABASE_URL`.

## Running the API

Development mode:

```bash
npm run dev
```

Production build and start:

```bash
npm start
```

Type-check only:

```bash
npm run typecheck
```

## API Reference

All routes are mounted under `/api`.

### Health

#### `GET /api/health`

Checks whether the API can connect to PostgreSQL.

Response:

```json
{
  "status": "ok"
}
```

### Menu

#### `GET /api/menu`

Returns menu categories with their products.

Response example:

```json
[
  {
    "title": "Pizzas Artesanais",
    "items": [
      {
        "id": 1,
        "name": "Margherita D.O.P",
        "desc": "Molho San Marzano, mozzarella fior di latte, manjericão e azeite extravirgem.",
        "imageUrl": "https://example.com/pizza.jpg",
        "price": 58
      }
    ]
  }
]
```

### Orders

#### `GET /api/orders`

Lists stored orders ordered by creation date descending.

Response example:

```json
{
  "count": 1,
  "orders": [
    {
      "externalReference": "order-123",
      "payerEmail": "customer@example.com",
      "items": [],
      "status": "pending",
      "paymentId": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

### Payments

#### `POST /api/payments/summary`

Calculates an order subtotal, service fee, and total using product IDs stored in the database.

Request:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

Response example:

```json
{
  "items": [
    {
      "id": "1",
      "title": "Margherita D.O.P",
      "quantity": 2,
      "unit_price": 58,
      "currency_id": "BRL"
    }
  ],
  "fee": {
    "id": "order-fee",
    "title": "Taxa de serviço",
    "quantity": 1,
    "unit_price": 7,
    "currency_id": "BRL"
  },
  "subtotal": 116,
  "total": 123,
  "currencyId": "BRL"
}
```

#### `POST /api/payments/preference`

Creates a Mercado Pago checkout preference and stores the order as `pending`. If there is already an active pending preference for the same `externalReference` (or same cart/e-mail when no reference is provided), the API returns the existing link. New preference links expire after 10 minutes.

Request:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "payerEmail": "customer@example.com",
  "externalReference": "order-123"
}
```

Response example:

```json
{
  "id": "123456789",
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "sandboxInitPoint": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "externalReference": "order-123",
  "expiresAt": "2026-05-31T18:10:00.000Z",
  "reused": false
}
```

#### `POST /api/payments/webhook`

Receives Mercado Pago payment notifications. When the notification type is `payment`, the API fetches payment details from Mercado Pago and updates the stored order by `external_reference`.

#### `GET /api/payments/status/:externalReference`

Searches Mercado Pago for the latest payment matching the given external reference. If no payment is found, it falls back to the locally stored order.

Response example:

```json
{
  "found": true,
  "externalReference": "order-123",
  "payment": {
    "id": 123456789,
    "status": "approved",
    "statusDetail": "accredited",
    "transactionAmount": 123,
    "dateCreated": "2026-01-01T12:00:00.000Z",
    "dateApproved": "2026-01-01T12:01:00.000Z"
  }
}
```

## Data Model

The database contains:

- `categories`: menu category titles.
- `products`: products linked to categories, with description, image URL, and price.
- `orders`: checkout references, payer email, items JSON, status, payment ID, and Mercado Pago payload.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the API in watch mode with `tsx`. |
| `npm run build` | Compiles TypeScript to `dist`. |
| `npm start` | Builds the project and runs `dist/server.js`. |
| `npm run typecheck` | Runs TypeScript without emitting files. |
| `npm run db:init` | Initializes and seeds the PostgreSQL database. |
| `npm test` | Placeholder script. |

---

# Fiamma Pizza Backend

API backend para a aplicação Fiamma Pizza. Ela serve o cardápio do restaurante, calcula totais de pedidos, cria preferências de checkout no Mercado Pago, recebe webhooks de pagamento e armazena o status de pedidos/pagamentos no PostgreSQL.

## Funcionalidades

- API Express 5 escrita em TypeScript.
- Inicialização do schema PostgreSQL para categorias, produtos e pedidos.
- SQL de seed com categorias e produtos do cardápio.
- Criação de preferências de checkout no Mercado Pago.
- Processamento de webhooks de pagamento e atualização de status do pedido.
- Health check que valida a conectividade com o banco.
- CORS configurado por variáveis de ambiente.

## Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- SDK do Mercado Pago
- dotenv

## Requisitos

- Node.js 20 ou superior recomendado.
- npm
- PostgreSQL
- Access token do Mercado Pago para as rotas de pagamento.

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/fiamma_pizza
ORIGIN=http://localhost:4200
MP_ACCESS_TOKEN=seu_access_token_do_mercado_pago
MP_WEBHOOK_URL=https://seu-dominio-publico.com/api/payments/webhook
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL. |
| `PORT` | Não | Porta da API. Padrão: `3000`. |
| `ORIGIN` | Não | Origem permitida pelo CORS. Padrão: `http://localhost:4200`. |
| `MP_ACCESS_TOKEN` | Para integração de pagamento | Access token do Mercado Pago. |
| `MP_WEBHOOK_URL` | Não | URL pública de webhook enviada às preferências do Mercado Pago. |

## Instalação

```bash
npm install
```

## Configuração do Banco

O servidor cria as tabelas necessárias ao iniciar. Para também popular o banco com os produtos do cardápio, execute:

```bash
npm run db:init
```

Esse comando executa `sql/init.sql` usando `DATABASE_URL`.

## Executando a API

Modo de desenvolvimento:

```bash
npm run dev
```

Build e execução em produção:

```bash
npm start
```

Apenas verificação de tipos:

```bash
npm run typecheck
```

## Referência da API

Todas as rotas são montadas sob `/api`.

### Saúde

#### `GET /api/health`

Verifica se a API consegue se conectar ao PostgreSQL.

Resposta:

```json
{
  "status": "ok"
}
```

### Cardápio

#### `GET /api/menu`

Retorna as categorias do cardápio com seus produtos.

Exemplo de resposta:

```json
[
  {
    "title": "Pizzas Artesanais",
    "items": [
      {
        "id": 1,
        "name": "Margherita D.O.P",
        "desc": "Molho San Marzano, mozzarella fior di latte, manjericão e azeite extravirgem.",
        "imageUrl": "https://example.com/pizza.jpg",
        "price": 58
      }
    ]
  }
]
```

### Pedidos

#### `GET /api/orders`

Lista os pedidos armazenados em ordem decrescente de criação.

Exemplo de resposta:

```json
{
  "count": 1,
  "orders": [
    {
      "externalReference": "order-123",
      "payerEmail": "customer@example.com",
      "items": [],
      "status": "pending",
      "paymentId": null,
      "createdAt": "2026-01-01T12:00:00.000Z",
      "updatedAt": "2026-01-01T12:00:00.000Z"
    }
  ]
}
```

### Pagamentos

#### `POST /api/payments/summary`

Calcula subtotal, taxa de serviço e total do pedido usando IDs de produtos salvos no banco.

Requisição:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ]
}
```

Exemplo de resposta:

```json
{
  "items": [
    {
      "id": "1",
      "title": "Margherita D.O.P",
      "quantity": 2,
      "unit_price": 58,
      "currency_id": "BRL"
    }
  ],
  "fee": {
    "id": "order-fee",
    "title": "Taxa de serviço",
    "quantity": 1,
    "unit_price": 7,
    "currency_id": "BRL"
  },
  "subtotal": 116,
  "total": 123,
  "currencyId": "BRL"
}
```

#### `POST /api/payments/preference`

Cria uma preferência de checkout no Mercado Pago e salva o pedido como `pending`. Se já houver uma preferência pendente ativa para o mesmo `externalReference` (ou mesmo carrinho/e-mail quando nenhuma referência for enviada), a API retorna o link existente. Novos links de preferência expiram após 10 minutos.

Requisição:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "payerEmail": "customer@example.com",
  "externalReference": "order-123"
}
```

Exemplo de resposta:

```json
{
  "id": "123456789",
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "sandboxInitPoint": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789",
  "externalReference": "order-123",
  "expiresAt": "2026-05-31T18:10:00.000Z",
  "reused": false
}
```

#### `POST /api/payments/webhook`

Recebe notificações de pagamento do Mercado Pago. Quando o tipo da notificação é `payment`, a API busca os detalhes do pagamento no Mercado Pago e atualiza o pedido armazenado por `external_reference`.

#### `GET /api/payments/status/:externalReference`

Busca no Mercado Pago o pagamento mais recente correspondente à referência externa. Se nenhum pagamento for encontrado, retorna o pedido armazenado localmente.

Exemplo de resposta:

```json
{
  "found": true,
  "externalReference": "order-123",
  "payment": {
    "id": 123456789,
    "status": "approved",
    "statusDetail": "accredited",
    "transactionAmount": 123,
    "dateCreated": "2026-01-01T12:00:00.000Z",
    "dateApproved": "2026-01-01T12:01:00.000Z"
  }
}
```

## Modelo de Dados

O banco contém:

- `categories`: títulos das categorias do cardápio.
- `products`: produtos vinculados às categorias, com descrição, URL da imagem e preço.
- `orders`: referências de checkout, e-mail do pagador, JSON dos itens, status, ID do pagamento e payload do Mercado Pago.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Inicia a API em modo watch com `tsx`. |
| `npm run build` | Compila TypeScript para `dist`. |
| `npm start` | Compila o projeto e executa `dist/server.js`. |
| `npm run typecheck` | Executa o TypeScript sem emitir arquivos. |
| `npm run db:init` | Inicializa e popula o banco PostgreSQL. |
| `npm test` | Script placeholder. |

## License / Licença

This project is licensed under the MIT License. See `LICENSE` for details.

Este projeto está licenciado sob a Licença MIT. Consulte `LICENSE` para mais detalhes.
