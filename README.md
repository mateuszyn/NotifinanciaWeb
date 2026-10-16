# 📈 Notifinancia

> **Gestão Inteligente de Dividendos e Acompanhamento de Carteira B3**

O **Notifinancia** é um web app financeiro para investidores pessoa física acompanharem ações e Fundos Imobiliários (FIIs) da B3. Inspirado na metodologia Barsi de investimento focado em dividendos, o sistema oferece cotações em tempo real, cálculo automático de preço médio, simulador da Bola de Neve, análise via IA e relatórios diários automatizados por e-mail.

> 🚀 **Front-end 100% migrado para React 19 + Vite.** A base legado Vanilla MVC foi totalmente descontinuada e removida. O sistema agora conta com arquitetura modular baseada em Componentes, Context API e Custom Hooks, com renderização fluida, Container Queries e integração direta com o Google Gemini.

---

## 💡 Destaques Técnicos (Visão para Recrutadores)

Este projeto foi construído com foco em **performance, resiliência e UX**, resolvendo desafios reais de engenharia de software:

- **Migração Arquitetural Completa (React 19):** Portado de um monólito MVC Vanilla JS para um SPA moderno em React 19 com Vite, aplicando o padrão *Strangler Fig* — o sistema permaneceu em produção durante toda a transição. Resultou na eliminação de 18 arquivos legados, incluindo controllers, views e serviços da camada antiga. A lógica do *God Controller* foi distribuída em Custom Hooks (`useAssets`) e componentes atômicos.
- **Arquitetura Serverless Híbrida:** SPA React integrado a um back-end Python (FastAPI + Mangum) via Serverless Functions da Vercel. Elimina problemas de CORS, garante escalabilidade automática e isola completamente o front-end do back-end — cada camada pode ser deployada de forma independente.
- **Design Fluido com Container Queries:** Cards de ativos que escalam tipografia, badges e espaçamentos dinamicamente via unidades `cqi` conforme a largura individual de cada card, garantindo legibilidade perfeita em qualquer densidade — de 1 coluna no mobile até 3 colunas no print.
- **Resiliência no Web Scraping:** Mecanismos de *fallback* e cálculos de proventos via Yahoo Finance Chart API para contornar variações de disponibilidade da B3.
- **Integração com IA (Smart Prompt & Google Gemini):** O sistema compila um snapshot financeiro da carteira (ativos, preço médio, variação diária, status da Bola de Neve) e gera um prompt formatado sob a metodologia Barsi para análise tática instantânea com atalho direto para o Google Gemini.
- **CRON Jobs e Mensageria:** *Edge Functions* (Deno/Supabase) varrem o banco, compilam o fechamento de mercado e disparam relatórios transacionais via Resend API.
- **Guest Mode:** Visitantes não autenticados visualizam ativos simulados com dados reais de mercado, tornando o app totalmente navegável sem cadastro.

---

## 🛠️ Tecnologias Utilizadas

**Front-end:**
- **React 19** + **Vite**
- **React Router DOM** — History API com rotas limpas (`/termos`, `/privacidade`, `/contato`)
- **Context API** — Gerenciamento de sessão global e Google OAuth
- **Custom Hooks** — `useAssets` como Single Source of Truth com ciclo SWR manual
- **CSS3 Moderno** — Bootstrap 5.3 (CDN), Container Queries, Flexbox/Grid, `@media print`
- **SweetAlert2** (CDN) — Alertas interativos (DARF, confirmações, onboarding)

**Back-end & API:**
- **Python 3.12** — versão fixada para compatibilidade com o runtime UV da Vercel
- **FastAPI** + **Mangum** — handler serverless para o runtime da Vercel
- **Vercel Serverless Functions** — rotas `/api/market-data` e `/api/ping`
- **`requests`** + Yahoo Finance Chart API — cotações e histórico de proventos (B3)

**Banco de Dados, Autenticação & Automação:**
- **Supabase** — PostgreSQL com Row Level Security
- **Supabase Auth** — OAuth Google com `prompt: 'select_account'`
- **Supabase Edge Functions** (Deno) — CRON de e-mails de fechamento de mercado
- **Resend API** — Disparo de e-mails transacionais

