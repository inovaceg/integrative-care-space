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
  const answers = Object.entries(contact.questionnaire_answers ?? {});
  return [
    "RELATÓRIO INFORMATIVO — QUESTIONÁRIO DE ORIENTAÇÃO SOBRE AVALIAÇÃO NEUROPSICOLÓGICA",
    `Pessoa avaliada: ${contact.full_name}`,
    `Nascimento / idade: ${contact.birth_date ? formatBirthDateAndAge(contact.birth_date) : "Não informado"}`,
    `Relatório gerado em: ${generatedAt}`,
    "",
    "RESPOSTAS",
    ...(answers.length ? answers.flatMap(([key, answer]) => [questionLabels[key] ?? key, Array.isArray(answer) ? answer.join(" · ") : answer, ""]) : ["Questionário ainda não concluído; não há respostas registradas."]),
    "Este registro organiza as informações fornecidas e não constitui laudo, diagnóstico ou conclusão clínica automática. A interpretação cabe ao profissional responsável.",
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
