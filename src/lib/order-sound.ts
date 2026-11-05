/**
 * Alerta sonoro de pedido novo (sem arquivo de áudio: gerado pelo navegador).
 * Obs.: o navegador só libera som depois que o admin clicou na página uma vez.
 */
let ctx: AudioContext | null = null;

export function playNewOrderSound() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    // "Ding-dong" em 3 toques para chamar atenção
    [0, 0.25, 0.5, 0.9, 1.15, 1.4].forEach((t, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      const start = ctx!.currentTime + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    /* navegador sem suporte a áudio: ignora */
  }
}
