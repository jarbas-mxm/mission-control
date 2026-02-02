# Revisão de Arquitetura - Mission Control Dashboard

**Data:** 2025-02-02  
**Task:** #025 - Revisar arquitetura do dashboard Double List  
**Status:** ✅ Concluído

---

## 📊 Visão Geral da Arquitetura Atual

### Stack
- **Frontend:** Next.js 14+ (App Router) + Tailwind CSS
- **Backend:** Convex (real-time database + serverless functions)
- **Deploy:** Vercel (auto-deploy on push)

### Estrutura de Componentes
```
src/
├── app/
│   ├── page.tsx          # Dashboard principal (Kanban layout)
│   ├── layout.tsx        # Root layout com providers
│   ├── providers.tsx     # ConvexProvider wrapper
│   └── login/page.tsx    # Página de login
├── components/
│   ├── kanban-board.tsx  # Board principal com colunas
│   ├── kanban-column.tsx # Coluna individual (duplicado parcialmente)
│   ├── task-card.tsx     # Card de task (duplicado)
│   ├── task-detail-modal.tsx  # Modal de detalhes
│   ├── task-modal.tsx    # Modal de criação
│   ├── agents-sidebar.tsx    # Lista de agentes + terminal
│   ├── agent-terminal.tsx    # Terminal de logs do agente
│   ├── live-feed.tsx     # Feed de atividades em tempo real
│   ├── header.tsx        # Header com relógio e ações
│   └── ui/               # Componentes base (button, dialog, etc)
└── lib/
    ├── constants.ts      # Config de status, cores, etc
    └── utils.ts          # Utilitários (cn, formatters)
```

---

## 🚨 Problemas Identificados

### 1. **Código Duplicado (Alta Prioridade)**

#### TaskCard duplicado
Existem **2 implementações** de TaskCard:
- `kanban-board.tsx` → TaskCard interno (220 linhas)
- `task-card.tsx` → TaskCard exportado (90 linhas)

**Diferenças:**
- O interno tem menu dropdown com ações (mover/deletar)
- O externo tem layout diferente de assignees
- Ambos têm skeletons diferentes

**Recomendação:** Unificar em `task-card.tsx` com props opcionais para menu.

#### KanbanColumn duplicado
- `kanban-board.tsx` → KanbanColumn interno
- `kanban-column.tsx` → KanbanColumn exportado

**Ambos não são usados consistentemente.**

---

### 2. **Problemas de Performance**

#### a) Queries N+1 em Convex
```typescript
// activities.ts - list()
const enriched = await Promise.all(
  activities.map(async (act) => {
    // Uma query por activity para agent
    if (act.agentId) {
      const agent = await ctx.db.get(act.agentId);  // N queries!
    }
    // Uma query por activity para task
    if (act.taskId) {
      const task = await ctx.db.get(act.taskId);    // N queries!
    }
  })
);
```

**Impacto:** Para 50 atividades, pode fazer até 100 queries adicionais.

**Solução:**
```typescript
// Buscar todos os agents/tasks de uma vez
const allAgents = await ctx.db.query("agents").collect();
const agentMap = new Map(allAgents.map(a => [a._id, a]));

// Lookup O(1) ao invés de query
const agent = agentMap.get(act.agentId);
```

#### b) getCounts() faz full table scan
```typescript
// activities.ts
const activities = await ctx.db.query("activities").collect(); // TODOS
return {
  all: activities.length,
  tasks: activities.filter((a) => taskTypes.includes(a.type)).length,
  // ...filtros no cliente
};
```

**Impacto:** Com 10k+ atividades, vai ficar lento.

**Solução:** Usar índice `by_type` com aggregation ou manter contadores denormalizados.

#### c) getKanban() carrega tudo
```typescript
const tasks = await ctx.db.query("tasks").collect(); // TODAS as tasks
const agents = await ctx.db.query("agents").collect(); // TODOS os agents
```

**OK para poucos dados**, mas não escala. Implementar paginação por coluna.

---

### 3. **Problemas de UX**

#### a) Mobile - Colunas muito largas
```typescript
// kanban-board.tsx
<div className="flex gap-3 md:gap-4 p-3 md:p-4 min-h-full min-w-max">
  {COLUMN_ORDER.map((status) => (
    <KanbanColumn ... /> // w-64 cada
  ))}
</div>
```

4 colunas × 64px = 256px mínimo, mas o scroll horizontal é confuso em mobile.

**Solução:** Implementar swipe entre colunas ou collapse para mobile.

#### b) Sem indicador de loading durante ações
```typescript
const handleMove = async (newStatus) => {
  try {
    await updateStatus({ id: task._id, status: newStatus });
  } catch (err) {
    // Silencioso! Nenhum feedback visual
  }
};
```

**Solução:** Adicionar toast notifications e loading states.