---

## ✅ Funcionalidades Implementadas

**Carteira & Ativos**
- CRUD completo de ativos da B3 (ações e FIIs) com validação de ticker duplicado
- Cotações e variação diária em tempo real via Yahoo Finance
- Cálculo de rentabilidade por preço médio (P.M.) e variação global da carteira
- Histórico de dividendos dos últimos 12 meses rolantes por ativo
- Dividend Yield anual e mensal (projeção estimada, com disclaimer)
- Simulador da **Bola de Neve**: quantas cotas comprar para que os dividendos paguem uma nova cota por mês — cálculo desacoplado da quantidade atual do investidor

**Painel Consolidado (Raio-X)**
- Patrimônio atual, valor investido, variação global e DY anual/mensal da carteira
- Grade de quadradinhos de tickers: **toque/clique** para rolar suavemente até o card do ativo com destaque visual; **pressione e segure** (ou passe o cursor no desktop) para ver o balão com P.M. e variação de hoje
- Alerta automático de DARF ao excluir FII com lucro (código 6015, prazo e tutorial)

**Autenticação & Perfil**
- Login sem senha via Google OAuth (`prompt: 'select_account'`)
- Persistência de preferências: ordenação, corretora favorita e notificações por e-mail
- Guest Mode: ativos simulados para visitantes sem cadastro

**UX & Visualização**
- Detalhes de dividendos recolhíveis com abertura/fechamento sincronizados entre todos os cards
- Controle de densidade dos cards (1 a 3 colunas no desktop, até 2 no mobile) com Container Queries
- Impressão/exportação da carteira: grade fixa de 3 cards por linha em layout limpo, independente da densidade da tela
- Gaveta inferior compacta para cadastro de novos ativos com autocomplete de tickers da B3 (offline, sem latência)
- Tipografia e ações dos cards redimensionadas conforme a largura individual do card
- Smart Prompt de IA com snapshot da carteira e metodologia Barsi; botão `IA` nos controles rola até o prompt; link direto para o Google Gemini logo abaixo

**Automação & Relatórios**
- Relatório diário de fechamento de mercado por e-mail via Supabase Edge Functions + Resend API
- Sino de notificações no header com controle de ativação

---

## 🗺️ Roadmap

### 🔜 Em Aberto — Próximas Prioridades

- [ ] **Monetização (AdSense):** Injeção do bloco de Ads/parceiros para faturamento institucional
- [ ] **Radar de Oportunidades:** Tela inicial pública (sem login obrigatório) exibindo seleção curada de ações e FIIs no mesmo layout dos cards, com botão "Adicionar à Carteira" e foco na Bola de Neve
- [ ] **Busca Direta por Ativo:** Barra de pesquisa instantânea no Radar para consultar qualquer ticker da B3 com preview de custos e dividendos
- [ ] **P/VP nos Cards:** Integração do indicador Preço/Valor Patrimonial (P/VP) via Yahoo Finance para análise de valuation em ações e FIIs — métrica crítica para a decisão de compra na metodologia Barsi
- [ ] **Zoom / Escala Nativa Mobile:** Controle de escala de visualização para o usuário ver mais ativos simultaneamente no celular sem depender do zoom do navegador
- [ ] **Notificações Customizáveis:** Painel para gerenciar frequência de e-mails e alertas de variações bruscas
- [ ] **Progressive Web App (PWA):** App instalável na tela inicial com Web Push Notifications
- [ ] **Compartilhamento / Impressão Visual:** Geração de card/imagem do extrato da carteira para exportação e compartilhamento (extensão da impressão nativa já existente)

### ✅ Concluído (Histórico por Fase)

**Fase 1 — Fundação, Legislação e Monetização Inicial**
- [x] Alerta de DARF e tutorial na exclusão de FIIs com lucro
- [x] Rodapé profissional com Termos, Privacidade, Contato e Disclaimer responsivos via React Router

