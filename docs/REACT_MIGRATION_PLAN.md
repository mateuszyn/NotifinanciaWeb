# Plano de Migração: Vanilla JS (MVC) → React

> Branch de trabalho: `feature/react-migration`  
> Produção atual: `main` (Vanilla JS — estável e intacto)  
> Estratégia adotada: **Strangler Fig** — construção incremental lado a lado, sem quebrar a produção.

---

## Arquitetura: Separação Front ↔ Back

### Como está configurado

O projeto segue a arquitetura de um **SPA + Serverless Functions**, que é exatamente o modelo nativo da Vercel:

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (Host)                        │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │   React (Vite SPA)  │    │  Python (FastAPI/Mangum) │  │
│  │  src/  ──→ dist/    │    │       api/index.py       │  │
│  │                     │    │  GET /api/market-data    │  │
│  │  Renderiza no       │    │  GET /api/ping           │  │
│  │  navegador do       │    │                          │  │
│  │  usuário (Client)   │    │  Roda como Lambda        │  │
│  └─────────┬───────────┘    └──────────────┬───────────┘  │
│            │ fetch('/api/market-data')       │             │
│            └────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               │         Supabase             │
               │  Banco de Dados (Postgres)   │
               │  Auth (Google OAuth)         │
               └─────────────────────────────┘
