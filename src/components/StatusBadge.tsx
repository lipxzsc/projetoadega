/** Badge de status do pedido com cor semântica. */
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/format";
import { CheckCircle2, ChefHat, Clock, PackageCheck, Truck, XCircle } from "lucide-react";
import type { ReactNode } from "react";

const STYLES: Record<string, { className: string; icon: ReactNode }> = {
  recebido:      { className: "bg-muted text-muted-foreground",                       icon: <Clock className="size-3" /> },
  preparando:    { className: "bg-warning/20 text-warning border-warning/30",         icon: <ChefHat className="size-3" /> },
  pronto:        { className: "bg-primary/20 text-primary border-primary/30",         icon: <PackageCheck className="size-3" /> },
  saiu_entrega:  { className: "bg-primary/20 text-primary border-primary/30",         icon: <Truck className="size-3" /> },
  entregue:      { className: "bg-success/20 text-success border-success/30",         icon: <CheckCircle2 className="size-3" /> },
  cancelado:     { className: "bg-destructive/20 text-destructive border-destructive/30", icon: <XCircle className="size-3" /> },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? STYLES.recebido;
  return (
    <Badge variant="outline" className={`gap-1 ${s.className}`}>
      {s.icon}
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
