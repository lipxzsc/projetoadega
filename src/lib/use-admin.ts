/**
 * Hook que retorna se o usuário logado tem papel admin.
 * Usado para gating de telas administrativas no client.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(): { loading: boolean; isAdmin: boolean; userId: string | null } {
  const [state, setState] = useState({ loading: true, isAdmin: false, userId: null as string | null });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) {
        if (active) setState({ loading: false, isAdmin: false, userId: null });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setState({ loading: false, isAdmin: !!data, userId: uid });
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