```

**O React nunca fala com a API Python diretamente por importação.** Ele faz requisições HTTP normais (`fetch('/api/...')`) como qualquer cliente web faria. A API Python vive em `api/index.py` e é deployada como uma **Serverless Function** separada na Vercel.

### Por que o `vercel dev` é necessário localmente

Quando você roda apenas `npm run dev` (Vite), o servidor de desenvolvimento **só conhece os arquivos React**. Qualquer chamada para `/api/market-data` retorna `404` porque o Vite não tem roteador para o Python.

O `vercel dev` é um orquestrador local que simula o ambiente da Vercel:
- Sobe o **Vite** na mesma instância
- Sobe o **servidor Python FastAPI** em paralelo
- Cria um **proxy reverso** que redireciona `/api/*` → Python e tudo mais → React

Isso é idêntico ao que acontece em produção na Vercel. Logo, **a separação está exatamente conforme os planos**: o React e o Python são dois serviços independentes que se comunicam via HTTP. Nenhum acopla o código do outro. O front-end pode ser deployado sem tocar no back-end, e vice-versa.

> **Para testar localmente com a API:** use sempre `vercel dev` em vez de `npm run dev`.

---

## ✅ Sessão 1 — Concluído (24/09/2026)

### Infraestrutura & Configuração
- [x] Criação da branch `feature/react-migration`
- [x] Instalação de `react`, `react-dom`, `react-router-dom`
- [x] Instalação e configuração do `@vitejs/plugin-react`
- [x] Criação do `vite.config.js` com suporte a JSX
- [x] Atualização do `index.html` para carregar `main.jsx` (a "Chave Geral")

### Camada de Autenticação
- [x] `src/context/AuthContext.jsx` — Provider global com `session`, `user`, `isAuthenticated`, `signInWithGoogle` (com `prompt: 'select_account'`), `signOut`

### Camada de Lógica (Hooks)
- [x] `src/hooks/useAssets.js` — Custom Hook com:
  - Dados demo para modo visitante (Guest Mode)
  - Fetch real de ativos do Supabase
  - Carregamento do perfil do usuário (sort, broker, notificações)
  - SWR: revalidação de preços em background
  - `handleSortChange` — ordena e persiste no banco
  - `handleBrokerChange` — troca corretora e persiste no banco
  - `handleToggleNotif` — ativa/desativa e persiste no banco
  - Função `sortAssets` portada do `AssetController`

### Componentes de UI
- [x] `src/components/Header.jsx` — Logo, sort select, broker select colorido, sino com **balão popover mobile**, menu do usuário com avatar e fallback, botão "Entrar", botão "Trocar conta"
- [x] `src/components/Footer.jsx` — Texto SEO + links de navegação React (`<Link>`) para Termos, Privacidade e Contato
- [x] `src/components/LoginModal.jsx` — Modal Bootstrap controlado por React (`useRef`), abre automaticamente para visitantes via `useEffect`
- [x] `src/components/PortfolioSummary.jsx` — Painel consolidado com Patrimônio, Variação Global, DY Anual, DY Mensal, grid de tickers com popovers
- [x] `src/components/AssetCard.jsx` — Card de ativo com bordas coloridas por variação PM/Dia, P.M., Preço Atual, Total, link Play Store da corretora

### Páginas
- [x] `src/pages/Dashboard.jsx` — Orquestra Header + PortfolioSummary + AssetCard com skeleton loading
- [x] `src/pages/Termos.jsx` — Conteúdo real migrado + botão Voltar com `useNavigate`
- [x] `src/pages/Privacidade.jsx` — Conteúdo real migrado + botão Voltar com `useNavigate`
- [x] `src/pages/Contato.jsx` — Formulário Formspree com e-mail pré-preenchido e bloqueado para usuários logados

### Roteamento & App Shell
- [x] `src/App.jsx` — `BrowserRouter` + `Routes` + `AuthProvider` + efeito global de fechar `<details>` ao clicar fora
- [x] `src/main.jsx` — Ponto de entrada do React

### Documentação
- [x] `docs/REACT_MIGRATION_PLAN.md` — Este arquivo
- [x] `README.md` — Badge de migração + stack React na seção de tecnologias + destaque de Migração Arquitetural na seção para recrutadores

---

## ✅ Sessão 2 — CRUD de Ativos (Concluído em 01/10/2026)

### Componentes Criados
- [x] `src/components/AddAssetDrawer.jsx` — Gaveta inferior "+ NOVO ATIVO" com formulário controlado
  - Autocomplete de tickers via `TickerDictionary` (offline, sem latência)
  - Botão "$ Atual": busca o preço de mercado via API Python e preenche o campo
  - **Cache de validação** (`validatedTickers Set`): se o preço já foi buscado, o submit **não refaz a chamada** de validação, economizando ~5s de espera
  - Simulador da Bola de Neve inline: calcula quantas cotas comprar para gerar R$ 1/mês de renda
  - Após salvar, dispara `refreshSingleAsset` para atualizar o preço do novo ativo na tela sem reload
  - **Ordem dos campos:** P. Médio → Quantidade (P.M. primeiro facilita o fluxo "busco o preço → defino quantas cotas comprei")
- [x] `src/components/UpdateAssetModal.jsx` — Modal de edição de quantidade e preço médio
  - Botões quick +/- de quantidade (1, 10, 100) e preço (0.01, 0.10, 1.00)
  - Formulário controlado com `useState`, fecha ao salvar
- [x] Botões de ação no `AssetCard.jsx` (visíveis apenas para usuários autenticados):
  - ✏️ Editar → abre `UpdateAssetModal` com dados pré-preenchidos
  - 🗑️ Excluir → SweetAlert2 com 3 cenários: FII com lucro (alerta de DARF 20% + prazo), FII com prejuízo (orientação de compensação), outros ativos (confirmação simples)
  - 🔄 Tentar novamente → chama `refreshSingleAsset` para reatualizar o preço de um ativo com erro

### Lógica Migrada do AssetController (God Controller → Hooks)
- [x] `onCreateSubmit` → `addAsset()` em `useAssets.js` + validação em `AddAssetDrawer`
- [x] `onUpdateSubmit` → `updateAsset()` em `useAssets.js` + UI em `UpdateAssetModal`
- [x] `onDeleteAsset` → `deleteAsset()` em `useAssets.js` + lógica DARF em `Dashboard.jsx`
- [x] `onRetrySingleAsset` → `refreshSingleAsset()` em `useAssets.js`
- [x] `onFetchCurrentPrice` → `fetchCurrentPrice()` em `AddAssetDrawer.jsx`

### Bugs & Refinamentos Resolvidos nesta Sessão
- [x] Corrigido `addAsset` que não estava desestruturado em `Dashboard.jsx` (tela branca)
- [x] Corrigido `getPrice()` no `AssetService` para suportar response como Object ou Array da API Python
- [x] Eliminado double-fetch de validação (1ª busca = preço + validação implícita; submit = só salva)
- [x] Texto "Adicionar conta" → "Trocar conta" no menu do usuário no `Header.jsx`

---

## 🟡 Sessão 3 — Área de Dividendos & Bola de Neve no AssetCard (Em Andamento)

Esta é a sessão de maior valor percebido pelo usuário final: revelar os dados de renda passiva de cada ativo.

### Componentes Concluídos nesta Sessão (08/10/2026)
- [x] `src/components/AssetCard.jsx` — Seção completa de Dividendos & Bola de Neve:
  - Box de Renda Mensal e Renda Anual (com projeção de cotas compradas: `+ X cota(s)/mês` e `+ Y cota(s)/ano`)
  - Grid dinâmico dos 12 meses rolantes retroativos com indicador de virada de ano e tooltips customizados
  - Popover explicativo do DY (`dy-info-wrapper` e `dy-info-popover`)
  - Mensagem de status e cor da Bola de Neve (`[v] Bola de Neve!` ou `[+] X cotas para a Bola de Neve`)
  - Tratamento de erro (`dataError` e yield zerado com botão de tentar novamente via `onRetry`)
- [x] `src/components/PortfolioSummary.jsx` — Refinamento do Painel da Carteira:
  - Exibição de **Patrimônio Investido** (`currentValue - profit`) como valor secundário abaixo de Patrimônio Atual
  - **DY aprox. anual**: valor em R$ como principal, porcentagem anual da carteira como secundário (`% ao ano`) e popover explicativo
  - **DY aprox. mensal**: valor em R$ como principal, porcentagem mensal média como secundário (`% ao mês`) e popover de **não garantia de rendimentos futuros**
- [x] `AGENTS.md` — Criação do guia universal de arquitetura para agentes de IA (mapa de arquivos, fluxo de dados SWR e regras críticas)
- [x] **Correção da Bola de Neve**: desacoplado o cálculo de `rendaMensalPorCota` da quantidade de cotas na carteira (`currentPrice * (yieldPct / 100) / 12`), garantindo que o Magic Number permaneça matematicamente constante independente do usuário editar sua quantidade de cotas.
- [x] **Bloqueio de Ativo Duplicado**: adicionada validação no `AddAssetDrawer.jsx` impedindo o cadastro do mesmo ticker mais de uma vez na carteira.
- [x] **Recálculo Otimista**: `updateAsset` no `useAssets.js` agora recalcula `divAnual`, `divMensal` e `totalValue` imediatamente ao editar a quantidade.

### Próximos Passos (Sessão 3.1 & Novas Features de UX)
- [ ] `src/components/PromptView.jsx` — Gerador de Smart Prompt para IA com snapshot da carteira e link direto de envio para o Google Gemini / ChatGPT
- [ ] **Barra de Zoom Nativa (Mobile UX)**: controle deslizante ou toggle para ajustar a densidade dos cards em telas móveis, permitindo ver múltiplos ativos em grade compacta (2 colunas) em vez de 1 por 1
- [ ] **Função de Compartilhamento & Impressão**: exportação da carteira formatada para impressão (PDF limpo) e geração de card/resumo compartilhável
- [ ] Animação `bell-animating` no sino ao alternar notificações (refinamento visual)

### Arquivos Modificados
- [x] `src/components/AssetCard.jsx` — Seção de Dividendos + Bola de Neve + 12 meses rolantes
- [x] `src/components/PortfolioSummary.jsx` — Métricas de DY anual/mensal e patrimônio investido
- [x] `src/components/AddAssetDrawer.jsx` — Bloqueio de duplicados
- [x] `src/hooks/useAssets.js` — Recálculo otimista de dividendos
- [x] `src/pages/Dashboard.jsx` — Passagem de `existingTickers`
- [x] `AGENTS.md` — Arquivo de contexto e arquitetura para IAs
- [ ] `src/components/PromptView.jsx` — Criar do zero e plugar no `Dashboard.jsx`

---

## 🔲 Sessão 4 — Limpeza Final & Merge

### Remoção de Arquivos Legados
- [ ] `src/main.js` — Substituído por `src/main.jsx`
- [ ] `src/controllers/asset-controller.js` — Substituído por `src/hooks/useAssets.js`
- [ ] `src/views/` (pasta inteira) — Substituída por `src/components/` e `src/pages/`
- [ ] Remover `src/models/` se não houver mais dependências diretas

### Deploy & Validação Final
- [ ] Testar Preview Deploy na Vercel (URL temporária da branch)
- [ ] Validar Auth Google em produção (OAuth redirect)
- [ ] Validar CRUD completo no ambiente de Preview (requer `vercel dev` localmente)
- [ ] Merge da `feature/react-migration` → `main`
- [ ] Deploy em produção sem downtime

---

## Decisões Técnicas Registradas

| Decisão | Escolha | Motivo |
|---|---|---|
| CSS Framework | Bootstrap (mantido) | Reaproveitar visual existente; foco na lógica React |
| Roteamento | History API (`BrowserRouter`) | URLs limpas; Vercel suporta nativamente |
| Estado Global | Context API | Supabase Auth é simples o suficiente; sem necessidade de Redux |
| Fetch/Cache | SWR manual no hook | Padrão já existia no Vanilla; portado de forma limpa |
| Formulário de Contato | Formspree (mantido) | Funciona sem back-end adicional |
| Validação de Ticker | Cache em Set local | Evita double-fetch: "$ Atual" já valida implicitamente; submit só salva |
| Magic Number Bola de Neve | Independente da quantidade | `Math.ceil(1200 / yieldPct)` reflete o ativo no mercado, não a posse do investidor |
| Dev local com API | `vercel dev` obrigatório | Único orquestrador que sobe Vite + Python + proxy `/api/*` juntos |
