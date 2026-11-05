/**
 * Regras de "loja aberta".
 *
 * A loja só é considerada aberta quando:
 *   1) o interruptor manual (store_settings.is_open) está ligado, E
 *   2) o horário atual está dentro da faixa cadastrada para o dia (store_hours).
 *
 * Se nenhum horário estiver cadastrado, vale apenas o interruptor manual.
 * Faixas que "viram a noite" (ex.: 18:00 → 03:00) são suportadas.
 */

export interface StoreHourRow {
  weekday: number;      // 0 = domingo … 6 = sábado
  opens_at: string;     // "18:00:00"
  closes_at: string;    // "23:30:00"
  is_closed: boolean;   // dia sem atendimento
}

export const WEEKDAY_LABELS = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
] as const;

/** Converte "HH:MM[:SS]" em minutos desde a meia-noite. */
const toMinutes = (hhmm: string): number => {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

/** Exibe "18:00" a partir de "18:00:00". */
export const shortTime = (t: string): string => t.slice(0, 5);

/** Verifica se `now` está dentro da faixa de um dia (com suporte a virada de noite). */
function dentroDaFaixa(row: StoreHourRow, minutosAgora: number, mesmoDia: boolean): boolean {
  if (row.is_closed) return false;
  const abre = toMinutes(row.opens_at);
  const fecha = toMinutes(row.closes_at);
  if (fecha > abre) {
    // Faixa normal, dentro do mesmo dia.
    return mesmoDia && minutosAgora >= abre && minutosAgora < fecha;
  }
  // Faixa que atravessa a meia-noite.
  return mesmoDia ? minutosAgora >= abre : minutosAgora < fecha;
}

/**
 * Retorna se o horário atual está dentro do atendimento.
 * `null` quando não há horários cadastrados (regra não se aplica).
 */
export function dentroDoHorario(hours: StoreHourRow[] | null | undefined, now = new Date()): boolean | null {
  if (!hours || hours.length === 0) return null;
  const minutos = now.getHours() * 60 + now.getMinutes();
  const hoje = hours.find((h) => h.weekday === now.getDay());
  const ontem = hours.find((h) => h.weekday === (now.getDay() + 6) % 7);
  const abertoHoje = hoje ? dentroDaFaixa(hoje, minutos, true) : false;
  const abertoOntem = ontem ? dentroDaFaixa(ontem, minutos, false) : false;
  return abertoHoje || abertoOntem;
}

/** Texto amigável do horário de hoje ("18:00 às 23:30" / "Fechado hoje"). */
export function horarioDeHoje(hours: StoreHourRow[] | null | undefined, now = new Date()): string | null {
  const hoje = hours?.find((h) => h.weekday === now.getDay());
  if (!hoje) return null;
  return hoje.is_closed ? "Fechado hoje" : `${shortTime(hoje.opens_at)} às ${shortTime(hoje.closes_at)}`;
}

/** Resultado final: loja aberta considerando interruptor manual + horários. */
export function lojaAberta(
  isOpenManual: boolean | undefined | null,
  hours: StoreHourRow[] | null | undefined,
  now = new Date(),
): boolean {
  if (isOpenManual === false) return false;
  const noHorario = dentroDoHorario(hours, now);
  return noHorario === null ? true : noHorario;
}
