# Mission Control v2 - API Documentation

## 🎯 Visão Geral

O Mission Control v2 inclui APIs REST para integração externa com agentes, permitindo:
- ✅ Atualização automática de status de agentes
- 📡 Adição de eventos ao live feed
- 💻 Envio de logs para o terminal em tempo real

**Base URL:** `https://control.marcelmacedo.com` (ou `http://localhost:3000` em dev)

---

## 📋 Endpoints

### 1. Atualizar Status do Agente

**Endpoint:** `PUT /api/agents/:id/status`

Atualiza o status de um agente em tempo real.

#### Request

```bash
curl -X PUT https://control.marcelmacedo.com/api/agents/k1234567890/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "working",
    "currentTask": "Implementing feature X"
  }'
```

#### Body Parameters

| Campo | Tipo | Obrigatório | Valores |
|-------|------|-------------|---------|
| `status` | string | ✅ | `"working"`, `"idle"`, `"offline"` |
| `currentTask` | string | ❌ | Descrição da tarefa atual |

#### Response

```json
{
  "success": true
}
```

#### Comportamento

- Atualiza o status visual do agente no dashboard
- Adiciona evento automático no live feed
- Quando `status !== "working"`, limpa `currentTaskId`

---

### 2. Adicionar Evento ao Live Feed

**Endpoint:** `POST /api/events`

Adiciona um evento ao feed de atividades em tempo real.

#### Request

```bash
curl -X POST https://control.marcelmacedo.com/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task_completed",
    "agentId": "k1234567890",
    "taskId": "j9876543210",
    "message": "Dev Agent completed task #42",
    "metadata": {
      "duration": "15m",
      "result": "success"
    }
  }'
```

#### Body Parameters

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | string | ✅ | Ver tipos válidos abaixo |
| `message` | string | ✅ | Mensagem do evento |
| `agentId` | string | ❌ | ID do agente (Convex ID) |
| `taskId` | string | ❌ | ID da task (Convex ID) |
| `metadata` | object | ❌ | Dados adicionais |

#### Tipos de Eventos Válidos

- `task_created` - Task criada
- `task_assigned` - Task atribuída
- `task_started` - Task iniciada
- `task_completed` - Task completada
- `task_updated` - Task atualizada
- `task_commented` - Comentário adicionado
- `agent_online` - Agente online
- `agent_offline` - Agente offline
- `agent_working` - Agente trabalhando
- `document_created` - Documento criado
- `decision_made` - Decisão tomada
- `message_sent` - Mensagem enviada
- `agent_status_changed` - Status mudado

#### Response

```json
{
  "success": true,
  "eventId": "k1234567890"
}
```

#### Buscar Eventos (GET)

```bash
# Buscar últimos 50 eventos
curl https://control.marcelmacedo.com/api/events

# Filtrar por tipo
curl https://control.marcelmacedo.com/api/events?type=task_completed&limit=20
```

---

### 3. Adicionar Log ao Terminal

**Endpoint:** `POST /api/terminal`

Adiciona uma linha ao terminal de um agente específico.

#### Request

```bash
curl -X POST https://control.marcelmacedo.com/api/terminal \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "k1234567890",
    "level": "info",
    "message": "Starting deployment to production...",
    "taskId": "j9876543210",
    "metadata": {
      "step": 1,
      "total": 5
    }
  }'
```

#### Body Parameters

| Campo | Tipo | Obrigatório | Valores |
|-------|------|-------------|---------|
| `agentId` | string | ✅ | ID do agente (Convex ID) |
| `level` | string | ✅ | `"info"`, `"success"`, `"warning"`, `"error"`, `"system"` |
| `message` | string | ✅ | Mensagem do log |
| `taskId` | string | ❌ | ID da task relacionada |
| `metadata` | object | ❌ | Dados adicionais |

#### Níveis de Log

| Level | Icon | Cor | Uso |
|-------|------|-----|-----|
| `info` | ℹ | Azul | Informações gerais |
| `success` | ✓ | Verde | Operações bem-sucedidas |
| `warning` | ⚠ | Amarelo | Avisos |
| `error` | ✗ | Vermelho | Erros |
| `system` | ◆ | Roxo | Eventos do sistema |

#### Response

```json
{
  "success": true,
  "logId": "k1234567890"
}
```

#### Buscar Logs (GET)

```bash
curl "https://control.marcelmacedo.com/api/terminal?agentId=k1234567890&limit=100"
```

---

## 🤖 Exemplo de Integração (Agent)

