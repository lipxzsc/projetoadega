/**
 * TERMOS DE USO — regras do serviço, responsabilidade e idade mínima.
 * Texto em linguagem simples (CDC art. 6º, III e art. 46: cláusula que o
 * consumidor não entende não o obriga).
 */
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Bloco } from "@/components/LegalPage";
import { LEGAL_VERSION, formatCNPJ } from "@/lib/legal";
import { useStoreLegal } from "@/lib/use-store-legal";

import { brandMeta } from "@/lib/brand";

export const Route = createFileRoute("/termos")({
  component: TermosPage,
  head: () => ({
    meta: brandMeta("Termos de Uso", "Regras de pedidos, entrega, pagamento e idade mínima na Subzero Delivery."),
  }),
});

function TermosPage() {
  const { data } = useStoreLegal();
  const loja = data?.legal_name || data?.store_name || "a loja";

  return (
    <LegalPage titulo="Termos de Uso" atualizadoEm={LEGAL_VERSION}>
      <Bloco titulo="1. Quem somos">
        <p>
          Este site é operado por <strong>{loja}</strong>
          {data?.cnpj ? `, inscrita no CNPJ ${formatCNPJ(data.cnpj)}` : ""}
          {data?.legal_address ? `, com endereço em ${data.legal_address}` : ""}. Atendemos
          exclusivamente entregas em Lages/SC e região informada no checkout.
        </p>
      </Bloco>

      <Bloco titulo="2. Idade mínima — 18 anos (obrigatório)">
        <p>
          É <strong>proibida a venda de bebidas alcoólicas a menores de 18 anos</strong>
          (Lei 13.106/2015, que alterou o art. 243 do Estatuto da Criança e do Adolescente, e
          Lei 9.294/1996, art. 2º, §1º).
        </p>
        <ul>
          <li>Ao fazer o pedido, você declara ter 18 anos ou mais e assume responsabilidade civil e criminal por essa declaração.</li>
          <li>O entregador pode <strong>exigir documento com foto</strong> no momento da entrega.</li>
          <li>Se não houver maior de idade para receber, a entrega será recusada e o pedido cancelado, podendo ser cobrada a taxa de entrega pelo deslocamento.</li>
          <li>Não entregamos bebida alcoólica em escolas ou eventos infantojuvenis.</li>
        </ul>
      </Bloco>

      <Bloco titulo="3. Pedidos e preços">
        <ul>
          <li>Todos os valores são recalculados pelo nosso servidor no momento do pedido; vale sempre o preço confirmado na tela de acompanhamento.</li>
          <li>Fotos são meramente ilustrativas; embalagens e rótulos podem variar conforme o lote do fabricante.</li>
          <li>O pedido só é considerado aceito depois que a loja muda o status para "preparando".</li>
          <li>Podemos recusar pedidos em caso de falta de estoque, endereço fora da área de entrega, suspeita de fraude ou dados incorretos.</li>
        </ul>
      </Bloco>

      <Bloco titulo="4. Entrega">
        <ul>
          <li>Os prazos informados são estimativas e podem variar por clima, trânsito e volume de pedidos.</li>
          <li>O endereço, o complemento e o ponto de referência são de responsabilidade do cliente. Endereço errado pode gerar nova taxa de entrega.</li>
          <li>A localização por GPS é opcional e serve apenas para orientar o entregador.</li>
        </ul>
      </Bloco>

      <Bloco titulo="5. Pagamento">
        <p>
          Aceitamos PIX, cartão (na entrega) e dinheiro. Para dinheiro, informe o valor para que
          o troco seja separado. <strong>Não armazenamos dados de cartão</strong> — a maquininha é do
          entregador e a transação ocorre fora deste site.
        </p>
      </Bloco>

      <Bloco titulo="6. Uso adequado do site">
        <p>
          É proibido tentar burlar preços, automatizar pedidos, invadir áreas restritas,
          testar vulnerabilidades sem autorização ou usar dados de terceiros. Essas condutas
          podem configurar crime (Lei 12.737/2012 — invasão de dispositivo informático) e levar
          ao bloqueio imediato.
        </p>
      </Bloco>

      <Bloco titulo="7. Responsabilidade">
        <p>
          Respondemos pelos produtos entregues nos termos do Código de Defesa do Consumidor.
          Não respondemos pelo consumo inadequado de bebida alcoólica, por informações falsas
          fornecidas no pedido nem por indisponibilidade temporária do site por causas externas.
        </p>
      </Bloco>

      <Bloco titulo="8. Foro e contato">
        <p>
          Aplica-se a legislação brasileira, com foro da comarca de Lages/SC, salvo o direito do
          consumidor de escolher o foro do seu domicílio (CDC art. 101, I). Dúvidas:{" "}
          {data?.contact_email || "fale conosco pelo WhatsApp da loja"}.
        </p>
      </Bloco>
    </LegalPage>
  );
}
