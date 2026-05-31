import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getBearerToken } from '@/lib/api-utils';

export const preferredRegion = 'pdx1';

const EXPEDITION_BONUS_XP = 50;

const requestSchema = z.object({
  lastStageQuestId: z.string().uuid(),
  expeditionTitle: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
});

async function getAuthContext(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, supabase };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  const { userId, supabase } = auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
  const { lastStageQuestId, expeditionTitle, city } = parsed.data;

  // Verify the final stage quest was actually completed by this user.
  // RLS ensures we only see rows owned by the authenticated caller.
  const { data: progress, error: progressError } = await supabase
    .from('user_quests')
    .select('status')
    .eq('user_id', userId)
    .eq('quest_id', lastStageQuestId)
    .eq('status', 'completed')
    .maybeSingle();

  if (progressError || !progress) {
    return NextResponse.json(
      { success: false, message: 'Final expedition stage not yet completed.' },
      { status: 403 }
    );
  }

  // Idempotency: only award once per expedition title per user.
  const bonusTitle = `Expedition Complete: ${expeditionTitle}`;
  const { data: existing } = await supabase
    .from('quests')
    .select('id')
    .eq('user_id', userId)
    .eq('title', bonusTitle)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, xp_bonus: EXPEDITION_BONUS_XP, already_awarded: true });
  }

  // Insert the bonus quest server-side with a fixed, server-controlled XP value.
  const { data: bonusQuest, error: insertError } = await supabase
    .from('quests')
    .insert({
      title: bonusTitle,
      description: `Victory bonus for completing the Travel Expedition in ${city}!`,
      type: 'side',
      source: 'user',
      difficulty: 3,
      xp_reward: EXPEDITION_BONUS_XP,
      duration_label: 'Trivial',
      category: 'Travel',
      user_id: userId,
      status: 'available',
    })
    .select('id')
    .single();

  if (insertError || !bonusQuest) {
    console.error('[expedition:complete] Failed to insert bonus quest:', insertError);
    return NextResponse.json({ success: false, message: 'Failed to award expedition bonus.' }, { status: 500 });
  }

  // Accept and complete via RPC — XP is read from quests.xp_reward server-side,
  // so the client cannot influence the reward amount.
  const { error: acceptError } = await supabase.from('user_quests').insert({
    user_id: userId,
    quest_id: bonusQuest.id,
    quest_type: 'side',
    quest_category: 'Travel',
    status: 'active',
    accepted_at: new Date().toISOString(),
  });

  if (acceptError) {
    console.error('[expedition:complete] Failed to accept bonus quest:', acceptError);
    return NextResponse.json({ success: false, message: 'Failed to award expedition bonus.' }, { status: 500 });
  }

  const { error: completeError } = await supabase.rpc('complete_quest_atomic', {
    p_user_id: userId,
    p_quest_id: bonusQuest.id,
    p_quest_type: 'side',
    p_quest_category: 'Travel',
  });

  if (completeError) {
    console.error('[expedition:complete] Failed to complete bonus quest:', completeError);
    return NextResponse.json({ success: false, message: 'Failed to award expedition bonus.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, xp_bonus: EXPEDITION_BONUS_XP });
}
