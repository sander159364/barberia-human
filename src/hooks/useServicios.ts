import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  orden: number;
  imagen_url: string | null;
}

export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso) setSincronizando(true);
    else setCargando(true);

    const { data, error } = await supabase
      .from("servicios")
      .select("id, nombre, descripcion, duracion_min, precio, orden, imagen_url")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (!error && data) setServicios(data);
    setCargando(false);
    setSincronizando(false);
  }, []);

  useEffect(() => {
    cargar();

    const canal = supabase
      .channel("reservas-servicios")
      .on("postgres_changes", { event: "*", schema: "public", table: "servicios" }, () => cargar(true))
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  return { servicios, cargando, sincronizando };
}