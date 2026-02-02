# Mission Control v2 - Changelog

## [2.0.0] - 2025-02-02

### 🎉 Major Release - Mission Control v2

#### ✅ IMPLEMENTADO

##### 1. 💻 Terminal por Agente (PRIORIDADE MÁXIMA!)
- ✅ Terminal visual em tempo real por agente
- ✅ Aparece na sidebar quando agente é selecionado
- ✅ Visual de console (fundo preto, texto colorido)
- ✅ Níveis de log: info (azul), success (verde), warning (amarelo), error (vermelho), system (roxo)
- ✅ Auto-scroll ao receber novos logs
- ✅ Status indicator (IDLE/ACTIVE)
- ✅ Schema `terminalLogs` no Convex
- ✅ API endpoint: `POST /api/terminal`
- ✅ Funções Convex: `terminalLogs.add`, `terminalLogs.getByAgent`

##### 2. 📋 Remover Coluna Review
- ✅ Fluxo simplificado: Inbox → Assigned → In Progress → Done
- ✅ Removido "review" do schema
- ✅ Removido "review" do Kanban board
- ✅ Atualizado constants.ts
- ✅ Atualizado todas as funções que referenciavam review

##### 3. 📡 Live Feed Real
- ✅ Schema `events` (reutiliza `activities` existente)
- ✅ Funções Convex: `events.add`, `events.getRecent`, `events.getByAgent`
- ✅ API endpoint: `POST /api/events` (adicionar eventos)
- ✅ API endpoint: `GET /api/events` (buscar eventos)
- ✅ Suporte a 13 tipos de eventos diferentes
- ✅ Metadata flexível para cada evento

##### 4. 🤖 Status dos Agentes Automático
- ✅ API endpoint: `PUT /api/agents/:id/status`
- ✅ Atualiza status: working, idle, offline
- ✅ Suporte a `currentTask` (descrição da tarefa)
- ✅ Função Convex: `agents.updateStatus`
- ✅ Auto-adiciona evento ao feed quando status muda

#### 📚 Documentação

- ✅ **API_DOCS.md** - Guia completo de APIs
  - Descrição de todos os endpoints
  - Exemplos de request/response
  - Tipos válidos de eventos e logs
  - Tabelas de referência
  
- ✅ **examples/agent_integration.py** - Exemplos de integração
  - Classe `MissionControlClient` completa
  - Workflow completo de agente
  - Tratamento de erros
  - Tarefas longas com progresso

#### 🛠️ Melhorias Técnicas

- ✅ TypeScript configurado corretamente (params como Promise no Next.js 15+)
- ✅ Build passando sem erros
- ✅ Schema do Convex atualizado e validado
- ✅ Auto-deploy no Vercel configurado
- ✅ Git workflow: commit → push → auto-deploy

#### 🎨 UI/UX

- ✅ Terminal integrado na sidebar de agentes
- ✅ Visual de console profissional
- ✅ Cores por nível de log
- ✅ Timestamps em formato HH:MM:SS
- ✅ Estado idle com animação de cursor
- ✅ Scrollbar customizada (dark theme)
- ✅ Indicador de status (dot pulsante quando ativo)

#### 🔧 Arquivos Criados/Modificados

**Novos arquivos:**
- `convex/events.ts` - Funções de eventos
- `convex/terminalLogs.ts` - Funções de logs
- `src/components/agent-terminal.tsx` - Componente do terminal
- `src/app/api/agents/[id]/status/route.ts` - API de status
- `src/app/api/events/route.ts` - API de eventos
- `src/app/api/terminal/route.ts` - API de terminal
- `API_DOCS.md` - Documentação das APIs
- `examples/agent_integration.py` - Exemplos de integração
- `CHANGELOG.md` - Este arquivo

**Arquivos modificados:**
- `convex/schema.ts` - Adicionado `terminalLogs`, removido `review` de tasks
- `convex/agents.ts` - Adicionado `updateStatus`, removido refs a review
- `convex/tasks.ts` - Removido `review` do status
- `src/components/agents-sidebar.tsx` - Adicionado terminal
- `src/components/kanban-board.tsx` - Removido coluna review
- `src/lib/constants.ts` - Removido config de review

#### 📊 Schemas do Convex

```typescript
// Terminal Logs
terminalLogs {
  agentId: Id<"agents">
  level: "info" | "success" | "warning" | "error" | "system"
  message: string
  taskId?: Id<"tasks">
  metadata?: any
  createdAt: number
}

// Events (activities expandido)
activities {
  type: "task_created" | "task_assigned" | ... (13 tipos)
  agentId?: Id<"agents">
  taskId?: Id<"tasks">
  message: string
  metadata?: any
  createdAt: number
}
```

#### 🚀 Deploy

- **Commit:** c897476
- **Status:** ✅ Deployed
- **URL:** https://control.marcelmacedo.com
- **Vercel:** Auto-deploy ativo
- **Convex:** Synced

#### 📈 Próximos Passos (Sugestões)

- [ ] Autenticação via API key para segurança
- [ ] WebSocket para logs em tempo real (alternativa ao polling)
- [ ] Dashboard de métricas agregadas por agente
- [ ] Notificações push via Telegram quando eventos importantes
- [ ] Filtros avançados no live feed
- [ ] Export de logs em CSV/JSON
- [ ] Retention policy configurável (atualmente 24h para logs, 7d para eventos)

#### 🐛 Bugs Conhecidos

Nenhum no momento.

#### ⚠️ Breaking Changes

- **Status de tasks:** Removido status `"review"`. Tasks existentes com esse status precisam ser migradas manualmente para `"done"` ou `"in_progress"`.

#### 📝 Notas

- Terminal usa Convex queries reativas → atualiza automaticamente
- Logs são mantidos por 24h (cleanup pode ser agendado)
- Eventos mantidos por 7 dias
- APIs não têm autenticação ainda → adicionar antes de expor publicamente

---

**Desenvolvido por:** Dev Agent (Subagent)  
**Solicitado por:** Marcel via Jarbas  
**Data:** 2025-02-02  
**Versão:** 2.0.0  
**Build:** ✅ Passing  
**Deploy:** ✅ Live
