# Motor de Análise Clínica de Anamnese — Regras (v1.0.0)

## Visão geral

Este documento descreve as regras clínicas (versão 1.0.0) que governam a geração de alertas e pendências no **Relatório de Análise Clínica** para fichas de anamnese.

O motor é interno, determinístico e versionado. Ele **não** envia dados clínicos para serviços externos, **não** cria diagnósticos e **não** classifica pacientes como "sem risco". Todas as sinalizações são baseadas exclusivamente nas respostas informadas pelo paciente na ficha de anamnese.

## Regras aprovadas (v1.0.0)

### 1. Pensamentos de morte, autolesão ou suicídio atuais

**Regra:** Pensamentos de morte, autolesão ou suicídio relatados como **atuais** devem sinalizar **necessidade de avaliação profissional imediata**, **sem determinar automaticamente risco iminente**.

**O que acontece:**
- Gera um alerta de **alta prioridade** com título: "Pensamentos de morte, autolesão ou suicídio relatados como atuais"
- Mostra a pergunta original: "Já teve pensamentos de morte, autolesão ou suicídio?"
- Mostra a resposta original (ex: "Sim, neste momento")
- Fornece recomendação: "Avalie a necessidade de encaminhamento urgente para atendimento presencial ou serviço de emergência, conforme julgamento clínico."

**Perguntas secundárias geradas (se aplicável):**
- Se a resposta for "Sim, neste momento" e "Esses pensamentos estão presentes neste momento?" for "Sim" → alerta adicional de alta prioridade
- Se a resposta for "Sim, neste momento" e "Existe planejamento?" for "Sim" → alerta adicional de alta prioridade
- Se a resposta for "Sim, neste momento" e "Possui acesso aos meios mencionados?" for "Sim" → alerta adicional de alta prioridade

### 2. Histórico desses pensamentos no passado

**Regra:** Histórico desses pensamentos no passado deve gerar **revisão prioritária**, com orientação para esclarecer a situação atual e a rede de apoio.

**O que acontece:**
- Gera um alerta de **prioridade média** com título: "Pensamentos de morte, autolesão ou suicídio no passado"
- Mostra a pergunta original e a resposta (ex: "Sim, no passado")
- Fornece recomendação: "Durante a consulta, esclareça se a situação mudou e avalie a rede de apoio atual."

**Perguntas secundárias geradas (se aplicável):**
- Se "Já houve tentativa anterior ou autolesão?" tiver resposta → pendência para revisão do histórico
- Se "Existe alguém que procuraria imediatamente em uma crise?" for "Sim" → verifica se os dados da rede de apoio estão completos

### 3. A resposta "prefiro conversar pessoalmente"

**Regra:** A resposta "prefiro conversar pessoalmente" deve gerar uma **pendência para a consulta**, mas **não deve, isoladamente, elevar a prioridade clínica**.

**O que acontece:**
- Gera uma **pendência** (não um alerta) com título: "Prefere conversar pessoalmente sobre [tópico]"
- Mostra a pergunta original e a resposta
- Fornece recomendação: "Aborde o tema durante a consulta presencial, conforme o conforto do paciente."

**Aplica-se a:**
- Pensamentos de morte, autolesão ou suicídio
- Traumas, perdas, violência ou abuso
- Dificuldades relacionadas à sexualidade

### 4. Sem limiares automáticos de ansiedade, tristeza ou prejuízo

**Regra:** Não existem limiares automáticos de ansiedade, tristeza ou prejuízo na qualidade de vida nesta primeira versão. Mostre os valores informados e destaque sua relevância para avaliação profissional, sem criar diagnósticos.

**O que acontece:**
- As escalas (ansiedade 0–10, tristeza 0–10, prejuízo 0–10) são exibidas como **informações** (não alertas)
- Cada escala mostra o valor informado pelo paciente e uma nota: "Valor informado pelo paciente. Relevante para avaliação profissional — não constitui diagnóstico."
- Sem classificação automática de gravidade (ex: ansiedade > 7 = alerta)

