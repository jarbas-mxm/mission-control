import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// POST /api/terminal - Adicionar log ao terminal de um agente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { agentId, level, message, taskId, metadata } = body;

    if (!agentId || !level || !message) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, level, message" },
        { status: 400 }
      );
    }

    // Validar level
    const validLevels = ["info", "success", "warning", "error", "system"];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(", ")}` },
        { status: 400 }
      );
    }

    // Adicionar log ao terminal
    const logId = await convex.mutation(api.terminalLogs.add, {
      agentId,
      level,
      message,
      taskId,
      metadata,
    });

    return NextResponse.json({ success: true, logId }, { status: 201 });
  } catch (error) {
    console.error("Error adding terminal log:", error);
    return NextResponse.json(
      { error: "Failed to add terminal log" },
      { status: 500 }
    );
  }
}

// GET /api/terminal?agentId=xxx - Buscar logs de um agente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing required parameter: agentId" },
        { status: 400 }
      );
    }

    const logs = await convex.query(api.terminalLogs.getByAgent, {
      agentId: agentId as any,
      limit,
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching terminal logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch terminal logs" },
      { status: 500 }
    );
  }
}