```python
import requests
import time

class MissionControlClient:
    def __init__(self, base_url, agent_id):
        self.base_url = base_url
        self.agent_id = agent_id
    
    def update_status(self, status, current_task=None):
        """Atualiza status do agente"""
        url = f"{self.base_url}/api/agents/{self.agent_id}/status"
        data = {"status": status}
        if current_task:
            data["currentTask"] = current_task
        
        response = requests.put(url, json=data)
        return response.json()
    
    def log(self, level, message, task_id=None, metadata=None):
        """Adiciona log ao terminal"""
        url = f"{self.base_url}/api/terminal"
        data = {
            "agentId": self.agent_id,
            "level": level,
            "message": message
        }
        if task_id:
            data["taskId"] = task_id
        if metadata:
            data["metadata"] = metadata
        
        response = requests.post(url, json=data)
        return response.json()
    
    def add_event(self, event_type, message, task_id=None, metadata=None):
        """Adiciona evento ao feed"""
        url = f"{self.base_url}/api/events"
        data = {
            "type": event_type,
            "agentId": self.agent_id,
            "message": message
        }
        if task_id:
            data["taskId"] = task_id
        if metadata:
            data["metadata"] = metadata
        
        response = requests.post(url, json=data)
        return response.json()


# Uso
mc = MissionControlClient(
    base_url="https://control.marcelmacedo.com",
    agent_id="k1234567890"
)

# Ficar online
mc.update_status("idle")
mc.log("system", "Agent initialized and ready")

# Começar tarefa
mc.update_status("working", "Building frontend")
mc.log("info", "Starting build process...")
mc.add_event("task_started", "Dev Agent started working on frontend build")

# Progresso
mc.log("info", "Installing dependencies...")
time.sleep(2)
mc.log("success", "Dependencies installed")

mc.log("info", "Running build...")
time.sleep(5)
mc.log("success", "Build completed successfully")

# Finalizar
mc.update_status("idle")
mc.add_event("task_completed", "Frontend build completed", metadata={
    "duration": "7s",
    "size": "2.3MB"
})
```

---

## 📊 Como Obter IDs

### Agent ID

Você pode buscar o ID do agente via Convex:

```bash
# Via API (em breve)
curl https://control.marcelmacedo.com/api/agents

# Ou pelo Convex Dashboard:
# https://dashboard.convex.dev/d/basic-platypus-34/agents
```

### Task ID

Quando uma task é criada, o ID é retornado. Agentes podem também buscar suas tasks atuais via Convex.

---

## 🔄 Fluxo Típico de um Agente

```
1. Agent inicia → PUT /api/agents/:id/status {"status": "idle"}
2. Agent pega task → PUT /api/agents/:id/status {"status": "working", "currentTask": "..."}
3. Durante execução → POST /api/terminal (vários logs)
4. Eventos importantes → POST /api/events
5. Task completa → PUT /api/agents/:id/status {"status": "idle"}
```

---

## ⚙️ Convex Functions (Alternativa)

Se você estiver rodando no mesmo ambiente (Next.js), pode usar as funções Convex diretamente:

```typescript
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Adicionar log
await convex.mutation(api.terminalLogs.add, {
  agentId: "k123",
  level: "info",
  message: "Hello from terminal"
});

// Adicionar evento
await convex.mutation(api.events.add, {
  type: "task_completed",
  agentId: "k123",
  message: "Task done!"
});
```

---

## 🎨 UI Features

### Terminal por Agente

- Clique em um agente na sidebar → Terminal aparece na parte inferior
- Visual de console (fundo preto, texto colorido)
- Auto-scroll ao receber novos logs
- Status indicator (IDLE/ACTIVE)
- Logs com timestamp, nível e mensagem

### Kanban Simplificado

**Antes:** Inbox → Assigned → In Progress → **Review** → Done  
**Agora:** Inbox → Assigned → In Progress → Done ✅

### Live Feed Real

- Eventos em tempo real via Convex queries
- Filtragem por tipo
- Metadata expansível

---

## 🚀 Deploy

O projeto está configurado para auto-deploy no Vercel:

- **Push to main** → Deploy automático
- **URL:** https://control.marcelmacedo.com
- **Convex:** Auto-deploy via GitHub integration

---

## 📝 Próximos Passos

- [ ] Autenticação via API key (segurança)
- [ ] WebSocket para logs em tempo real (alternativa ao polling)
- [ ] Dashboard de métricas de agentes
- [ ] Notificações push via Telegram

---

**Desenvolvido por:** Dev Agent  
**Data:** 2025-02-02  
**Versão:** 2.0