### 5. Nunca classifique um paciente como "sem risco"

**Regra:** Nunca classifique um paciente como "sem risco". Utilize "Nenhum alerta identificado pelas regras disponíveis", acompanhado de aviso de que isso **não** substitui avaliação clínica.

**O que acontece:**
- Se **nenhum alerta** for gerado pelas regras acima, o relatório mostra: "Nenhum alerta identificado pelas regras disponíveis"
- Acompanha-se um aviso claro: "Isso **não** substitui a avaliação clínica profissional. A ausência de alertas automáticos não significa ausência de risco ou necessidade clínica. O profissional deve conduzir a avaliação completa durante a consulta."

### 6. Todas as sinalizações devem mostrar a pergunta e a resposta original que as motivaram

**Regra:** Todas as sinalizações (alertas e pendências) devem mostrar a pergunta original e a resposta que as motivaram.

**O que acontece:**
- Cada alerta/pendência inclui:
  - A pergunta exata do paciente
  - A resposta exata do paciente
  - O motivo pelo qual essa combinação gerou a sinalização

### 7. Informações ausentes, contraditórias ou ambíguas devem aparecer como pendências, sem suposições

**Regra:** Informações ausentes, contraditórias ou ambíguas devem aparecer como pendências, sem suposições.

**Exemplos de pendências geradas:**
- Doença relatada como "Sim", mas sem detalhes → pendência "Doenças relatadas sem detalhes"
- Alergia relatada como "Sim", mas sem detalhes → pendência "Alergias relatadas sem detalhes"
- Medicamento relatado como "Sim", mas sem detalhes → pendência "Medicamentos relatados sem detalhes"
- Acompanhamento relatado como "Sim", mas sem detalhes → pendência "Acompanhamento relatado sem detalhes"
- Atividade física relatada como "Sim", mas sem detalhes → pendência "Atividade física relatada sem detalhes"
- Substâncias relatadas como "Sim", mas sem detalhes → pendência "Uso de substâncias relatado sem detalhes"
- Tratamento anterior relatado como "Sim", mas sem detalhes → pendência "Tratamento anterior relatado sem detalhes"
- Sintoma "Outro" selecionado, mas sem explicação → pendência "Sintoma 'Outro' selecionado sem detalhes"
- Exame relatado como "Vou apresentar durante a consulta" → pendência "Exames laboratoriais a serem apresentados"

### 8. O relatório deve funcionar para todas as anamneses já preenchidas e para as novas fichas

**Regra:** O relatório deve funcionar para todas as anamneses já preenchidas e para as novas fichas.

**O que acontece:**
- O motor de análise é acionado automaticamente quando uma anamnese é concluída
- Funciona para dados existentes no banco de dados
- Funciona para novas respostas durante o preenchimento

### 9. O relatório deve aparecer ao final da ficha, com visual profissional, organizado por categorias, e com opções para imprimir ou incluir no PDF

**Regra:** O relatório deve aparecer ao final da ficha, com visual profissional, organizado por categorias, e com opções para imprimir ou incluir no PDF.

**O que acontece:**
- O relatório aparece **após** as informações básicas da anamnese
- Organizado em seções:
  - Resumo da análise
  - Alertas clínicos (separados por alta/média/baixa/informativo)
  - Pendências para a consulta
  - Escalas informadas
  - Conclusão de apoio profissional
  - Aviso legal
- Botões:
  - "Imprimir / Salvar PDF" (abre a janela de impressão)
  - "Incluir no PDF da ficha" (adiciona ao PDF da ficha completa)

### 10. Utilize um motor interno, determinístico e versionado, sem Gemini, OpenAI ou envio de informações clínicas para serviços externos

**Regra:** Utilize um motor interno, determinístico e versionado, sem Gemini, OpenAI ou envio de informações clínicas para serviços externos.

**O que acontece:**
- Todo o código está no repositório (src/lib/admin/anamnese-analysis.ts)
- Versão: `ANAMNESE_ANALYSIS_VERSION = '1.0.0'`
- Sem dependências externas para IA ou análise clínica
- Determinístico: mesmas entradas → mesmas saídas

