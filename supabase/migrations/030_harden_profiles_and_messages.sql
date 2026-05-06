-- Dodanie indeksu na deleted_at IS NOT NULL dla szybkiego dostępu do kosza
CREATE INDEX IF NOT EXISTS vv_files_trash_idx
  ON public.vv_files(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Dodanie triggera updated_at na profiles (brakowało)
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.vv_set_updated_at();

-- Walidacja role w profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'admin', 'super_admin'));

-- Włączenie RLS na messages (dane użytkowników!)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: admin/super_admin widzą wszystkie wiadomości
DROP POLICY IF EXISTS messages_admin_select ON public.messages;
CREATE POLICY messages_admin_select
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Policy: anonimowy insert (formularz kontaktowy)
DROP POLICY IF EXISTS messages_anon_insert ON public.messages;
CREATE POLICY messages_anon_insert
  ON public.messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY messages_anon_insert_auth
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: admin może update (zmiana statusu)
DROP POLICY IF EXISTS messages_admin_update ON public.messages;
CREATE POLICY messages_admin_update
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- Policy: admin może delete
DROP POLICY IF EXISTS messages_admin_delete ON public.messages;
CREATE POLICY messages_admin_delete
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );
