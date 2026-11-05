# Painel administrativo mais organizado e responsivo

Hoje as 10 abas ficam numa faixa única (5 colunas no celular, 10 no desktop) com ícones sem texto no mobile — difícil saber onde clicar. A proposta reorganiza a navegação por grupos e melhora o comportamento em telas pequenas, sem mudar nenhuma regra de negócio.

## Navegação por seções

Agrupar as 10 áreas em 5 grupos:

- Operação: Pedidos, Horários
- Catálogo: Produtos, Categorias
- Entrega: Bairros, Motoboys
- Marketing: Cupons
- Gestão: Relatórios, LGPD, Configurações

Desktop (a partir de ~1024px): menu lateral fixo com os grupos e seus itens, área de conteúdo larga ao lado, cabeçalho mostrando o nome da seção atual.

Celular/tablet: cabeçalho compacto com o nome da seção e um seletor (menu suspenso agrupado) para trocar de área; nada de faixa de ícones espremida. Barra do topo continua fixa com voltar e sair.

## Ajustes de responsividade dentro das abas

- Tabelas e listas longas ganham rolagem horizontal controlada em vez de estourar a largura.
- Linhas com título + botões passam a usar o padrão duas colunas no celular (texto encolhe e corta com reticências, botões nunca somem).
- Formulários em uma coluna no celular e duas colunas a partir de tablet.
- Cartões de pedido: dados do cliente, valores e ações empilhados no celular.
- Largura útil do conteúdo aumenta no desktop (hoje limitada a 5xl).

## Detalhes técnicos

- `src/routes/admin.tsx`: substituir `Tabs`/`TabsList` por estado de seção controlado (`useState`) mantendo os mesmos componentes de conteúdo (`OrdersTab`, `ReportsTab`, etc.) intactos.
- Navegação em novo componente `src/components/admin/AdminNav.tsx` com a lista de seções (id, rótulo, ícone, grupo) num único array — fácil de editar/adicionar abas.
- Sidebar desktop com `hidden lg:block`; no mobile um `Select` (shadcn) agrupado por seção.
- Aplicar `grid-cols-[minmax(0,1fr)_auto]`, `min-w-0`, `shrink-0` e `truncate` nos cabeçalhos internos; `overflow-x-auto` nos blocos tabulares.
- Comentários em português, componentes pequenos; nenhuma alteração em consultas, RLS ou server functions.
- Verificação: typecheck/build e navegação com Playwright em 414px e 1280px por todas as seções.
