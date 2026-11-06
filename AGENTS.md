# 🤖 Contexto para Agentes de IA & Engenheiros (AGENTS.md)

Este documento foi projetado para que qualquer agente de IA (Cursor, Antigravity, Claude Code, Copilot, Aider) compreenda instantaneamente a arquitetura, o fluxo de dados e as regras do **NotifinanciaWeb_MVC** sem precisar varrer ou indexar todos os arquivos do repositório.

---

## 1. Visão Geral do Sistema
O **Notifinancia** é um web app financeiro para investidores pessoa física acompanharem suas ações e fundos imobiliários (FIIs) da B3.
- **Front-end**: React 19 (SPA) empacotado com Vite.
- **Back-end Serverless**: Python (FastAPI + Mangum) consultando Yahoo Finance via chart API (2 anos de histórico para proventos/meses pagos e 1 ano para DY).
- **Banco de Dados & Autenticação**: Supabase (PostgreSQL + Google OAuth).
- **Hospedagem & Orquestração**: Vercel (unifica a rota `/api/*` em Python com o SPA estático).

---

## 2. Mapa Rápido de Arquivos (Onde Alterar o Quê)

Ao receber uma tarefa, vá **diretamente** ao arquivo responsável:

| Responsabilidade | Arquivo Chave | O que faz |
|---|---|---|
| **Ponto de entrada React** | `src/main.jsx` & `src/App.jsx` | Roteamento (`react-router-dom`), AuthProvider e click listener global |
| **Página Principal** | `src/pages/Dashboard.jsx` | Orquestra abas da carteira e Radar, resumos, controles, cards, modais e Drawer |
| **Smart Hub / Radar** | `src/pages/Home.jsx` | Busca global por ticker, empresa e segmento; rota pública `/radar`, carregada sob demanda |
| **Oportunidades & Radar** | `src/components/RecommendedView.jsx` & `src/components/RadarSummary.jsx` | Exibe seleção diária de ações/FIIs, quadradinhos com popovers e navegação até os cards |
| **Card de Ativo Individual** | `src/components/AssetCard.jsx` | Exibe PM, Preço Atual, Variação, DY anual e detalhes recolhíveis de **Dividendos**, **Grid 12 meses rolantes** e **Bola de Neve** |
| **Painel de Resumo** | `src/components/PortfolioSummary.jsx` | Total investido, variação global, DY médio, tickers com popovers de PM, variação, DY e P/VP |
| **Abas da Carteira** | `src/components/PortfolioTabs.jsx` | Alterna entre carteira pessoal e oportunidades do Radar |
| **Adicionar Ativo (Drawer)** | `src/components/AddAssetDrawer.jsx` | Drawer fixo no rodapé, autocomplete por ticker/nome, botão "$ Atual", estimativas e validação; envia os dados de mercado disponíveis |
| **Adição Rápida** | `src/components/QuickAddModal.jsx` | Adiciona recomendação com preço sugerido, total aproximado, meta Bola de Neve e ajustes rápidos de quantidade |
| **Editar Ativo (Modal)** | `src/components/UpdateAssetModal.jsx` | Modal de ajuste de quantidade e PM com botões rápidos (+10, +100, etc.) |
| **Cabeçalho & Filtros** | `src/components/Header.jsx` | Marca com estado/ação de notificações, selects de ordenação e corretora e menu do usuário |
| **Estado Global da Carteira** | `src/hooks/useAssets.js` | **Single Source of Truth**: CRUD, SWR, preferências e carteira local persistida para visitantes |
| **Recomendações** | `src/hooks/useRecommendedAssets.js` & `src/utils/opportunity-screener.js` | Cache local → Supabase → API; ranqueia e diversifica 5 ações e 5 FIIs |
| **Universo Elegível** | `src/utils/eligible-universe.js` | Lista pré-selecionada de tickers para o screener do Radar |
| **Autenticação** | `src/context/AuthContext.jsx` | Sessão Supabase, Google OAuth com `prompt: 'select_account'` |
| **Serviço de Dados (Assets)** | `src/services/asset-service.js` | Chamadas ao Supabase (`assets`) e chamadas à API Python (`/api/market-data`) |
| **API Python (Back-end)** | `api/index.py`, `api/schemas.py` & `api/services/marketService.py` | FastAPI com schemas Pydantic; consulta Yahoo Finance para cotação/DY/proventos e Fundamentus para P/VP |
| **Dicionário de Tickers B3** | `src/utils/ticker-dictionary.js` & `src/utils/ticker-data.js` | Busca instantânea offline por ticker, nome completo e segmento (ações, FIIs e Fiagros) |
| **Segmentos & Áreas de Atuação** | `src/utils/segment-icon.js` | Mapeamento de ~200 segmentos em 18 macro-áreas com ícones e explicações operacionais |
| **Configuração de Corretoras** | `src/utils/brokers.js` | Cores, links diretos para Play Store/Web e identidade visual de cada broker |
| **Estilos Globais e Cards** | `src/styles/cards.css` & `src/styles/style.css` | Cores dinâmicas de rentabilidade, grade responsiva, impressão em densidade máxima (3 cards por linha), tamanhos responsivos dos controles, `.month-box` e `.asset-card` |

