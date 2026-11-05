// Logo empacotado no próprio site para funcionar em qualquer hospedagem (ex.: Netlify).
import artwork from "@/assets/subzero-logo.png";
import icon from "@/assets/subzero-icon.png";

/** Identidade pública: nunca inclua credenciais neste módulo. */
export const STORE_NAME = "Subzero Delivery";
export const STORE_ARTWORK = artwork;
export const STORE_ICON = icon;

export function brandMeta(page: string, description: string) {
  const title = `${page} | ${STORE_NAME}`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}