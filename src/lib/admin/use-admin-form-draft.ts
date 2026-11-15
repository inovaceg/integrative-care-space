import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type DraftStatus = 'loading' | 'idle' | 'pending' | 'saving' | 'saved' | 'error';
type DraftRow<T> = { id: string; revision: number; payload: T; stage: number; updated_at: string };
type DraftPayload<T> = { payload: T; stage: number; changedAt: number };

const pendingDrafts = new Map<string, DraftPayload<unknown>>();

export function useAdminFormDraft<T>(userId: string | undefined, draftKey: string, patientId: string | null = null) {
  const [status, setStatus] = useState<DraftStatus>('loading');
  const [restoredPayload, setRestoredPayload] = useState<T | null>(null);
  const [stage, setStage] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [readyKey, setReadyKey] = useState("");
  const row = useRef<DraftRow<T> | null>(null);
  const timer = useRef<number | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<DraftPayload<T> | null>(null);
  const key = userId ? `${userId}:${draftKey}` : '';

  useEffect(() => {
    let active = true;
    row.current = null;
    latest.current = null;
    setRestoredPayload(null);
    setReadyKey("");
    setStatus('loading');
    if (!userId) { setStatus('idle'); setReadyKey(key); return; }
    const pending = pendingDrafts.get(key) as DraftPayload<T> | undefined;
    void supabase.from('admin_form_drafts').select('id,revision,payload,stage,updated_at').eq('user_id', userId).eq('draft_key', draftKey).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setStatus('error'); setReadyKey(key); return; }
      if (data) {
        row.current = data as DraftRow<T>;
        setLastSavedAt(data.updated_at);
      }
      if (pending && (!data || pending.changedAt > new Date(data.updated_at).getTime())) {
        latest.current = pending;
        setRestoredPayload(pending.payload);
        setStage(pending.stage);
        setStatus('pending');
      } else if (data) {
        latest.current = { payload: data.payload as T, stage: data.stage, changedAt: new Date(data.updated_at).getTime() };
        setRestoredPayload(data.payload as T);
        setStage(data.stage);
        setStatus('idle');
      } else {
        setStatus('idle');
      }
      setReadyKey(key);
    });
    return () => { active = false; if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [draftKey, key, userId]);

  const flush = useCallback(() => {
    const snapshot = latest.current;
    if (!userId || !snapshot) return;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      const current = snapshot;
      setStatus('saving');
      const now = new Date().toISOString();
      const existing = row.current;
      const query = existing
        ? await supabase.from('admin_form_drafts').update({ payload: current.payload, stage: current.stage, patient_id: patientId, revision: existing.revision + 1, updated_at: now }).eq('id', existing.id).eq('user_id', userId).eq('revision', existing.revision).select('id,revision,payload,stage,updated_at').maybeSingle()
        : await supabase.from('admin_form_drafts').insert({ user_id: userId, draft_key: draftKey, patient_id: patientId, payload: current.payload, stage: current.stage }).select('id,revision,payload,stage,updated_at').single();
      if (query.error || !query.data) {
        const { data: remote } = await supabase.from('admin_form_drafts').select('id,revision,payload,stage,updated_at').eq('user_id', userId).eq('draft_key', draftKey).maybeSingle();
        if (remote) row.current = remote as DraftRow<T>;
        setStatus('error');
        return;
      }
      row.current = query.data as DraftRow<T>;
      setLastSavedAt(query.data.updated_at);
      if (pendingDrafts.get(key) === current) pendingDrafts.delete(key);
      if (latest.current === current) setStatus('saved');
      else setStatus('pending');
    });
  }, [draftKey, key, patientId, userId]);

  const scheduleSave = useCallback((payload: T, nextStage = stage) => {
    const snapshot = { payload, stage: nextStage, changedAt: Date.now() };
    latest.current = snapshot;
    pendingDrafts.set(key, snapshot);
    setStatus('pending');
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 2000);
  }, [flush, key, stage]);

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
    pendingDrafts.delete(key);
    await queue.current.catch(() => undefined);
    const existing = row.current;
    if (existing && userId) {
      const { error } = await supabase.from('admin_form_drafts').delete().eq('id', existing.id).eq('user_id', userId).eq('revision', existing.revision);
      if (error) { setStatus('error'); return; }
    }
    row.current = null;
    setRestoredPayload(null);
    setLastSavedAt(null);
    setStatus('idle');
  }, [key, userId]);

  return { status: readyKey === key ? status : 'loading', restoredPayload, stage, lastSavedAt, scheduleSave, flush, clear };
}
