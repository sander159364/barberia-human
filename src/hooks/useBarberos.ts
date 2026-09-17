import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Barbero {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

export function useBarberos(servicioId: string | null) {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (!servicioId) {
      setBarberos([]);
      setCargando(false);
      return;
    }
    if (silencioso) setSincronizando(true);
    else setCargando(true);

    const { data, error } = await supabase
      .from("servicios_barberos")
      .select("barbero_id, barberos!inner(id, nombre, imagen_url, activo)")
      .eq("servicio_id", servicioId)
      .eq("barberos.activo", true);

    if (!error && data) {
      const lista = data
        .map((r: any) => r.barberos as { id: string; nombre: string; imagen_url: string | null })
        .filter(Boolean);
      setBarberos(lista);
    }
    setCargando(false);
    setSincronizando(false);
  }, [servicioId]);

  useEffect(() => {
    cargar();

    const canal = supabase
      .channel(`barberos-servicio-${servicioId ?? "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "servicios_barberos" }, () => cargar(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "barberos" }, () => cargar(true))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar, servicioId]);

  return { barberos, cargando, sincronizando };
}