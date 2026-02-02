import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// PUT /api/agents/:id/status - Atualizar status de um agente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { status, currentTask } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Missing required field: status" },
        { status: 400 }
      );
    }

    // Validar status
    const validStatuses = ["working", "idle", "offline"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Atualizar agente no Convex
    await convex.mutation(api.agents.updateStatus, {
      id: id as any,
      status,
      currentTask,
    });

    // Adicionar evento ao feed
    await convex.mutation(api.events.add, {
      agentId: id as any,
      type: "agent_status_changed",
      message: `Agent status changed to ${status}${currentTask ? ` - ${currentTask}` : ""}`,
      metadata: { status, currentTask },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating agent status:", error);
    return NextResponse.json(
      { error: "Failed to update agent status" },
      { status: 500 }
    );
  }
}
