import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/page-parts";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => createSeoHead({ title: "Política de Privacidade | Espaço de Saúde Integrativa", description: "Saiba como o Espaço de Saúde Integrativa trata as informações enviadas pelos formulários do site.", path: "/politica-de-privacidade", twitterCard: "summary" }),
  component: Page,
});

function Page() {
  return <><PageIntro eyebrow="LGPD" title="Política de Privacidade" text="Transparência sobre o uso das informações enviadas por você." /><section className="section-space"><article className="container-site prose-legal">
    <h2>Informações de contato</h2>
    <p>Ao enviar o formulário geral de contato e autorizar o retorno, o site registra seu nome, WhatsApp, tipo de pedido, data e status do atendimento. E-mail, área de interesse e mensagem são usados para preparar a conversa no WhatsApp e não são armazenados no site. Antes de iniciar o questionário de orientação neuropsicológica, seu primeiro nome, WhatsApp e a data de nascimento da pessoa avaliada são registrados após sua autorização. Ao concluir o questionário, as respostas são vinculadas a esse pedido para consulta pela equipe autorizada.</p>
    <p>As respostas são mantidas no registro protegido de contato do site e não são incluídas na mensagem aberta no WhatsApp, em URLs ou em eventos de análise. Se o questionário não for concluído, as respostas que ficaram na página não são salvas.</p>
    <h2>Como as informações são utilizadas</h2>
    <p>Os dados mínimos de contato são utilizados exclusivamente para responder ao pedido enviado. O acesso aos contatos registrados é restrito à equipe autorizada do Espaço de Saúde Integrativa.</p>
    <h2>Compartilhamento e segurança</h2>
    <p>As informações não são comercializadas. São aplicadas medidas técnicas e organizacionais para limitar o acesso aos dados de contato às pessoas autorizadas.</p>
    <h2>Direitos do titular</h2>
    <p>Você pode solicitar informações, correção ou exclusão dos dados de contato mantidos durante o atendimento pelo telefone (32) 99193-1779.</p>
    <h2>Cookies e análise</h2>
    <p>As respostas do questionário de orientação não são enviadas para análise ou publicidade. Para informações sobre cookies e demais tecnologias, entre em contato com a equipe.</p>
  </article></section></>;
}
