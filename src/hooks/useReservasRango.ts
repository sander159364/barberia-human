import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useReservasRango(fechaInicio: string, fechaFin: string, barberoId: string | null) {
  const [ocupadas, setOcupadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    let activo = true;

    if (!barberoId) {
      setOcupadas(new Set());
      return;
    }

    async function cargar() {
      const [reservasRes, bloqueosRes] = await Promise.all([
        supabase
          .from("reservas")
          .select("fecha, hora")
          .eq("barbero_id", barberoId)
          .in("estado", ["confirmada", "pendiente"])
          .gte("fecha", fechaInicio)
          .lte("fecha", fechaFin),
        supabase
          .from("bloqueos_temporales")
          .select("fecha, hora, expira_en")
          .eq("barbero_id", barberoId)
          .gte("fecha", fechaInicio)
          .lte("fecha", fechaFin),
      ]);

      if (!activo) return;

      const set = new Set<string>();
      reservasRes.data?.forEach((r) => set.add(`${r.fecha}|${r.hora}`));
      bloqueosRes.data?.forEach((b) => {
        if (new Date(b.expira_en).getTime() > Date.now()) {
          set.add(`${b.fecha}|${b.hora}`);
        }
      });
      setOcupadas(set);
    }

    cargar();

    const canal = supabase
      .channel(`reservas-rango-${fechaInicio}-${fechaFin}-${barberoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => cargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "bloqueos_temporales" }, () => cargar())
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [fechaInicio, fechaFin, barberoId]);

  return ocupadas;
}