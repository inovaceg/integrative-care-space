const guidance = [
  { field: 'Nome oficial', example: 'Copie a denominação exibida na capa ou na ficha técnica do material.', note: 'Não acrescente siglas ou edições que não estejam confirmadas.' },
  { field: 'Área(s)', example: 'Selecione uma ou mais das oito áreas que descrevam o foco do instrumento.', note: 'Exemplo de categoria: “Memória e aprendizagem”. A classificação deve refletir a fonte técnica consultada.' },
  { field: 'Público', example: '“Conforme manual: [faixa etária/público indicado na edição consultada]”.', note: 'Não estime idades ou populações a partir do nome do instrumento.' },
  { field: 'Finalidade', example: '“Investigar [domínio] por meio de [descrição geral da fonte]”.', note: 'Faça um resumo próprio; não copie itens, instruções, estímulos ou conteúdo do manual.' },
  { field: 'Versão', example: '“[edição/versão] — [ano, se confirmado na publicação]”.', note: 'Se ainda não verificou a edição aplicada ou disponível, deixe em branco.' },
  { field: 'Situação no SATEPSI', example: '“Pendente de conferência” até consultar a situação oficial.', note: 'Depois, registre a situação e a data da consulta; não presuma aprovação ou validade.' },
  { field: 'Licença', example: '“Pendente de conferência” ou “Aquisição/licença confirmada em [data]”.', note: 'Só marque como confirmada após verificar comprovante e condições de uso.' },
  { field: 'Ativo', example: 'Ative quando o cadastro estiver revisado e disponível para seleção.', note: 'Desative para impedir novas seleções sem apagar o histórico já salvo.' },
];

export function NeuropsychCatalogGuide() {
  return <details className="mb-4 rounded-lg border border-teal-100 bg-teal-50/60 p-4">
    <summary className="cursor-pointer font-medium text-[#123c3d]">Ver modelos de preenchimento do catálogo</summary>
    <p className="mt-3 text-xs leading-relaxed text-slate-600">Exemplos de formato, não dados confirmados de instrumentos. Consulte o manual oficial e os registros de aquisição antes de preencher; não inclua conteúdo protegido.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {guidance.map(({ field, example, note }) => <div key={field} className="rounded-md bg-white p-3">
        <h3 className="text-sm font-semibold text-slate-800">{field}</h3>
        <p className="mt-1 text-sm text-[#21655f]">{example}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>
      </div>)}
    </div>
  </details>;
}
