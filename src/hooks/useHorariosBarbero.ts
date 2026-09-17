import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface HorarioBarbero {
  id: string;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  activo: boolean;
}

export function useHorariosBarbero(barberoId: string | null) {
  const [horarios, setHorarios] = useState<HorarioBarbero[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (silencioso = false) => {
    if (!barberoId) {
      setHorarios([]);
      setCargando(false);
      return;
    }
    if (!silencioso) setCargando(true);

    const { data, error } = await supabase
      .from("horarios_barbero")
      .select("id, dia_semana, hora_inicio, hora_fin, activo")
      .eq("barbero_id", barberoId)
      .order("dia_semana");

    if (!error && data) setHorarios(data as HorarioBarbero[]);
    setCargando(false);
  }, [barberoId]);

  useEffect(() => {
    cargar();

    const canal = supabase
      .channel(`horarios-barbero-${barberoId ?? "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "horarios_barbero" }, () => cargar(true))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar, barberoId]);

  return { horarios, cargando };
}