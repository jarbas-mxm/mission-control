import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

const PASSWORD = process.env.MISSION_CONTROL_PASSWORD || "admin";
const SECRET = process.env.AUTH_SECRET || "default-secret";

// Gera token de sessão
function generateSessionToken(password: string): string {
  const timestamp = Date.now();
  const data = `${password}:${SECRET}:${timestamp}`;
  return createHash("sha256").update(data).digest("hex").slice(0, 32);
}

// Valida token (aceita tokens gerados nas últimas 24h)
function validateToken(token: string | undefined): boolean {
  // Para MVP, só verifica se token existe e não está vazio
  // Em produção, adicionar expiração real
  return !!token && token.length === 32;
}

// POST /api/auth - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== PASSWORD) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      );
    }

    const token = generateSessionToken(password);
    const cookieStore = await cookies();

    cookieStore.set("mc_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro no servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth - Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("mc_session");
  return NextResponse.json({ success: true });
}

// GET /api/auth - Check session
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token || !validateToken(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