### 11. Preserve a autenticação, as permissões de acesso e as respostas originais dos pacientes

**Regra:** Preserve a autenticação, as permissões de acesso e as respostas originais dos pacientes.

**O que acontece:**
- O motor **não** altera as respostas originais armazenadas
- Apenas lê as respostas para análise
- Mantém as permissões de acesso existentes
- Não modifica o banco de dados

### 12. Nesta primeira etapa, não execute migrações nem altere o banco. A análise pode ser gerada sob demanda, sem persistência

**Regra:** Nesta primeira etapa, não execute migrações nem altere o banco. A análise pode ser gerada sob demanda, sem persistência.

**O que acontece:**
- Sem SQL de migração
- Sem alterações em tabelas
- Análise gerada em tempo real quando solicitado
- Sem armazenamento de resultados de análise no banco

## Fluxo de trabalho de implementação

### 1. Validação pelo Dr. Frederick (ou profissional responsável)

**Antes de ativar as regras clínicas, apresente a versão final da tabela de regras para validação.**

**Passos:**
1. Revise as regras acima
2. Valide contra as necessidades clínicas
3. Confirme que as regras satisfazem os requisitos do usuário
4. Aprovação: as regras entram em vigor para todos os usuários

**Enquanto não houver essa validação, mantenha a funcionalidade em modo de demonstração com dados fictícios.**

### 2. Implementação da interface

**Após a aprovação, implemente a interface e realize testes com dados fictícios, especialmente nos cenários de saúde emocional e segurança.**

**Passos:**
1. Adicione o componente `AnamneseReport` à interface do usuário
2. Integre com o motor de análise (`analyzeAnamnese`)
3. Teste com os cenários de demonstração
4. Valide a experiência do usuário (impressão, PDF, navegação)
5. Execute testes de integração

### 3. Testes

**Cenários de teste principais:**
- Pensamentos suicidas atuais com planejamento e acesso a meios
- Histórico de pensamentos suicidas no passado
- Resposta "prefiro conversar pessoalmente"
- Anamnese sem alertas (sem risco)
- Informações ausentes/contraditórias

### 4. Validação

**Valide que:**
- Todas as regras são aplicadas corretamente
- Alertas mostram pergunta e resposta originais
- Pendências são geradas para informações ausentes
- Escalas são exibidas sem limiares automáticos
- O relatório aparece ao final da ficha
- A impressão/PDF funciona corretamente
- A autenticação e permissões são preservadas

## Arquivos modificados

1. `src/lib/admin/anamnese-analysis.ts` — Motor de análise (v1.0.0)
2. `src/components/admin/anamnese-report.tsx` — Componente de relatório UI
3. `src/components/admin/patients/anamnese-tab.tsx` — Integração com a aba de anamnese
4. `src/routes/admin/pacientes/$id/anamnese.tsx` — Relatório na visualização de anamnese concluída
5. `src/routes/admin/anamneses/demo.tsx` — Página de demonstração
6. `src/routes/admin/anamneses.tsx` — Adiciona link para demonstração

## Arquivos de teste

- `src/lib/admin/anamnese-analysis.test.ts` — Testes unitários para o motor de análise

## Observações de segurança

- **O motor NÃO substitui o julgamento clínico** — é uma ferramenta de apoio
- **Todas as decisões clínicas permanecem com o profissional**
- **O relatório é apenas um apoio — não um diagnóstico**
- **A segurança do paciente é responsabilidade do profissional**

## Próximos passos após aprovação

1. Obtenha aprovação do Dr. Frederick para as regras v1.0.0
2. Execute os testes de demonstração
3. Valide a interface do usuário
4. Execute testes de integração
5. Implemente em produção
6. Monitore e colete feedback

## Contato para dúvidas

Para dúvidas sobre as regras ou implementação, consulte o responsável pelo desenvolvimento do motor de análise.