#### c) Modal de detalhes carrega tudo de uma vez
O `getDetail` query faz:
- Busca task
- Busca todos agentes
- Busca todas atividades
- Busca todas mensagens

**Solução:** Lazy load das tabs (history/comments só quando clicadas).

---

### 4. **Inconsistências de Tipo**

```typescript
// kanban-board.tsx
interface Task {
  assignees?: Array<{ _id: string; ... } | undefined>;
}

// task-card.tsx
interface Task {
  assigneeIds: string[];  // Diferente!
}

// Uso de any:
const assigneeIds: any[] = [];
```

**Solução:** Criar tipos compartilhados em `lib/types.ts`.

---

## ✅ Pontos Positivos

1. **Real-time updates** via Convex funciona bem
2. **Design system** consistente com Tailwind
3. **Responsividade** bem implementada (md: e lg: breakpoints)
4. **Skeletons** para loading states
5. **Estrutura de pastas** clara e organizada
6. **Constants** bem definidas para status/colors

---

## 🎯 Recomendações de Melhorias

### Prioridade Alta (Performance)

1. **Otimizar queries Convex**
   ```typescript
   // Criar lookup maps ao invés de queries N+1
   export const list = query({
     handler: async (ctx, args) => {
       const [activities, agents, tasks] = await Promise.all([
         ctx.db.query("activities").withIndex("by_created").order("desc").take(50),
         ctx.db.query("agents").collect(),
         ctx.db.query("tasks").collect()
       ]);
       
       const agentMap = new Map(agents.map(a => [a._id.toString(), a]));
       const taskMap = new Map(tasks.map(t => [t._id.toString(), t]));
       
       return activities.map(act => ({
         ...act,
         agentName: agentMap.get(act.agentId?.toString())?.name,
         agentEmoji: agentMap.get(act.agentId?.toString())?.emoji,
         taskTitle: taskMap.get(act.taskId?.toString())?.title,
       }));
     },
   });
   ```

2. **Implementar contadores denormalizados**
   - Adicionar `activityCount` por tipo na tabela de métricas
   - Atualizar via mutation ao criar atividade

3. **Lazy loading no modal de detalhes**
   ```typescript
   // Carregar history/comments apenas quando tab é selecionada
   const activities = useQuery(
     api.activities.listByTask, 
     activeTab === "history" ? { taskId } : "skip"
   );
   ```

### Prioridade Média (Manutenibilidade)

4. **Unificar TaskCard**
   ```typescript
   // task-card.tsx
   interface TaskCardProps {
     task: Task;
     showMenu?: boolean;
     onMove?: (status: TaskStatus) => void;
     onDelete?: () => void;
     onClick?: () => void;
   }
   ```

5. **Criar arquivo de tipos compartilhado**
   ```typescript
   // lib/types.ts
   export interface Task {
     _id: string;
     title: string;
     // ... campos consistentes
   }
   
   export interface EnrichedTask extends Task {
     assignees: Agent[];
   }
   ```

6. **Remover arquivos não usados**
   - `kanban-column.tsx` (se não usado)
   - Consolidar duplicações

### Prioridade Baixa (UX)

7. **Toast notifications**
   ```typescript
   import { toast } from "sonner"; // ou similar
   
   const handleMove = async (newStatus) => {
     try {
       await updateStatus({ id: task._id, status: newStatus });
       toast.success("Task moved!");
     } catch (err) {
       toast.error("Failed to move task");
     }
   };
   ```

8. **Mobile swipe para colunas**
   - Usar biblioteca como `react-swipeable`
   - Ou implementar tabs com swipe nativo

9. **Drag and drop**
   - Implementar com `@dnd-kit/core`
   - Permitir mover tasks entre colunas arrastando

---

## 📈 Métricas de Impacto Esperado

| Melhoria | Impacto Performance | Impacto UX | Esforço |
|----------|---------------------|------------|---------|
| Otimizar queries N+1 | 🔥🔥🔥 (-50% latência) | - | Médio |
| Contadores denormalizados | 🔥🔥 (-30% CPU) | - | Alto |
| Lazy load modal | 🔥 (-20% initial load) | ✨ (mais rápido) | Baixo |
| Unificar TaskCard | - | ✨ (consistência) | Baixo |
| Toast notifications | - | ✨✨ (feedback) | Baixo |
| Mobile swipe | - | ✨✨✨ (usabilidade) | Médio |

---

## 🔧 Próximos Passos Sugeridos

1. **Imediato:** Corrigir queries N+1 em activities.ts
2. **Curto prazo:** Unificar TaskCard e criar types.ts
3. **Médio prazo:** Implementar toast notifications
4. **Longo prazo:** Mobile improvements e drag-and-drop

---

*Relatório gerado por Dev Agent em 2025-02-02*
