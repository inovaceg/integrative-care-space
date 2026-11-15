import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type DraftStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';
type DraftRow<T> = { id: string; revision: number; payload: T; stage: number };

export function useAdminFormDraft<T>(userId: string | undefined, draftKey: string, patientId: string | null = null) {
  const [status, setStatus] = useState<DraftStatus>('loading');
  const [restoredPayload, setRestoredPayload] = useState<T | null>(null);
  const [stage, setStage] = useState(0);
  const row = useRef<DraftRow<T> | null>(null);
  const timer = useRef<number | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<{ payload: T; stage: number } | null>(null);

  useEffect(() => {
    let active = true;
    row.current = null;
    setRestoredPayload(null);
    setStatus('loading');
    if (!userId) { setStatus('idle'); return; }
    void supabase.from('admin_form_drafts').select('id,revision,payload,stage').eq('user_id', userId).eq('draft_key', draftKey).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setStatus('error'); return; }
      if (data) {
        row.current = data as DraftRow<T>;
        latest.current = { payload: data.payload as T, stage: data.stage };
        setRestoredPayload(data.payload as T);
        setStage(data.stage);
      }
      setStatus('idle');
    });
    return () => { active = false; if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [draftKey, userId]);

  const flush = useCallback(() => {
    if (!userId || !latest.current) return;
    const current = latest.current;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      setStatus('saving');
      const now = new Date().toISOString();
      const existing = row.current;
      const query = existing
        ? await supabase.from('admin_form_drafts').update({ payload: current.payload, stage: current.stage, patient_id: patientId, revision: existing.revision + 1, updated_at: now }).eq('id', existing.id).eq('user_id', userId).eq('revision', existing.revision).select('id,revision,payload,stage').maybeSingle()
        : await supabase.from('admin_form_drafts').insert({ user_id: userId, draft_key: draftKey, patient_id: patientId, payload: current.payload, stage: current.stage }).select('id,revision,payload,stage').single();
      if (query.error || (existing && !query.data)) { setStatus('error'); return; }
      row.current = query.data as DraftRow<T>;
      setStatus('saved');
    });
  }, [draftKey, patientId, userId]);

  const scheduleSave = useCallback((payload: T, nextStage = stage) => {
    latest.current = { payload, stage: nextStage };
    setStatus('idle');
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 2000);
  }, [flush, stage]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (latest.current) flush();
  }, [flush]);

  useEffect(() => {
    const retry = () => { if (latest.current) flush(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [flush]);

  const clear = useCallback(async () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    latest.current = null;
    await queue.current.catch(() => undefined);
    const existing = row.current;
    if (existing && userId) {
      await supabase.from('admin_form_drafts').delete().eq('id', existing.id).eq('user_id', userId).eq('revision', existing.revision);
    }
    row.current = null;
    setRestoredPayload(null);
    setStatus('idle');
  }, [userId]);

  return { status, restoredPayload, stage, scheduleSave, clear };
}
