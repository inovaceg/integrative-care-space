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
    <p>Ao enviar o formulário geral de contato e autorizar o retorno, o site registra seu nome, WhatsApp, tipo de pedido, data e status do atendimento. E-mail, área de interesse e mensagem são usados para preparar a conversa no WhatsApp e não são armazenados no site. No questionário de orientação sobre avaliação neuropsicológica, as respostas permanecem somente na memória da página durante a visita: não são enviadas, gravadas, incluídas em URL, logs ou ferramentas de análise.</p>
    <p>Se você optar por solicitar contato ao final do questionário e autorizar o retorno pelo WhatsApp, o site registra somente o nome informado, WhatsApp, tipo de retorno solicitado, data e status do atendimento. As respostas ao questionário não são associadas ao cadastro.</p>
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
