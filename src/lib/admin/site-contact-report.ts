export type SiteContactReport = {
  full_name: string;
  whatsapp: string;
  birth_date: string | null;
  request_type: string;
  status: string;
  created_at: string;
  questionnaire_answers: Record<string, string | string[]> | null;
  questionnaire_report: string | null;
  professional_notes: string | null;
};

function formatBirthDateAndAge(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  const date = new Date(`${value}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `${date} · ${age} ${age === 1 ? "ano" : "anos"}`;
}

export function buildQuestionnaireReport(contact: Pick<SiteContactReport, "full_name" | "birth_date" | "questionnaire_answers">, questionLabels: Record<string, string>) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const answers = contact.questionnaire_answers ?? {};
  const value = (key: string) => {
    const answer = answers[key];
    return Array.isArray(answer) ? answer.join(", ") : answer ?? "não informado";
  };
  if (contact.request_type === "Questionário de orientação sobre TDAH") {
    const attention = value("tdah_attention");
    const hyperactivity = value("tdah_hyperactivity");
    const contexts = value("tdah_contexts");
    const impact = value("tdah_impact");
    const summary = [
      `A orientação é buscada para ${value("tdah_who")}. Foram relatadas dificuldades de atenção ou organização (${attention}) e sinais de inquietação ou impulsividade (${hyperactivity}).`,
      `Nos últimos seis meses, a frequência foi descrita como ${value("tdah_frequency")}; as dificuldades foram percebidas pela primeira vez ${value("tdah_onset")}.`,
      `Os contextos mencionados são ${contexts}, com efeitos relatados na rotina: ${impact}.`,
      `A busca foi motivada por ${value("tdah_motivation")}; o próximo passo desejado é ${value("tdah_next_step")}.`,
    ];
    const points = [
      `Aprofundar exemplos, frequência e impacto das dificuldades de atenção/organização (${attention}) e inquietação/impulsividade (${hyperactivity}).`,
      `Contextualizar a frequência recente (${value("tdah_frequency")}) e a fase da primeira percepção (${value("tdah_onset")}), considerando o relato e a história de desenvolvimento.`,
      `Explorar as diferenças entre os contextos (${contexts}) e os efeitos na rotina (${impact}).`,
      `Considerar o motivo da busca e o passo desejado: ${value("tdah_motivation")} / ${value("tdah_next_step")}.`,
    ];
    return [
      "SÍNTESE INFORMATIVA — ORIENTAÇÃO INICIAL SOBRE TDAH",
      `Pessoa avaliada: ${contact.full_name}`,
      `Nascimento / idade: ${contact.birth_date ? formatBirthDateAndAge(contact.birth_date) : "Não informado"}`,
      `Relatório gerado em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      "SÍNTESE DAS RESPOSTAS",
      ...summary,
      "",
      "ASPECTOS A APROFUNDAR NA CONVERSA PROFISSIONAL",
      ...points.map(point => `• ${point}`),
      "",
      "Síntese descritiva para apoiar o primeiro contato. Este questionário não é instrumento diagnóstico e não confirma nem descarta TDAH; a avaliação cabe ao profissional responsável.",
    ].join("\\n");
  }
  const areas = value("areas");
  const contexts = value("contexts");
  const impact = value("impact");
  const onset = value("onset");
  const onsetType = value("onset_type");
  const change = value("change");
  const factors = value("factors");
  const hasFactors = factors !== "não informado" && !/não percebi|nenhum|não sei/i.test(factors);
  const synthesis = [
    `A orientação é buscada para: ${value("who")}. As principais dificuldades relatadas são: ${areas}.`,
    `Primeira percepção: ${onset}. Início descrito como ${onsetType}; desde então, ${change}.`,
    `Ficam mais perceptíveis em ${contexts}, com efeitos relatados em ${impact}. ${hasFactors ? `Também é relatada possível coincidência com ${factors}; essa associação temporal, por si só, não permite concluir que haja relação de causa.` : "Não foi identificada uma coincidência específica com o início ou a piora."}`,
    `A busca neste momento é motivada por ${value("reason")}; a preferência indicada para os próximos passos é ${value("goal")}.`,
  ];
  const focusPoints = [
    `Explorar exemplos concretos, frequência e repercussão das dificuldades relatadas (${areas}) nos contextos selecionados (${contexts}), considerando os efeitos na rotina (${impact}).`,
    `Esclarecer a cronologia: primeira percepção (${onset}), modo de início (${onsetType}) e evolução (${change}), distinguindo mudanças recentes de padrões mais antigos.`,
    ...(hasFactors ? [`Investigar a sequência temporal dos fatores mencionados (${factors}), sem presumir causalidade.`] : []),
    `Considerar a motivação e a preferência expressas pela pessoa: ${value("reason")} / ${value("goal")}.`,
  ];
  return [
    "SÍNTESE AVALIATIVA INFORMATIVA — QUESTIONÁRIO DE ORIENTAÇÃO SOBRE AVALIAÇÃO NEUROPSICOLÓGICA",
    `Pessoa avaliada: ${contact.full_name}`,
    `Nascimento / idade: ${contact.birth_date ? formatBirthDateAndAge(contact.birth_date) : "Não informado"}`,
    `Relatório gerado em: ${generatedAt}`,
    "",
    "SÍNTESE DAS RESPOSTAS",
    ...synthesis,
    "",
    "ASPECTOS A APROFUNDAR NA AVALIAÇÃO PROFISSIONAL",
    ...focusPoints.map(point => `• ${point}`),
    "",
    "Síntese descritiva gerada a partir das respostas fornecidas para apoiar a avaliação profissional. Não constitui laudo, diagnóstico, pontuação ou conclusão clínica automática. A interpretação e as conclusões cabem ao profissional responsável.",
  ].join("\n");
}

