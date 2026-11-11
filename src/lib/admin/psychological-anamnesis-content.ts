export const anamnesisSteps = [
  'Identificação',
  'Queixa principal e impacto',
  'Sintomas e escalas',
  'Avaliação de risco e segurança',
  'Histórico de saúde',
  'História pessoal',
  'Dinâmica familiar',
  'Mundo interno, apoio e mudança',
  'Hábitos de vida',
  'Sexualidade',
  'Espiritualidade',
  'Observações adicionais',
  'Consentimento e assinatura',
] as const;

export const anamnesisFieldLabels: Record<string, string> = {
  full_name: 'Nome completo', date_of_birth: 'Data de nascimento', cpf: 'CPF', phone: 'Telefone/WhatsApp', email: 'E-mail', profession: 'Profissão', civil_status: 'Estado civil',
  postal_code: 'CEP', street: 'Logradouro', neighborhood: 'Bairro', street_number: 'Número', address_complement: 'Complemento', city: 'Cidade', state: 'Estado', household: 'Com quem mora?', education: 'Escolaridade',
  main_concern: 'O que trouxe você à consulta hoje? Descreva detalhadamente.', onset: 'Quando os sintomas começaram?', trigger_event: 'Houve algum evento marcante?', treatment_expectation: 'O que você espera alcançar com este acompanhamento?', work_study_impact: 'Como seus sintomas afetam sua produtividade ou rotina de trabalho/estudos?', social_impact: 'Como seus sintomas afetam sua vida social e lazer?', family_impact: 'Como seus sintomas afetam sua relação com a família ou parceiro(a)?', life_impact_scale: 'De 0 a 10, quanto isso está prejudicando sua vida hoje? 0 = nenhum impacto; 10 = impacto extremo.',
  symptoms: 'Quais destes sintomas você sente com frequência?', other_symptoms: 'Há outros sintomas ou detalhes que deseja descrever?', anxiety_scale: 'Seu nível de ansiedade.', stress_scale: 'Seu nível de estresse.', quality_of_life_scale: 'Sua qualidade de vida.', self_esteem_scale: 'Sua autoestima.',
  suicidal_thoughts_ever: 'Já teve pensamentos de tirar a própria vida?', death_thoughts_current: 'Tem tido pensamentos de morte ou vontade de sumir atualmente?', death_thoughts_frequency: 'Com que frequência?', suicide_plan: 'Já pensou em como faria?', access_to_means: 'Tem acesso a meios para se machucar?', protective_factors: 'O que impede você de fazer isso hoje?', thoughts_intensity: 'De 0 a 10, qual a intensidade desses pensamentos?', self_harm_ever: 'Já teve comportamentos de autoagressão, como se cortar ou se bater?', self_harm_details: 'Se sim, descreva quando e como isso ocorre.',
  previous_treatment: 'Já fez terapia ou usou medicações psiquiátricas antes?', previous_treatment_details: 'Se nunca fez, escreva “NUNCA FIZ”.', medication_use: 'Utiliza alguma medicação atualmente?', medication_name_dose: 'Qual é o nome da medicação e a dosagem?', medication_duration: 'Há quanto tempo utiliza?', medication_prescriber: 'Quem prescreveu?', medication_adherence: 'Faz uso corretamente?', medication_benefit: 'Percebe melhora?', physical_health_history: 'Possui doenças físicas ou já passou por cirurgias?', hospitalizations: 'Já precisou ficar internado(a) em hospital geral ou clínica psiquiátrica?', hospitalization_details: 'Qual foi o motivo e o ano?',
  childhood_adolescence: 'Como foram sua infância e adolescência? Considere o ambiente familiar, a escola e os eventos marcantes.', abuse_experiences: 'Já passou por alguma destas situações?', abuse_details: 'Deseja acrescentar detalhes sobre esses acontecimentos?', repeated_patterns: 'Percebe padrões que se repetem em sua vida, como escolhas ou erros?', adult_professional_life: 'Como é sua vida adulta e profissional? Considere carreira, conquistas e dificuldades.',
  mother_relationship: 'Como é ou era sua relação com sua mãe?', father_relationship: 'Como é ou era sua relação com seu pai?', parental_presence: 'Quem foi mais presente na sua criação?', childhood_warmth: 'Você se sentia mais acolhido(a) ou cobrado(a)?', critical_figure: 'Quem era mais crítico na sua infância?', family_mental_health: 'Existe histórico de problemas de saúde mental na família, como depressão, ansiedade, bipolaridade ou dependência química?',
  loneliness: 'Você se sente sozinho(a)?', inner_void: 'Sente um vazio interno?', abandonment_fear: 'Tem medo de ser abandonado(a) ou rejeitado(a)?', inadequacy: 'Sente-se insuficiente ou que nunca é bom o bastante?', frustration: 'Tem dificuldade para lidar com frustrações?', loss_of_control: 'Sente que perde o controle?', impulsivity: 'Age por impulso?', insight: 'Você entende o que está acontecendo com você?', support_person: 'Com quem você pode contar hoje?', immediate_support: 'Se precisasse de ajuda, quem procuraria?', future_projection: 'Se nada mudar, como imagina sua vida daqui a um ano?', desired_change: 'O que você mais deseja mudar em sua vida hoje?',
  daily_routine: 'Como é um dia comum na sua vida, considerando trabalho, estudos e lazer?', sleep: 'Como está seu sono? Tem dificuldade para dormir, acorda muitas vezes ou se sente cansado(a)?', appetite: 'Como está seu apetite? Come por ansiedade?', physical_activity: 'Pratica atividade física? Com que frequência?', leisure: 'O que faz para relaxar ou se divertir?', substances: 'Usa álcool, cigarro ou outras drogas? Com que frequência?',
  sexual_orientation: 'Qual é sua orientação sexual?', gender_identity: 'Qual é sua identidade de gênero?', sexual_activity: 'Mantém relações sexuais atualmente? Com que frequência?', sexual_satisfaction: 'Como avalia seu prazer e sua satisfação sexual?', sexual_difficulties: 'Apresenta dificuldades sexuais, como dores, falta de desejo ou outras questões?',
  religion_belief: 'Qual é sua religião ou crença?', spiritual_practice: 'Possui alguma prática religiosa ou espiritual?', spiritual_frequency: 'Com que frequência pratica ou frequenta?', spiritual_support: 'Como sua fé ou suas crenças ajudam você a lidar com os problemas?', additional_observations: 'Há algo mais que considera importante e que não foi perguntado?',
};

