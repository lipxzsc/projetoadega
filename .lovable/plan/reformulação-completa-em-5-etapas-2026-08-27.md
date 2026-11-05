# Reformulação completa — em 5 etapas

Objetivo: visual mais lúdico e vivo, catálogo por seções de categoria, montador de combo flexível, admin organizado por seções e novos módulos (cupons, clientes, horários, atendimento).

## Etapa 1 — Design lúdico + catálogo por seções
- Nova paleta escura, porém viva: âmbar quente + acentos em verde-menta e coral, gradientes suaves, cantos arredondados, micro-animações (hover, entrada de cards, pulse no carrinho).
- Home reorganizada: banner de boas-vindas, faixa de categorias com ícones coloridos e, abaixo, **uma seção por categoria** (título + ícone + carrossel/grade dos produtos daquela categoria), em vez da grade única.
- Estado vazio, esqueleto de carregamento e responsividade mobile/desktop revisados.

## Etapa 2 — "Monte seu combo" com quantidades
- Fluxo próprio de montagem: escolher quantidades de **destilados**, **energéticos/refrigerantes**, **gelos** (normal 3kg / saborizados) e **copos descartáveis 300/500/750ml**.
- Cada linha com seletor de quantidade (− / +), preço parcial e total do combo ao vivo.
- Novos tipos de categoria: `soft_drink` (refrigerante) e `cups` (copos) além de `distilled`, `energy_drink`, `ice`, `food`.
- Preço recalculado no servidor no checkout (nada confiado no cliente).

## Etapa 3 — Admin por seções
Reorganizar `/admin` em grupos com navegação lateral (desktop) / seleção (mobile):
- **Operação**: Pedidos, Motoboys (cadastro e descadastro/inativação), Horários de atendimento (abre/fecha por dia + fechamento manual).
- **Catálogo**: Produtos, Categorias.
- **Entrega**: Bairros e taxas manuais.
- **Marketing**: Cupons/ofertas/créditos.
- **Relacionamento**: Clientes (frequência de pedidos).
- **Config**: dados da loja.

## Etapa 4 — Cupons, clientes e horários (banco + telas)
- Tabela `coupons`: código, tipo (percentual, valor fixo, frete grátis, crédito), valor, pedido mínimo, validade, limite de uso, ativo.
- Tabela `customers` (agregada por telefone): nome, total de pedidos, total gasto, último pedido, créditos acumulados — alimentada por gatilho ao criar pedido.
- Tabela `store_hours`: horário de abertura/fechamento por dia da semana; loja abre/fecha automaticamente respeitando o botão manual.
- Checkout ganha campo de cupom validado **no servidor** (nunca no cliente).
- Aba Clientes com ranking de assiduidade e sugestão de recompensa.

## Etapa 5 — Atendimento ao cliente (chat)
- Widget de atendimento com escolha: **conversar aqui no site** ou **ir para o WhatsApp**.
- Chat no site: tabela `support_messages` ligada ao pedido/telefone, atualização em tempo real; aba "Atendimento" no admin para responder.
- Regras de acesso: cliente só enxerga a própria conversa (via token do pedido), admin enxerga todas.

## Notas técnicas
- Todo código comentado em português, componentes pequenos e reutilizáveis.
- Segurança: RLS em todas as tabelas novas + GRANTs explícitos; validação com zod e recálculo de valores em server functions; cupons e créditos validados apenas no servidor; nenhum dado pessoal exposto à API pública.
- Cada etapa termina com typecheck e teste de navegação antes de seguir.
