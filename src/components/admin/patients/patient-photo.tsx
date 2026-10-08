import { useEffect, useId, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

function usePhotoUrl(path?: string | null) {
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(null)
  useEffect(() => {
    if (!path) return
    let active = true
    // Existing public photos remain readable; new photos use private storage paths.
    if (path.startsWith('https://')) {
      setResolved({ path, url: path })
      return
    }
    supabase.storage.from('patient-avatars').createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data) setResolved({ path, url: data.signedUrl })
    })
    return () => { active = false }
  }, [path])
  return resolved?.path === path ? resolved?.url : undefined
}

export function PatientPhoto({ path, initials, className }: { path?: string | null | undefined; initials: string; className?: string }) {
  const url = usePhotoUrl(path)
  return <Avatar className={cn('size-9 shrink-0', className)}>
    <AvatarImage src={url} alt="Foto do paciente" className="object-cover" />
    <AvatarFallback className="bg-[#e3f3ef] text-xs font-semibold text-[#28786e]">{initials}</AvatarFallback>
  </Avatar>
}

async function preparePhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  if (file.size > 10 * 1024 * 1024) throw new Error('A foto deve ter no máximo 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a foto.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Não foi possível preparar a foto. Escolha uma imagem menor.')
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

export function PatientPhotoPicker({ existingPath, file, onChange, disabled, onBusyChange }: {
  existingPath?: string | null | undefined
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const version = useRef(0)
  useEffect(() => () => { version.current += 1 }, [])
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function select(file?: File) {
    if (!file) return
    const current = ++version.current
    setBusy(true)
    onBusyChange(true)
    setError('')
    try {
      const prepared = await preparePhoto(file)
      if (version.current === current) onChange(prepared)
    } catch (error) {
      if (version.current === current) setError(error instanceof Error ? error.message : 'Não foi possível abrir a imagem. Escolha outra foto.')
    } finally {
      if (version.current === current) { setBusy(false); onBusyChange(false) }
    }
  }

  return <div className="space-y-3 rounded-lg border border-slate-200 p-4">
    <Label htmlFor={id}>Foto do paciente (opcional)</Label>
    <div className="flex items-center gap-4">
      {preview ? <img src={preview} alt="Pré-visualização da foto selecionada" className="size-20 shrink-0 rounded-full object-cover" /> : <PatientPhoto path={existingPath} initials="Foto" className="size-20" />}
      <div className="min-w-0 flex-1 space-y-2">
        <Input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} onChange={event => { void select(event.target.files?.[0]); event.target.value = '' }} />
        <p className="text-xs text-slate-500">JPG, PNG ou WebP, até 10 MB. A foto será otimizada e salva ao enviar o formulário.</p>
        {file && <button type="button" disabled={disabled || busy} onClick={() => onChange(null)} className="text-xs text-slate-600 underline">Cancelar seleção da nova foto</button>}
      </div>
    </div>
    {busy && <p role="status" className="text-sm text-slate-500">Preparando foto...</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>
}