**Fase 2 — UX Fluida, Inteligência de Dados e Painel**
- [x] Painel consolidado com patrimônio, variação global, DY anual/mensal e grade interativa de tickers com popover
- [x] Transparência de indicadores: ícones informativos (ⓘ) com base de cálculo e disclaimer de estimativa
- [x] Estabilização do layout mobile: overflow-x, safe-area-inset e gaveta inferior compacta
- [x] Densidade dos cards e tipografia fluida via Container Queries (1–3 colunas desktop, 1–2 mobile)
- [x] Impressão da carteira: sempre 3 cards por linha em layout limpo
- [x] Gaveta inferior redesenhada: altura discreta, botão FECHAR integrado à borda do formulário
- [x] Detalhes de dividendos recolhíveis com abertura/fechamento sincronizados
- [x] Smart Prompt de IA com snapshot da carteira e link para o Google Gemini
- [x] Navegação rápida no painel: toque/clique → scroll até o card; segurar → popover de variação

**Fase 3 — Migração Completa para React 19**
- [x] Portagem do monólito MVC Vanilla JS para SPA React 19 + Vite (padrão *Strangler Fig*)
- [x] `useAssets` Custom Hook como Single Source of Truth com SWR manual
- [x] `AuthContext` com Google OAuth e Guest Mode
- [x] CRUD completo (adicionar, editar, excluir, retentar) com UX de confirmação via SweetAlert2
- [x] Limpeza completa do legado: 18 arquivos removidos (12 views, 1 controller, main.js, index.html, profile.js, auth-service.js, security.js)
- [x] `AGENTS.md` — guia de arquitetura para agentes de IA (mapa de arquivos, fluxo SWR, regras críticas)

---

## ⚙️ Instalação e Configuração

### 1. Pré-requisitos

- **Node.js** 24.x ou superior
- **Python 3.12** — versão exata recomendada; versões superiores (3.13+) podem causar incompatibilidades com o runtime UV da Vercel
- **Git**
- **Vercel CLI** — `npm i -g vercel`

### 2. Clonar o Repositório

```bash
git clone https://github.com/SEU-USUARIO/NotifinanciaWeb_MVC.git
cd NotifinanciaWeb_MVC
```

### 3. Instalar Dependências (Front-end)

```bash
npm install
```

> **Windows / PowerShell:** Caso receba erro de "execução de scripts desabilitada", abra o PowerShell como Administrador e execute:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

> **Rede corporativa / certificado bloqueado:** use `npm install --strict-ssl=false`

### 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase_aqui
```

> ⚠️ Nunca commite este arquivo. Ele já deve estar no `.gitignore`.

### 5. Rodar o Projeto (Front-end + API Python)

```bash
vercel dev
```

O Vercel CLI sobe o Vite e o servidor Python em paralelo e cria um proxy reverso que redireciona `/api/*` → Python e todo o resto → React. Acesse em `http://localhost:3000`.

> ❌ **Não use** `npm run dev` se precisar testar cotações em tempo real — o Vite puro retorna 404 para as rotas `/api`.

---

## 📁 Estrutura Principal

```
NotifinanciaWeb_MVC/
├── api/                    # Back-end Python (FastAPI + Mangum)
│   ├── index.py            # Entrypoint da Serverless Function
│   └── services/
│       └── marketService.py
├── src/
│   ├── components/         # Componentes React (AssetCard, Header, PortfolioSummary…)
│   ├── context/            # AuthContext (sessão Supabase + Google OAuth)
│   ├── hooks/              # useAssets (SWR, CRUD, filtros, perfil)
│   ├── pages/              # Dashboard, Termos, Privacidade, Contato
│   ├── services/           # asset-service.js (Supabase + API Python)
│   ├── styles/             # cards.css, style.css
│   └── utils/              # ticker-dictionary.js, brokers.js
├── docs/
│   └── REACT_MIGRATION_PLAN.md
├── AGENTS.md               # Guia de arquitetura para agentes de IA
└── vercel.json
```

---

> Documentação de arquitetura detalhada: [`AGENTS.md`](AGENTS.md) | Histórico completo da migração: [`docs/REACT_MIGRATION_PLAN.md`](docs/REACT_MIGRATION_PLAN.md)