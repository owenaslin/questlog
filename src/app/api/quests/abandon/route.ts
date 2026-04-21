import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const bodySchema = z.object({
  questId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "questId must be a valid UUID." }, { status: 400 });
  }
  const { questId } = parsed.data;

  // Auth: require a valid bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verify session and get user ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Update user_quests: revert to available, clear accepted_at
  const { error } = await supabase
    .from("user_quests")
    .update({
      status: "available",
      accepted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("quest_id", questId)
    .eq("status", "active"); // safety: only abandon active quests

  if (error) {
    console.error("Abandon quest error:", error.message);
    return NextResponse.json({ error: "Failed to abandon quest." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
