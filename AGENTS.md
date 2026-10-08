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
| **Página Principal** | `src/pages/Dashboard.jsx` | Orquestra Header, Resumo da Carteira, Grid de Cards, Modais e Drawer |
| **Card de Ativo Individual** | `src/components/AssetCard.jsx` | Exibe PM, Preço Atual, Variação, **Dividendos**, **Grid 12 meses rolantes** e **Bola de Neve** |
| **Painel de Resumo** | `src/components/PortfolioSummary.jsx` | Total investido, variação global, DY médio, grid de tickers com popovers |
| **Adicionar Ativo (Drawer)** | `src/components/AddAssetDrawer.jsx` | Drawer deslizante, autocomplete de tickers B3, botão "$ Atual" e validação |
| **Editar Ativo (Modal)** | `src/components/UpdateAssetModal.jsx` | Modal de ajuste de quantidade e PM com botões rápidos (+10, +100, etc.) |
| **Cabeçalho & Filtros** | `src/components/Header.jsx` | Logo, select de ordenação, select de corretora, sino (balão 18h) e menu de usuário |
| **Estado Global da Carteira** | `src/hooks/useAssets.js` | **Single Source of Truth**: SWR, CRUD (add, update, delete, refresh), filtros e perfil |
| **Autenticação** | `src/context/AuthContext.jsx` | Sessão Supabase, Google OAuth com `prompt: 'select_account'` |
| **Serviço de Dados (Assets)** | `src/services/asset-service.js` | Chamadas ao Supabase (`assets`) e chamadas à API Python (`/api/market-data`) |
| **API Python (Back-end)** | `api/index.py` & `api/services/marketService.py` | FastAPI scraping Yahoo Finance: cotação, DY anual e array `paidMonths` |
| **Dicionário de Tickers B3** | `src/utils/ticker-dictionary.js` | Lista estática de ações e FIIs da B3 para sugestões instantâneas no front |
| **Configuração de Corretoras** | `src/utils/brokers.js` | Cores, links diretos para Play Store/Web e identidade visual de cada broker |
| **Estilos Globais e Cards** | `src/styles/cards.css` & `src/styles/style.css` | Cores dinâmicas de rentabilidade, `.month-box`, `.dy-info-popover`, `.asset-card` |

---

## 3. Fluxo de Dados e Ciclo de Vida (Data Flow)

```
[ Usuário abre a página ]
       │
       ▼
useAssets() hook é montado
       ├── 1. Lê 'profiles' no Supabase (ordenação salva, corretora favorita, alertas)
       ├── 2. Lê 'assets' no Supabase -> Dados aparecem INSTANTANEAMENTE via cache (cached_price, cached_yield, cached_paid_months)
       └── 3. Dispara SWR em segundo plano:
                 GET /api/market-data?tickers=PETR4.SA,MXRF11.SA
                         │
                         ▼ (Python FastAPI via Yahoo Finance)
                 Retorna { results: { "PETR4.SA": { price, changePercent, yieldpct, paidMonths } } }
                         │
                         ▼
                 asset.enrich(marketData) atualiza o estado React
                 e salva cache silencioso no Supabase (saveCacheBackground)
```

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
   - Quando `!isAuthenticated`, `useAssets` injeta ativos simulados (`MXRF11`, `PETR4`, `KLBN4`). O app deve continuar navegável e responsivo sem quebrar para visitantes.
5. **Legado em Migração (Strangler Fig Pattern)**:
   - A pasta `src/controllers/` e `src/views/` pertence ao antigo MVC Vanilla.
   - As novas implementações vivem estritamente em `src/components/`, `src/pages/` e `src/hooks/`.
   - Não crie novas dependências com as views antigas.

---

## 5. Regras de Negócio Específicas
- **Bola de Neve (Magic Number)**: `rendaMensalPorCota = (currentPrice * (yieldPct / 100)) / 12`. Cotas necessárias: `Math.ceil(currentPrice / rendaMensalPorCota)` (ou de forma direta `Math.ceil(1200 / yieldPct)`). **Nunca** deve variar em função da quantidade de cotas que o investidor possui.
- **Validação de Ticker Duplicado**: Não permitir cadastrar o mesmo ticker mais de uma vez na carteira (`existingTickers.some(...)`). O usuário deve editar a quantidade existente.
- **DARF em Exclusão**: FIIs (ticker terminado em `11`) vendidos com lucro apurado têm retenção de 20% de IR via DARF (código 6015). O SweetAlert2 deve orientar o usuário sobre a data limite do DARF antes de confirmar a exclusão.
- **Corretoras**: Links nos cards devem priorizar `brokerInfo.appUrl` (Play Store/Mobile) em relação ao link web.

---

## 6. Backlog de Features (Próximas Tarefas)
1. **Gerador de Smart Prompt & Link Gemini (`PromptView.jsx`)**: Portar o gerador de análise por IA com snapshot instantâneo da carteira e link direto de envio para o Google Gemini e ChatGPT.
2. **Barra de Zoom Nativa (Mobile UX)**: Controle deslizante/toggle na interface móvel para compactar o layout de cards em grade de 2 colunas, permitindo ao usuário ver múltiplos ativos sem scroll excessivo.
3. **Modo de Impressão e Compartilhamento**: Estilos `@media print` e gerador de cartão/PDF limpo da carteira para envio em redes sociais ou arquivamento pessoal.
