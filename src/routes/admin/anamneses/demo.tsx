import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminLayout, PageIntro } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnamneseReport } from '@/components/admin/anamnese-report'
import { analyzeAnamnese, type AnalysisResult } from '@/lib/admin/anamnese-analysis'
import type { AnamneseAnswers } from '@/lib/admin/anamnese'

export const Route = createFileRoute('/admin/anamneses/demo')({ component: AnamneseDemoPage })

const demoScenarios: Array<{ id: string; label: string; answers: AnamneseAnswers }> = [
  {
    id: 'suicidio-atual',
    label: 'Pensamentos suicidas atuais com planejamento e acesso a meios',
    answers: {
      motivo_atendimento: 'Não consigo mais lidar com a vida',
      modalidade: 'Psicologia',
      inicio_queixa: 'Há algumas semanas',
      impacto_vida: 'Não consigo trabalhar, não saio de casa',
      expectativa_tratamento: 'Quero voltar a me sentir bem',
      escala_prejuizo: 9,
      escala_ansiedade: 8,
      escala_tristeza: 9,
      sintomas: ['Tristeza', 'Falta de energia', 'Pensamentos repetitivos', 'Sensação de vazio'],
      tratamento_anterior: 'Não',
      pensamentos_morte: 'Sim, neste momento',
      pensamentos_presentes_agora: 'Sim',
      planejamento: 'Sim',
      acesso_meios: 'Sim',
      historico_risco: 'Já pensei em pular do prédio',
      fatores_impeditivos: 'Meu cachorro me mantém vivo',
      rede_apoio: 'Sim',
      rede_apoio_nome: 'Maria',
      rede_apoio_vinculo: 'Irmã',
      rede_apoio_telefone: '(11) 99999-9999',
      traumas: 'Não',
      relacionamentos: 'Isolado',
      sexualidade: 'Não',
      vida_profissional: 'Trabalho remoto, ansioso o tempo todo',
      espiritualidade: 'Não',
      doencas: 'Não',
      cirurgias: 'Não',
      alergias: 'Não',
      medicamentos: 'Sim',
      medicamentos_detalhes: 'Sertralina 50mg, há 2 anos',
      acompanhamento: 'Não',
      exames: 'Não',
      alimentacao: 'Pouco apetite',
      sono: 'Dificuldade para dormir',
      atividade_fisica: 'Não',
      substancias: 'Não',
    },
  },
  {
    id: 'historico-passado',
    label: 'Histórico de pensamentos suicidas no passado, sem risco atual',
    answers: {
      motivo_atendimento: 'Ansiedade em situações sociais',
      modalidade: 'Psicologia',
      inicio_queixa: 'Há alguns meses',
      impacto_vida: 'Evito eventos sociais',
      expectativa_tratamento: 'Aprender a lidar com ansiedade',
      escala_prejuizo: 6,
      escala_ansiedade: 7,
      escala_tristeza: 3,
      sintomas: ['Ansiedade', 'Medo excessivo', 'Crises de pânico', 'Falta de concentração'],
      tratamento_anterior: 'Sim',
      tratamento_anterior_detalhes: 'Psicologia por 1 ano, há 3 anos',
      pensamentos_morte: 'Sim, no passado',
      pensamentos_presentes_agora: 'Não',
      planejamento: 'Não',
      acesso_meios: 'Não',
      historico_risco: 'Tentativa de overdose aos 22 anos',
      fatores_impeditivos: 'Terapia me ajudou muito',
      rede_apoio: 'Sim',
      rede_apoio_nome: 'Carlos',
      rede_apoio_vinculo: 'Namorado',
      rede_apoio_telefone: '(11) 88888-8888',
      traumas: 'Sim',
      traumas_detalhes: 'Perda da mãe aos 18 anos',
      relacionamentos: 'Relacionamento estável',
      sexualidade: 'Não',
      vida_profissional: 'Trabalho em escritório, estressado',
      espiritualidade: 'Sim',
      espiritualidade_detalhes: 'Pratico meditação',
      doencas: 'Não',
      cirurgias: 'Não',
      alergias: 'Não',
      medicamentos: 'Não',
      acompanhamento: 'Não',
      exames: 'Não',
      alimentacao: 'Alimentação equilibrada',
      sono: 'Sono regular',
      atividade_fisica: 'Sim',
      atividade_fisica_detalhes: 'Corrida 3x por semana',
      substancias: 'Não',
    },
  },
  {
    id: 'prefiro-conversar',
    label: '"Prefiro conversar pessoalmente" — pendência sem elevação de prioridade',
    answers: {
      motivo_atendimento: 'Dificuldade para dormir',
      modalidade: 'Psicologia',
      inicio_queixa: 'Há algumas semanas',
      impacto_vida: 'Cansaço durante o dia',
      expectativa_tratamento: 'Melhorar o sono',
      escala_prejuizo: 4,
      escala_ansiedade: 5,
      escala_tristeza: 2,
      sintomas: ['Alterações no sono', 'Falta de energia'],
      tratamento_anterior: 'Não',
      pensamentos_morte: 'Prefiro conversar pessoalmente',
      rede_apoio: 'Sim',
      rede_apoio_nome: 'Ana',
      rede_apoio_vinculo: 'Amiga',
      rede_apoio_telefone: '(11) 77777-7777',
      traumas: 'Prefiro conversar pessoalmente',
      relacionamentos: 'Relacionamento saudável',
      sexualidade: 'Prefiro conversar pessoalmente',
      vida_profissional: 'Trabalho presencial',
      espiritualidade: 'Não',
      doencas: 'Não',
      cirurgias: 'Não',
      alergias: 'Não',
      medicamentos: 'Não',
      acompanhamento: 'Não',
      exames: 'Vou apresentar durante a consulta',
      alimentacao: 'Alimentação regular',
      sono: 'Dificuldade para manter sono',
      atividade_fisica: 'Sim',
      atividade_fisica_detalhes: 'Caminhada leve',
      substancias: 'Não',
    },
  },
  {
    id: 'sem-alertas',
    label: 'Anamnese sem alertas — sem risco',
    answers: {
      motivo_atendimento: 'Acompanhamento de rotina',
      modalidade: 'Psicologia',
      inicio_queixa: 'Há alguns meses',
      impacto_vida: 'Leve impacto no dia a dia',
      expectativa_tratamento: 'Manter o equilíbrio emocional',
      escala_prejuizo: 3,
      escala_ansiedade: 2,
      escala_tristeza: 1,
      sintomas: ['Falta de energia'],
      tratamento_anterior: 'Não',
      pensamentos_morte: 'Não',
      rede_apoio: 'Sim',
      rede_apoio_nome: 'Mãe',
      rede_apoio_vinculo: 'Familiar',
      rede_apoio_telefone: '(11) 66666-6666',
      traumas: 'Não',
      relacionamentos: 'Relacionamentos saudáveis',
      sexualidade: 'Não',
      vida_profissional: 'Trabalho remoto',
      espiritualidade: 'Não',
      doencas: 'Não',
      cirurgias: 'Não',
      alergias: 'Não',
      medicamentos: 'Não',
      acompanhamento: 'Não',
      exames: 'Não',
      alimentacao: 'Alimentação equilibrada',
      sono: 'Sono regular',
      atividade_fisica: 'Sim',
      atividade_fisica_detalhes: 'Yoga 2x por semana',
      substancias: 'Não',
    },
  },
  {
    id: 'informacoes-ausentes',
    label: 'Informações ausentes e contraditórias — pendências',
    answers: {
      motivo_atendimento: 'Dor nas costas',
      modalidade: 'Biomedicina/Estética',
      inicio_queixa: 'Há alguns meses',
      impacto_vida: 'Dificuldade para me mover',
      expectativa_tratamento: 'Aliviar a dor',
      escala_prejuizo: 5,
      escala_ansiedade: 0,
      escala_tristeza: 0,
      sintomas: ['Outro'],
      sintomas_outro: '',
      tratamento_anterior: 'Sim',
      pensamentos_morte: 'Não',
      rede_apoio: 'Não',
      traumas: 'Sim',
      relacionamentos: 'Relacionamento conturbado',
      sexualidade: 'Não',
      vida_profissional: 'Trabalho pesado',
      espiritualidade: 'Não',
      doencas: 'Sim',
      cirurgias: 'Não',
      alergias: 'Sim',
      medicamentos: 'Sim',
      acompanhamento: 'Sim',
      exames: 'Não',
      alimentacao: 'Alimentação irregular',
      sono: 'Sono pesado',
      atividade_fisica: 'Não',
      substancias: 'Não',
    },
  },
]

function AnamneseDemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(demoScenarios[0].id)
  const scenario = demoScenarios.find(s => s.id === selectedScenario) ?? demoScenarios[0]
  const result: AnalysisResult = analyzeAnamnese(scenario.answers, {
    patientName: 'Paciente Demo',
    completedAt: new Date().toISOString(),
    demoMode: true,
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageIntro
          eyebrow="Demonstração"
          title="Relatório de Análise Clínica — Demo"
          description="Visualize o relatório gerado pelo motor de análise (v1.0.0) com dados fictícios. Selecione um cenário para validar as regras clínicas antes da aprovação pelo Dr. Frederick."
        />
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">Cenário de demonstração</label>
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {demoScenarios.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => window.print()}>
                Imprimir demonstração
              </Button>
            </div>
          </CardContent>
        </Card>
        <AnamneseReport result={result} onPrint={() => window.print()} onIncludeInPdf={() => {}} />
      </div>
    </AdminLayout>
  )
}
