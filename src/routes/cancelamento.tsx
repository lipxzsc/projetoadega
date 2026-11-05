/**
 * POLÍTICA DE CANCELAMENTO, TROCA E DEVOLUÇÃO.
 *
 * Base legal:
 *  - CDC art. 49: direito de arrependimento em 7 dias nas compras fora do
 *    estabelecimento (internet). Ele existe, mas na prática não alcança
 *    produtos já consumidos/abertos, alimentos perecíveis e itens de consumo
 *    imediato — por isso o texto explica exatamente quando cabe devolução.
 *  - CDC art. 18 e 26: vício do produto (item estragado, vencido, faltando)
 *    tem 30 dias para reclamar em produtos não duráveis.
 *  - RDC/Anvisa e boas práticas sanitárias: alimentos e gelo entregues não
 *    podem retornar ao estoque.
 */
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Bloco } from "@/components/LegalPage";
import { LEGAL_VERSION } from "@/lib/legal";
import { useStoreLegal } from "@/lib/use-store-legal";

import { brandMeta } from "@/lib/brand";

export const Route = createFileRoute("/cancelamento")({
  component: CancelamentoPage,
  head: () => ({
    meta: brandMeta("Cancelamento e Trocas", "Consulte as condições de cancelamento, devolução e troca de produtos da Subzero Delivery."),
  }),
});

function CancelamentoPage() {
  const { data } = useStoreLegal();

  return (
    <LegalPage titulo="Cancelamento e Trocas" atualizadoEm={LEGAL_VERSION}>
      <Bloco titulo="1. Cancelar antes do preparo — sempre possível">
        <p>
          Enquanto o pedido estiver no status <strong>"Pedido recebido"</strong>, você pode cancelar
          sem custo pelo atendimento (chat do site ou WhatsApp). Pagamentos por PIX já feitos são
          devolvidos integralmente em até 7 dias úteis na mesma chave.
        </p>
      </Bloco>

      <Bloco titulo="2. Depois que a loja começa a preparar ou o pedido sai para entrega">
        <p>
          A partir do status <strong>"preparando"</strong>, o cancelamento depende da nossa
          confirmação: produtos já separados, resfriados ou preparados podem ser cobrados.
          Se o pedido já <strong>saiu para entrega</strong>, pode ser cobrada a taxa de entrega
          referente ao deslocamento.
        </p>
      </Bloco>

      <Bloco titulo="3. Direito de arrependimento (7 dias) — o que se aplica de verdade">
        <p>
          O art. 49 do Código de Defesa do Consumidor garante 7 dias para desistir de compras
          feitas pela internet. Na nossa loja isso funciona assim:
        </p>
        <ul>
          <li>
            <strong>Cabe devolução</strong>: bebidas e snacks industrializados que continuem
            <strong> lacrados</strong>, com embalagem íntegra, sem sinais de uso, refrigeração ou
            violação do lacre — devolvidos em até 7 dias corridos da entrega.
          </li>
          <li>
            <strong>Não cabe devolução por arrependimento</strong>: produtos abertos, consumidos ou
            com lacre rompido; alimentos preparados/perecíveis; gelo e itens que exigem cadeia de
            frio; copos e descartáveis fora da embalagem original. Por razões sanitárias
            (normas da Anvisa) esses itens não podem voltar ao estoque.
          </li>
          <li>
            Aprovada a devolução, o valor é restituído em até 10 dias após conferirmos o produto,
            pelo mesmo meio de pagamento.
          </li>
        </ul>
      </Bloco>

      <Bloco titulo="4. Produto com defeito, vencido, trocado ou faltando">
        <p>
          Isso é <strong>vício do produto</strong> (CDC art. 18) e nada tem a ver com arrependimento:
          fale com a gente em até <strong>30 dias</strong> (art. 26, I). Envie foto do item e do
          número do pedido. Resolvemos por troca, novo envio ou devolução do valor, sem custo
          para você. Item errado ou faltante na sacola é corrigido no mesmo dia sempre que possível.
        </p>
      </Bloco>

      <Bloco titulo="5. Recusa na entrega por falta de maior de 18 anos">
        <p>
          Bebidas alcoólicas só são entregues a maiores de 18 anos, mediante documento
          (Lei 13.106/2015). Se não houver quem receba legalmente, o pedido volta para a loja:
          devolvemos o valor dos produtos, descontada a taxa de entrega pelo deslocamento.
        </p>
      </Bloco>

      <Bloco titulo="6. Como solicitar">
        <p>
          Pelo chat de atendimento do site, pelo WhatsApp da loja
          {data?.contact_email ? ` ou pelo e-mail ${data.contact_email}` : ""}, informando o número do
          pedido. Respondemos em até 48 horas úteis.
        </p>
      </Bloco>
    </LegalPage>
  );
}
