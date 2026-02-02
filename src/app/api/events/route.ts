import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// POST /api/events - Adicionar evento ao feed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { agentId, taskId, type, message, metadata } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, message" },
        { status: 400 }
      );
    }

    // Validar tipo de evento
    const validTypes = [
      "task_created",
      "task_assigned",
      "task_started",
      "task_completed",
      "task_updated",
      "task_commented",
      "agent_online",
      "agent_offline",
      "agent_working",
      "document_created",
      "decision_made",
      "message_sent",
      "agent_status_changed",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Adicionar evento ao Convex
    const eventId = await convex.mutation(api.events.add, {
      agentId,
      taskId,
      type,
      message,
      metadata,
    });

    return NextResponse.json({ success: true, eventId }, { status: 201 });
  } catch (error) {
    console.error("Error adding event:", error);
    return NextResponse.json(
      { error: "Failed to add event" },
      { status: 500 }
    );
  }
}

// GET /api/events - Buscar eventos recentes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || undefined;

    const events = await convex.query(api.events.getRecent, {
      limit,
      type,
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
