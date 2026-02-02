#!/usr/bin/env python3
"""
Mission Control v2 - Agent Integration Example

Este exemplo mostra como integrar um agente com o Mission Control v2
para:
- Atualizar status em tempo real
- Enviar logs para o terminal
- Adicionar eventos ao live feed
"""

import requests
import time
from typing import Optional, Dict, Any


class MissionControlClient:
    """Cliente para integração com Mission Control v2"""
    
    def __init__(self, base_url: str, agent_id: str):
        """
        Args:
            base_url: URL do Mission Control (ex: https://control.marcelmacedo.com)
            agent_id: ID do agente no Convex
        """
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id
        self.session = requests.Session()
    
    def update_status(
        self, 
        status: str, 
        current_task: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atualiza o status do agente
        
        Args:
            status: "working", "idle" ou "offline"
            current_task: Descrição da tarefa atual (opcional)
        """
        url = f"{self.base_url}/api/agents/{self.agent_id}/status"
        data = {"status": status}
        
        if current_task:
            data["currentTask"] = current_task
        
        response = self.session.put(url, json=data)
        response.raise_for_status()
        return response.json()
    
    def log(
        self,
        level: str,
        message: str,
        task_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Adiciona log ao terminal do agente
        
        Args:
            level: "info", "success", "warning", "error" ou "system"
            message: Mensagem do log
            task_id: ID da task relacionada (opcional)
            metadata: Dados adicionais (opcional)
        """
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
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()
    
    def add_event(
        self,
        event_type: str,
        message: str,
        task_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Adiciona evento ao live feed
        
        Args:
            event_type: Tipo de evento (ex: "task_completed")
            message: Mensagem do evento
            task_id: ID da task relacionada (opcional)
            metadata: Dados adicionais (opcional)
        """
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
        
        response = self.session.post(url, json=data)
        response.raise_for_status()
        return response.json()
    
    # Helpers para logs comuns
    def info(self, message: str, **kwargs):
        """Atalho para log de info"""
        return self.log("info", message, **kwargs)
    
    def success(self, message: str, **kwargs):
        """Atalho para log de sucesso"""
        return self.log("success", message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Atalho para log de warning"""
        return self.log("warning", message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Atalho para log de erro"""
        return self.log("error", message, **kwargs)
    
    def system(self, message: str, **kwargs):
        """Atalho para log de sistema"""
        return self.log("system", message, **kwargs)


def example_workflow():
    """Exemplo de workflow completo de um agente"""
    
    # Configuração
    mc = MissionControlClient(
        base_url="https://control.marcelmacedo.com",
        agent_id="k1234567890"  # Substituir pelo ID real do agente
    )
    
    print("🤖 Agent iniciando...")
    
    # 1. Inicialização
    mc.update_status("idle")
    mc.system("Agent initialized and ready for tasks")
    mc.add_event("agent_online", "Dev Agent is now online")
    
    time.sleep(1)
    
    # 2. Pegar tarefa
    task_id = "j9876543210"  # ID da task
    task_name = "Build and deploy frontend"
    
    mc.update_status("working", task_name)
    mc.info(f"Starting task: {task_name}")
    mc.add_event(
        "task_started",
        f"Dev Agent started working on '{task_name}'",
        task_id=task_id
    )
    
    # 3. Executar tarefa com logs de progresso
    steps = [
        ("Installing dependencies...", 2),
        ("Running linter...", 1),
        ("Building production bundle...", 3),
        ("Running tests...", 2),
        ("Deploying to Vercel...", 4),
    ]
    
    for i, (step, duration) in enumerate(steps, 1):
        mc.info(f"[{i}/{len(steps)}] {step}", metadata={"step": i, "total": len(steps)})
        time.sleep(duration)
        mc.success(f"✓ {step.replace('...', '')} completed")
    
    # 4. Finalizar com sucesso
    mc.update_status("idle")
    mc.success(f"Task '{task_name}' completed successfully")
    mc.add_event(
        "task_completed",
        f"Dev Agent completed '{task_name}'",
        task_id=task_id,
        metadata={
            "duration": "12s",
            "result": "success",
            "url": "https://mission-control-ui-seven.vercel.app"
        }
    )
    
    print("✅ Workflow completo!")


def example_error_handling():
    """Exemplo de tratamento de erros"""
    
    mc = MissionControlClient(
        base_url="https://control.marcelmacedo.com",
        agent_id="k1234567890"
    )
    
    task_id = "j9876543210"
    
    try:
        mc.update_status("working", "Running risky operation")
        mc.info("Starting risky operation...")
        
        # Simular erro
        mc.warning("Detected potential issue, retrying...")
        time.sleep(1)
        
        raise Exception("Operation failed: Connection timeout")
        
    except Exception as e:
        # Logar erro
        mc.error(f"Task failed: {str(e)}")
        
        # Adicionar evento de erro
        mc.add_event(
            "task_updated",
            f"Task failed with error: {str(e)}",
            task_id=task_id,
            metadata={"error": str(e), "status": "failed"}
        )
        
        # Voltar para idle
        mc.update_status("idle")
        
        print(f"❌ Erro tratado: {e}")


def example_long_running_task():
    """Exemplo de tarefa longa com updates periódicos"""
    
    mc = MissionControlClient(
        base_url="https://control.marcelmacedo.com",
        agent_id="k1234567890"
    )
    
    task_id = "j9876543210"
    total_items = 100
    
    mc.update_status("working", f"Processing {total_items} items")
    mc.info(f"Starting batch processing ({total_items} items)")
    
    for i in range(1, total_items + 1):
        # Processar item
        time.sleep(0.1)
        
        # Log a cada 10 items
        if i % 10 == 0:
            progress = (i / total_items) * 100
            mc.info(
                f"Progress: {i}/{total_items} ({progress:.0f}%)",
                metadata={"progress": progress, "processed": i, "total": total_items}
            )
    
    mc.success(f"Batch processing completed ({total_items} items)")
    mc.update_status("idle")


if __name__ == "__main__":
    print("Mission Control v2 - Agent Integration Examples\n")
    
    print("Escolha um exemplo:")
    print("1. Workflow completo")
    print("2. Tratamento de erros")
    print("3. Tarefa longa com progresso")
    
    choice = input("\nOpção (1-3): ").strip()
    
    if choice == "1":
        example_workflow()
    elif choice == "2":
        example_error_handling()
    elif choice == "3":
        example_long_running_task()
    else:
        print("Opção inválida")
