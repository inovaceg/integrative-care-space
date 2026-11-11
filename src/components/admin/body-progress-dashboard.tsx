import { Card, CardContent } from '@/components/ui/card';
import { bodyProgressChartLines, bodyProgressCharts } from '@/lib/admin/body-progress-report';
import { bodySilhouetteLines, waistHasLargestReduction, type BodyReportRow } from '@/lib/admin/body-progress-silhouette';
import type { DocumentPage } from '@/lib/admin/document-layout';

function Graphic({ lines, width, height, label }: { lines: DocumentPage; width: number; height: number; label: string }) {
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block h-auto w-full">
    <title>{label}</title>
    {lines.map((line, index) => {
      const color = line.color ?? '#2c5f4f';
      if (line.kind === 'path') return <path key={index} d={line.path} fill={color} />;
      if (line.kind === 'rect') return <rect key={index} x={line.x} y={line.y} width={line.width} height={line.height} rx={3} fill={color} />;
      if (line.kind === 'line' || line.kind === 'rule') return <line key={index} x1={line.x} y1={line.y} x2={line.kind === 'rule' ? line.x + (line.width ?? 0) : line.x2} y2={line.kind === 'rule' ? line.y : line.y2} stroke={color} strokeWidth={line.kind === 'rule' ? 0.7 : 1.5} />;
      if (line.kind === 'point') return <circle key={index} cx={line.x} cy={line.y} r={line.radius ?? 2} fill={color} />;
      return <text key={index} x={line.x} y={line.y} fill={color} fontFamily="Arial, sans-serif" fontSize={line.size} fontWeight={line.bold ? 600 : 400}>{line.text.replace(/^-/, '−')}</text>;
    })}
  </svg>;
}

const metrics = [
  { key: 'weight_kg', label: 'Peso' },
  { key: 'body_fat_percentage', label: 'Gordura' },
  { key: 'muscle_mass_kg', label: 'Músculo' },
  { key: 'visceral_fat_level', label: 'Gordura Visceral' },
  { key: 'metabolic_age_years', label: 'Idade Metabólica' },
];

export function BodyProgressDashboard({ rows, dates }: { rows: BodyReportRow[]; dates: string[] }) {
  const highlightWaist = waistHasLargestReduction(rows);
  return <section aria-label="Dashboard de evolução corporal" className="space-y-5 rounded-2xl border border-[#e8e6e1] bg-[#f7f6f3] p-3 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e8e6e1] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#b08d57]">Acompanhamento individual</p><h3 className="mt-1 font-display text-xl text-[#2c5f4f]">Evolução corporal no período</h3></div><p className="text-xs text-[#6b6b6b]">{dates.length} avaliação(ões) em ordem cronológica</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{metrics.map((metric) => {
      const row = rows.find((entry) => entry.key === metric.key);
      const values = row?.values.filter((value) => value !== '—') ?? [];
      return <Card key={metric.key} className="rounded-2xl border-[#e8e6e1] bg-white shadow-sm"><CardContent className="p-4"><h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">{metric.label}</h4><p className="mt-3 text-xl font-semibold tracking-tight text-[#2c5f4f]">{row?.variation ?? '—'}</p><p className="mt-2 text-xs leading-5 text-[#6b6b6b]">{values[0] ?? '—'} → {values.at(-1) ?? '—'}</p></CardContent></Card>;
    })}</div>
    <div className="grid items-stretch gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="rounded-2xl border-[#e8e6e1] bg-white shadow-sm lg:row-span-2"><CardContent className="p-5"><h4 className="text-center text-xs font-semibold uppercase tracking-[.12em] text-[#2c5f4f]">Variação por região</h4><p className="mt-1 text-center text-xs text-[#6b6b6b]">Primeiro e último valores registrados</p><div className="mx-auto mt-4 max-w-[320px]"><Graphic lines={bodySilhouetteLines(rows)} width={300} height={445} label="Silhueta feminina com variações de peso, tórax, braços, cintura, quadril e coxas" /></div>{highlightWaist && <p className="rounded-lg bg-[#faf4e9] px-3 py-2 text-center text-xs font-semibold text-[#8b692e]">Cintura · maior redução entre as circunferências</p>}<p className="mt-3 text-center text-[11px] leading-5 text-[#6b6b6b]">Ilustração esquemática, não representa o corpo da paciente. — indica dados insuficientes.</p></CardContent></Card>
      {bodyProgressCharts.slice(0, 2).map((spec) => <Card key={spec.title} className="rounded-2xl border-[#e8e6e1] bg-white shadow-sm"><CardContent className="p-4 sm:p-5"><Graphic lines={bodyProgressChartLines(spec, rows, dates)} width={400} height={190} label={spec.title} /></CardContent></Card>)}
    </div>
    <div className="grid gap-5 md:grid-cols-2">{bodyProgressCharts.slice(2).map((spec) => <Card key={spec.title} className="rounded-2xl border-[#e8e6e1] bg-white shadow-sm"><CardContent className="p-4 sm:p-5"><Graphic lines={bodyProgressChartLines(spec, rows, dates)} width={400} height={190} label={spec.title} /></CardContent></Card>)}</div>
    <p className="text-xs leading-5 text-[#6b6b6b]">As variações são descritivas e não classificam, isoladamente, uma mudança como melhora ou piora de saúde. Os dados completos permanecem na tabela abaixo.</p>
  </section>;
}