export const consentSections: Array<[string, string[]]> = [
  ['1. IDENTIFICAÇÃO E FINALIDADE', [
    'Este documento tem como finalidade informar ao paciente sobre a coleta, utilização, armazenamento e proteção de seus dados pessoais durante o processo de atendimento psicológico realizado pelo Dr. Frederick Parreira.',
    'O preenchimento da ficha de anamnese tem como objetivo conhecer a história pessoal, familiar, emocional e clínica do paciente, compreender suas necessidades e fornecer informações relevantes para o planejamento e a condução do acompanhamento profissional.',
  ]],
  ['2. DADOS COLETADOS', [
    'Durante o preenchimento da anamnese, poderão ser solicitadas as seguintes informações:',
    'Dados de identificação pessoal, como nome, CPF, data de nascimento e endereço. Dados de contato, como telefone e e-mail. Informações sobre saúde física e mental. Histórico de tratamentos psicológicos e psiquiátricos. Informações sobre medicamentos e internações. Histórico familiar e pessoal. Informações sobre sexualidade e espiritualidade. Relatos sobre experiências emocionais e situações de vulnerabilidade. Informações relacionadas à segurança e ao bem-estar psicológico.',
    'Algumas dessas informações são classificadas como dados pessoais sensíveis, conforme a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).',
  ]],
  ['3. FINALIDADE DO TRATAMENTO', [
    'Os dados coletados serão utilizados exclusivamente para finalidades relacionadas ao atendimento profissional, incluindo: conhecimento da história clínica e pessoal do paciente; compreensão das demandas apresentadas; planejamento e acompanhamento do atendimento psicológico; registro de informações necessárias à prestação do serviço; avaliação da evolução do acompanhamento; cumprimento de obrigações legais, regulatórias e profissionais; proteção da saúde e da integridade do paciente, quando aplicável.',
  ]],
  ['4. CONFIDENCIALIDADE E SIGILO PROFISSIONAL', [
    'As informações fornecidas serão tratadas com confidencialidade e respeito ao sigilo profissional, observando as normas éticas aplicáveis à Psicologia.',
    'O acesso aos dados será restrito às pessoas autorizadas e envolvidas nas atividades necessárias ao atendimento, quando aplicável.',
    'O compartilhamento de informações somente ocorrerá nas hipóteses legalmente permitidas ou exigidas, respeitando os limites éticos e legais, inclusive as situações excepcionais previstas nas normas profissionais.',
  ]],
  ['5. ARMAZENAMENTO E SEGURANÇA', [
    'As informações poderão ser armazenadas em sistemas digitais protegidos, utilizados para gerenciamento das fichas de anamnese e registros profissionais.',
    'Serão adotadas medidas técnicas e administrativas razoáveis para proteger os dados contra acessos não autorizados, perda, alteração, divulgação ou qualquer forma de tratamento inadequado.',
    'Os dados serão conservados pelo período necessário ao cumprimento das finalidades do atendimento e das obrigações legais e profissionais aplicáveis.',
  ]],
  ['6. COMPARTILHAMENTO DE DADOS', [
    'Os dados não serão comercializados ou disponibilizados publicamente.',
    'Poderá ocorrer compartilhamento estritamente necessário com fornecedores de tecnologia responsáveis pelo funcionamento, armazenamento ou segurança dos sistemas utilizados, observadas as medidas de proteção e confidencialidade aplicáveis.',
    'Também poderão ocorrer compartilhamentos nas hipóteses previstas em lei ou necessárias à proteção da vida e da saúde, respeitando os limites legais e éticos.',
  ]],
  ['7. DIREITOS DO TITULAR DOS DADOS', [
    'Nos termos da LGPD, o paciente poderá exercer seus direitos, conforme aplicável, incluindo: confirmar a existência de tratamento de seus dados; solicitar acesso às informações pessoais; solicitar correção de dados incompletos, inexatos ou desatualizados; solicitar informações sobre o compartilhamento de dados; solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a legislação; solicitar informações sobre as consequências da negativa de consentimento, quando este for a base legal utilizada; revogar consentimentos anteriormente concedidos, quando aplicável, observadas as hipóteses legais de conservação dos dados.',
    'O exercício desses direitos deverá respeitar as obrigações legais de manutenção dos registros profissionais.',
  ]],
  ['8. DADOS DE CRIANÇAS E ADOLESCENTES', [
    'Quando o atendimento envolver crianças ou adolescentes, o tratamento de dados observará as disposições legais específicas, incluindo o melhor interesse do menor e, quando exigido, a autorização de seu responsável legal.',
  ]],
  ['9. LIMITES DA ANAMNESE', [
    'O paciente declara estar ciente de que o preenchimento da ficha de anamnese constitui uma etapa inicial de coleta de informações e não substitui uma avaliação psicológica completa, entrevista clínica ou acompanhamento profissional.',
    'As informações fornecidas serão analisadas pelo profissional dentro do contexto do atendimento.',
    'O envio da ficha não representa atendimento de emergência nem garante monitoramento imediato das respostas.',
  ]],
  ['10. DECLARAÇÃO DE CIÊNCIA E CONSENTIMENTO', [
    'Declaro que tive acesso às informações apresentadas neste documento, compreendi as finalidades do tratamento de meus dados pessoais e sensíveis e fui informado(a) sobre meus direitos e as condições de proteção e confidencialidade das informações fornecidas.',
    'Quando o consentimento for a base legal aplicável ao tratamento de meus dados, declaro que o concedo de forma livre, informada, específica e inequívoca, para as finalidades aqui descritas.',
    'Declaro também que as informações fornecidas na ficha de anamnese correspondem ao meu conhecimento e que pude esclarecer eventuais dúvidas sobre o preenchimento.',
  ]],
];

export const symptomOptions = [
  'Ansiedade', 'Tristeza', 'Irritabilidade', 'Falta de energia', 'Falta de motivação',
  'Dificuldade para iniciar o sono', 'Acordar durante a noite', 'Pensamentos repetitivos',
  'Crises de pânico', 'Dificuldade de concentração', 'Alteração de apetite', 'Sensação de vazio',
] as const;

export const abuseOptions = ['Abuso emocional', 'Abuso físico', 'Abuso sexual', 'Negligência'] as const;
export const yesNoOptions = ['Sim', 'Não'] as const;
