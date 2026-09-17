import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Horario {
  id: string;
  dia_semana: number; // 0 = domingo ... 6 = sábado
  hora_inicio: string;
  hora_fin: string;
}

export function useHorarios() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setSincronizando(true);
    else setCargando(true);

    const { data, error } = await supabase
      .from("horarios")
      .select("id, dia_semana, hora_inicio, hora_fin")
      .eq("activo", true);

    if (!error && data) setHorarios(data);
    setCargando(false);
    setSincronizando(false);
  }, []);

  useEffect(() => {
    cargar();

    // Canal propio y exclusivo para cambios de horarios (habilitar Replication en Supabase para esta tabla)
    const canal = supabase
      .channel("public-horarios-cambios")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "horarios" },
        () => {
          cargar(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  return { horarios, cargando, sincronizando };
}