/**
 * Camada jurídica do app (LGPD / CDC / venda 18+).
 *
 * Aqui ficam apenas CONSTANTES e helpers de consentimento no navegador.
 * Nenhum dado pessoal é gravado no navegador: guardamos só flags booleanas
 * ("aceitou cookies", "declarou ser maior de 18") e a data do aceite.
 *
 * Base legal:
 *  - LGPD (Lei 13.709/2018): art. 7º, V e IX (execução de contrato / legítimo
 *    interesse), art. 8º (consentimento), art. 9º (transparência),
 *    art. 18 (direitos do titular), art. 41 (encarregado/DPO).
 *  - CDC (Lei 8.078/1990): art. 6º (informação), art. 49 (arrependimento em 7
 *    dias nas compras fora do estabelecimento).
 *  - Lei 13.106/2015 + ECA art. 243 e Lei 9.294/1996: proibida a venda de
 *    bebida alcoólica a menores de 18 anos.
 */

/** Versão dos documentos legais — mude a data ao alterar os textos. */
export const LEGAL_VERSION = "2026-08-30";

/** Chaves usadas no localStorage (somente flags, nunca dados pessoais). */
export const CONSENT_KEYS = {
  cookies: "lgpd-cookies-v1",
  age: "lgpd-idade-v1",
} as const;

export type CookieChoice = {
  version: string;
  /** Cookies essenciais são sempre necessários (não há opt-out). */
  essential: true;
  /** Métricas/analytics — só ativa se o cliente aceitar. */
  analytics: boolean;
  acceptedAt: string;
};

const read = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / storage cheio: seguimos sem quebrar a navegação */
  }
};

/* ------------------------- cookies ------------------------- */

export const getCookieChoice = (): CookieChoice | null => {
  const c = read<CookieChoice>(CONSENT_KEYS.cookies);
  return c && c.version === LEGAL_VERSION ? c : null;
};

export const saveCookieChoice = (analytics: boolean): CookieChoice => {
  const choice: CookieChoice = {
    version: LEGAL_VERSION,
    essential: true,
    analytics,
    acceptedAt: new Date().toISOString(),
  };
  write(CONSENT_KEYS.cookies, choice);
  return choice;
};

/* --------------------- idade (18 anos) --------------------- */

export interface AgeChoice {
  version: string;
  confirmedAt: string;
}

export const getAgeConfirmation = (): AgeChoice | null =>
  read<AgeChoice>(CONSENT_KEYS.age);

export const saveAgeConfirmation = (): AgeChoice => {
  const c: AgeChoice = { version: LEGAL_VERSION, confirmedAt: new Date().toISOString() };
  write(CONSENT_KEYS.age, c);
  return c;
};

/** Formata CNPJ 00.000.000/0000-00 (aceita já formatado). */
export const formatCNPJ = (v?: string | null): string => {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length !== 14) return v ?? "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/** Tipos de solicitação do titular (LGPD art. 18). */
export const DATA_REQUEST_KINDS = [
  { value: "acesso", label: "Acessar meus dados" },
  { value: "correcao", label: "Corrigir meus dados" },
  { value: "exclusao", label: "Excluir meus dados" },
  { value: "portabilidade", label: "Portabilidade dos dados" },
  { value: "revogacao", label: "Revogar consentimento" },
] as const;

export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number]["value"];