export function printSiteContactReport(contact: SiteContactReport, questionLabels: Record<string, string>) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.opener = null;
  printWindow.document.title = `Relatório de acompanhamento — ${contact.full_name}`;
  printWindow.document.documentElement.lang = "pt-BR";

  const style = printWindow.document.createElement("style");
  style.textContent = `
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.55; }
    h1 { font-size: 22px; margin: 0; }
    h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 5px; border-bottom: 1px solid #cbd5e1; }
    p { margin: 5px 0; }
    .subtle { color: #64748b; font-size: 10px; }
    .notice { margin-top: 8px; padding: 8px 10px; background: #f1f5f9; border-left: 3px solid #2f8f82; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-top: 16px; }
    .label { color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase; }
    .value { margin-top: 2px; overflow-wrap: anywhere; }
    .answer { break-inside: avoid; margin: 10px 0; }
    .notes { white-space: pre-wrap; overflow-wrap: anywhere; }
  `;
  printWindow.document.head.appendChild(style);

  const title = printWindow.document.createElement("h1");
  title.textContent = "Relatório de acompanhamento";
  printWindow.document.body.appendChild(title);

  const subtitle = printWindow.document.createElement("p");
  subtitle.className = "subtle";
  subtitle.textContent = "Questionário de orientação sobre avaliação neuropsicológica";
  printWindow.document.body.appendChild(subtitle);

  const notice = printWindow.document.createElement("p");
  notice.className = "notice";
  notice.textContent = "Registro informativo baseado nas respostas fornecidas. Não constitui laudo, diagnóstico ou conclusão clínica automática.";
  printWindow.document.body.appendChild(notice);

  const details = printWindow.document.createElement("section");
  details.className = "details";
  const detailValues: [string, string][] = [
    ["Nome", contact.full_name],
    ["WhatsApp", contact.whatsapp],
    ["Nascimento / idade", contact.birth_date ? formatBirthDateAndAge(contact.birth_date) : "Não informada"],
    ["Status do atendimento", contact.status],
    ["Solicitação recebida", new Date(contact.created_at).toLocaleString("pt-BR")],
  ];
  for (const [label, value] of detailValues) {
    const item = printWindow.document.createElement("div");
    const labelNode = printWindow.document.createElement("div");
    labelNode.className = "label";
    labelNode.textContent = label;
    const valueNode = printWindow.document.createElement("div");
    valueNode.className = "value";
    valueNode.textContent = value;
    item.append(labelNode, valueNode);
    details.appendChild(item);
  }
  printWindow.document.body.appendChild(details);

  const reportTitle = printWindow.document.createElement("h2");
  reportTitle.textContent = "Relatório gerado e salvo no contato";
  printWindow.document.body.appendChild(reportTitle);
  const reportContent = printWindow.document.createElement("p");
  reportContent.className = "notes";
  reportContent.textContent = contact.questionnaire_report ?? buildQuestionnaireReport(contact, questionLabels);
  printWindow.document.body.appendChild(reportContent);

  const notesTitle = printWindow.document.createElement("h2");
  notesTitle.textContent = "Observações do profissional";
  printWindow.document.body.appendChild(notesTitle);
  const notes = printWindow.document.createElement("p");
  notes.className = "notes";
  notes.textContent = contact.professional_notes || "Nenhuma observação registrada.";
  printWindow.document.body.appendChild(notes);

  printWindow.onafterprint = () => printWindow.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}