---

## 3. Fluxo de Dados e Ciclo de Vida (Data Flow)

```
[ Usuário abre a página ]
       │
       ▼
useAssets() hook é montado
       ├── Visitante: lê carteira, ordenação e corretora do localStorage
       └── Autenticado:
           ├── 1. Lê 'profiles' no Supabase (ordenação salva, corretora favorita, alertas)
           ├── 2. Lê 'assets' no Supabase -> Dados aparecem INSTANTANEAMENTE via cache (cached_price, cached_change, cached_yield, cached_pvp, cached_paid_months)
           └── 3. Dispara SWR em segundo plano:
                 GET /api/market-data?tickers=PETR4.SA,MXRF11.SA
                         │
                         ▼ (Python FastAPI via Yahoo Finance)
                 Retorna { results: { "PETR4.SA": { price, changePercent, yieldpct, priceToBook, paidMonths } } }
                         │
                         ▼
                 asset.enrich(marketData) atualiza o estado React
                 e salva cache no Supabase (preço, variação, DY, P/VP e meses pagos)
```

`AssetService.getAssets()` aplica esses campos cacheados antes da consulta de mercado. `saveCacheBackground()` persiste o resultado após o SWR em lote e após o refresh individual. O campo `cached_pvp` precisa existir na tabela `assets` do Supabase; se o schema remoto ainda não tiver a coluna, é necessário adicioná-la para que a gravação funcione.

As oportunidades seguem fluxo independente: `useRecommendedAssets()` tenta localStorage, depois `recommended_cache` no Supabase e só então consulta `/api/market-data` para o universo elegível. O cache público deve usar `category` (não `sector`) para armazenar o setor; o mapeamento de leitura também aceita `sector` legado. O screener retorna 5 ações e 5 FIIs diversificados. Se o schema da tabela ou a chave única (`ticker`) diferirem, alinhar a tabela/upsert antes de publicar.

---

## 4. Regras Críticas para Qualquer Agente (Não Quebre Isto!)

1. **Como rodar localmente**:
   - ❌ NUNCA rode apenas `npm run dev` se precisar testar cotações em tempo real: o Vite puro não roteia `/api/market-data` para o Python.
   - ✅ SEMPRE execute **`vercel dev`** (que sobe na porta `3000` o Vite + Python integrados via proxy reverso).
2. **Bibliotecas CSS/JS Globais**:
   - Bootstrap 5.3 e SweetAlert2 são carregados via CDN no `index.html`.
   - ❌ NÃO instale pacotes npm do Bootstrap JS ou tente importar modais via npm. Use `window.Swal` ou `useState` nativo do React.
3. **Instalação de Pacotes NPM**:
   - No ambiente Windows do usuário, a rede exige a flag `--strict-ssl=false` em comandos `npm install` caso haja bloqueio de certificado.
4. **Modo Visitante (Guest Mode)**:
   - Quando `!isAuthenticated`, a carteira e as preferências de ordenação/corretora usam `notifinancia_guest_assets`, `notifinancia_guest_sort` e `notifinancia_guest_broker` no localStorage; não há ativos simulados fixos.
   - Adições rápidas no Radar e pelo Drawer alteram somente a carteira local do visitante; os dados Supabase autenticados não são mesclados com esse cache.
5. **Legado Vanilla removido (Sessão 4)**:
   - Os 18 arquivos isolados listados em `docs/REACT_MIGRATION_PLAN.md` foram removidos. Não recriar os entry points Vanilla (`src/main.js` e `public/index.html`).
   - ⚠️ **NÃO remover `src/models/asset.js`**: `src/services/asset-service.js` depende da classe `Asset` para cálculo de P/VP, enriquecimento de dados e cache SWR.
   - O frontend atual inicia por `src/main.jsx` e `index.html`.

