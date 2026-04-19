-- Migration 006: Hero sharing — public profile, avatar, handle, pinned triumphs
-- Additive only. No existing columns/constraints are modified.

-- ── 1. Add hero columns to profiles ────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle        TEXT    UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_sprite TEXT    NOT NULL DEFAULT 'wizard',
  ADD COLUMN IF NOT EXISTS is_public     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS title         TEXT;   -- nullable cached derivation

-- Enforce handle format: 3–20 chars, lowercase letters/numbers/hyphens
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9][a-z0-9\-]{1,18}[a-z0-9]$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_idx ON public.profiles(handle)
  WHERE handle IS NOT NULL;

-- ── 2. Public read policy on profiles ──────────────────────────────────────
-- Adds to the existing "Users can view own profile" policy (OR semantics).

CREATE POLICY "Public profiles are viewable by all" ON public.profiles
  FOR SELECT USING (is_public = true);

-- ── 3. pinned_quests table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pinned_quests (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_id        TEXT        NOT NULL,
  quest_title     TEXT        NOT NULL,
  quest_type      TEXT        NOT NULL CHECK (quest_type IN ('main', 'side')),
  quest_xp_reward INTEGER     NOT NULL,
  position        INTEGER     NOT NULL DEFAULT 0,
  pinned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pinned_quests_unique UNIQUE (user_id, quest_id)
);

ALTER TABLE public.pinned_quests ENABLE ROW LEVEL SECURITY;

-- Owner can do anything with their pinned quests
CREATE POLICY "Users can manage own pinned quests" ON public.pinned_quests
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon / other users can read pinned quests when the linked profile is public
CREATE POLICY "Pinned quests readable when profile is public" ON public.pinned_quests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = pinned_quests.user_id
        AND profiles.is_public = true
    )
  );

-- ── 4. Handle lookup helper (avoids exposing email in URL) ─────────────────

CREATE OR REPLACE FUNCTION public.get_profile_by_handle(p_handle TEXT)
RETURNS TABLE (
  id             UUID,
  display_name   TEXT,
  avatar_sprite  TEXT,
  is_public      BOOLEAN,
  title          TEXT,
  xp_total       INTEGER,
  level          INTEGER,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, display_name, avatar_sprite, is_public, title, xp_total, level, created_at
  FROM profiles
  WHERE handle = p_handle
    AND is_public = true
  LIMIT 1;
$$;

-- Grant anon access to the lookup function
GRANT EXECUTE ON FUNCTION public.get_profile_by_handle(TEXT) TO anon, authenticated;
