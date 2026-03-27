# Integracao Mercado Livre: Pedidos e Fiscal

Este documento consolida a base tecnica da integracao com Mercado Livre para OAuth 2.0, sincronizacao de pedidos e consulta de documentos fiscais.

## OAuth 2.0

URL de consentimento:

```text
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_CLIENT_ID&redirect_uri=SUA_REDIRECT_URI
```

Troca do `code` por token:

- Endpoint: `POST https://api.mercadolibre.com/oauth/token`
- Payload: `grant_type`, `client_id`, `client_secret`, `code`, `redirect_uri`

Refresh de token:

- Endpoint: `POST https://api.mercadolibre.com/oauth/token`
- Payload: `grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token`

No projeto, essa base ficou exposta em `MercadoLivreClient` e `MercadoLivreProvider` pelos metodos:

- `buildAuthorizationUrl`
- `exchangeCodeForToken`
- `refreshAccessToken`

## Persistencia

O schema Prisma agora contem as tabelas:

- `ml_credentials`: armazena `seller_id`, `access_token`, `refresh_token`, `expires_at`
- `ml_orders`: espelha `order_id`, `status`, `total_amount`, `items`, `shipping_id`, `pack_id`, `nfe_status`

Essas tabelas permitem recuperar o estado da integracao mesmo apos reinicio da aplicacao ou falhas de rede.

## Endpoints de consumo

Pedidos:

- `GET /orders/search?seller={seller_id}&sort=date_desc`

Fiscal:

- `GET /orders/{order_id}/billing_info`
- `GET /packs/{pack_id}/fiscal_documents`

Webhook:

- Topico: `orders_v2`
- O campo `resource` deve ser consultado de volta na API para atualizar o espelhamento local

No projeto, isso ficou disponivel pelos metodos:

- `listOrders`
- `getOrderBillingInfo`
- `getPackFiscalDocuments`
- `getResource`

## Fluxo sugerido no backend

1. Vendedor autoriza a aplicacao pela URL de consentimento.
2. Backend troca `code` por `access_token` e `refresh_token`.
3. Credenciais sao persistidas em `ml_credentials`.
4. Antes de cada chamada autenticada, o backend valida `expires_at` e faz refresh se faltar menos de 30 minutos.
5. Webhooks `orders_v2` disparam a leitura do `resource` e a atualizacao de `ml_orders`.
6. Ao receber ou sincronizar um pedido, o backend consulta `billing_info` e `fiscal_documents` quando houver `pack_id`.

## Proximo passo recomendado

Implementar um servico de token persistido e um endpoint de webhook para:

- resolver `seller_id`
- garantir token valido
- consultar `resource`
- gravar ou atualizar `ml_orders`
- consultar faturamento e documentos fiscais