---

## 5. Regras de Negócio Específicas
- **Bola de Neve (Magic Number)**: `rendaMensalPorCota = (currentPrice * (yieldPct / 100)) / 12`. Cotas necessárias: `Math.ceil(currentPrice / rendaMensalPorCota)` (ou de forma direta `Math.ceil(1200 / yieldPct)`). **Nunca** deve variar em função da quantidade de cotas que o investidor possui.
- **Validação de Ticker Duplicado**: Não permitir cadastrar o mesmo ticker mais de uma vez na carteira (`existingTickers.some(...)`). O usuário deve editar a quantidade existente.
- **Identificação de FIIs**: usar `asset.type` ou `TICKER_DATA[ticker limpo].type`; não classificar pelo sufixo `11`, pois Units como `TAEE11` e `SANB11` são ações.
- **DARF em Exclusão**: FIIs vendidos com lucro apurado têm retenção de 20% de IR via DARF (código 6015). Identificar FIIs pelos metadados do ativo, não pelo sufixo do ticker; o SweetAlert2 orienta sobre a data limite antes de confirmar a exclusão.
- **Corretoras**: Links nos cards devem priorizar `brokerInfo.appUrl` (Play Store/Mobile) em relação ao link web.
- **Cache P/VP**: `cached_pvp` é cache de fallback no Supabase. O P/VP calculado por `currentPrice / vpa` tem precedência quando ambos estão disponíveis; caso contrário, usa o cache de mercado salvo em `priceToBook`.
- **Busca de ativos**: `src/utils/ticker-data.js` é a fonte única de ticker, nome, segmento e tipo; `src/utils/ticker-dictionary.js` deriva a lista de suas chaves e centraliza a busca sem diferenciar caixa ou acentos por ticker, nome e segmento. O Drawer usa essa busca; o Radar lista recomendações e não mantém uma busca própria concorrente.
- **Segmentos & Pop-ups Informativos**: Ícones e descrições do modelo de negócio são obtidos por `getSegmentDetails` em `src/utils/segment-icon.js`. A explicação de P/VP em `AssetCard` usa SweetAlert2 centralizado; os demais popovers devem permanecer responsivos em telas pequenas.
- **Cache do Radar**: gravar a coluna `category` em `recommended_cache`; ao ler, mapear `category` ou legado `sector` para `sector` no modelo da aplicação. Preservar os campos de mercado usados pelo Radar (preço, DY, P/VP, variação e meses pagos).

---

## 6. Estado Atual & Próximas Tarefas
- **Prompt de IA (`PromptView.jsx`)**: portado e enriquecido com snapshot compacto da carteira, análise mensal baseada em notícias e fatores macro/micro, recomendação fundamentada de aporte e acesso ao Gemini. O botão `IA` nos controles rola até o prompt; `Pergunte ao Gemini` fica abaixo do prompt.
- **Oportunidades & Radar**: `RadarSummary` exibe grupos de tickers com popovers e navegação para os cards; `RecommendedView` permite recolher grupos de ações/FIIs. A adição rápida usa o preço atual sugerido e mantém o visitante na simulação local.
- **Notificações**: a marca no cabeçalho abre o gerenciamento/convite de relatórios; visitantes sempre veem o estado desativado. A explicação de ativação e desativação é padronizada.
- **P/VP**: o ícone de informação nos cards abre SweetAlert2 no centro da tela, com faixas interpretativas específicas para ações e FIIs.
- **Visualização da carteira**: controles de impressão e densidade implementados; impressão força três cards por linha. No celular, a grade permite até duas colunas.
- **Dividendos nos cards**: Yield anual sempre visível; detalhes recolhíveis sincronizam a abertura entre os ativos e permanecem abertos ao clicar no conteúdo. Cabeçalho mantém informação à esquerda, Yield central e seta à direita. Rendas mensal/anual são separadas por borda; projeções mostram somente `+ X cotas`.
- **Legado**: remoção dos 18 arquivos Vanilla isolados concluída. `src/models/asset.js` permanece compartilhado e necessário.
- **Próximas prioridades**: validar em preview/produção os fluxos que dependem de OAuth, Supabase, schema de `recommended_cache` e API serverless; conferir carteira visitante e atualização de dados de mercado ponta a ponta.
