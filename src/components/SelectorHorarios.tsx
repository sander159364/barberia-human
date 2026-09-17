import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import type { Servicio } from "../hooks/useServicios";
import { useHorariosBarbero, type HorarioBarbero } from "../hooks/useHorariosBarbero";
import { useReservasRango } from "../hooks/useReservasRango";

function generarHorasDelDia(horaInicio: string, horaFin: string, duracionMin: number) {
  const horas: string[] = [];
  let [h, m] = horaInicio.split(":").map(Number);
  let [hf, mf] = horaFin.split(":").map(Number);

  // Si "hasta" es igual o menor que "desde", asumimos que la franja cruza la medianoche
  if (hf * 60 + mf <= h * 60 + m) {
    hf += 24;
  }

  while (h < hf || (h === hf && m < mf)) {
    horas.push(`${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    m += duracionMin;
    while (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return horas;
}

function generarProximosDias(cantidad: number) {
  const dias = [];
  const hoy = new Date();
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    dias.push(d);
  }
  return dias;
}

function formatearAmPm(hora24: string) {
  const [hhOriginal, mm] = hora24.split(":").map(Number);
  const hh = hhOriginal % 24;
  const meridiano = hh >= 12 ? "PM" : "AM";
  let hora12 = hh % 12;
  if (hora12 === 0) hora12 = 12;
  return `${hora12}:${String(mm).padStart(2, "0")} ${meridiano}`;
}

const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function diaTieneAtencion(dia: Date, horarios: HorarioBarbero[]) {
  const fila = horarios.find((h) => h.dia_semana === dia.getDay());
  return !!(fila && fila.activo && fila.hora_inicio && fila.hora_fin);
}

function primerDiaDisponible(dias: Date[], horarios: HorarioBarbero[]) {
  const conAtencion = dias.find((d) => diaTieneAtencion(d, horarios));
  return conAtencion ?? dias[0];
}

interface Props {
  barberoId: string | null;
  servicio: Servicio | null;
  horaSeleccionada: { fecha: string; hora: string } | null;
  onSeleccionar: (fecha: string, hora: string) => void;
}

export function SelectorHorarios({ barberoId, servicio, horaSeleccionada, onSeleccionar }: Props) {
  const { horarios, cargando: cargandoHorarios } = useHorariosBarbero(barberoId);
  const dias = useMemo(() => generarProximosDias(14), []);
  const [fechaActiva, setFechaActiva] = useState(() => {
    const dia = primerDiaDisponible(dias, horarios);
    return dia.toISOString().split("T")[0];
  });

  const fechaInicio = dias[0].toISOString().split("T")[0];
  const fechaFin = dias[dias.length - 1].toISOString().split("T")[0];
  const ocupadas = useReservasRango(fechaInicio, fechaFin, barberoId);

  const hoyISO = new Date().toISOString().split("T")[0];
  const esHoy = fechaActiva === hoyISO;
  const ahoraMin = esHoy ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const filaActiva = useMemo(() => {
    const diaSemana = new Date(fechaActiva + "T00:00:00").getDay();
    return horarios.find((h) => h.dia_semana === diaSemana);
  }, [fechaActiva, horarios]);

  const horasDelDia = useMemo(() => {
    if (!filaActiva?.activo || !filaActiva.hora_inicio || !filaActiva.hora_fin || !servicio) return [];
    return generarHorasDelDia(filaActiva.hora_inicio, filaActiva.hora_fin, servicio.duracion_min);
  }, [filaActiva, servicio]);

  if (!servicio || !barberoId) return null;

  if (cargandoHorarios) {
    return <p className="font-body text-sm text-criss">Cargando horario del barbero...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => {
          const iso = d.toISOString().split("T")[0];
          const activo = iso === fechaActiva;
          const cerrado = !diaTieneAtencion(d, horarios);
          const esHoyBtn = iso === hoyISO;

          return (
            <button
              key={iso}
              type="button"
              disabled={cerrado}
              onClick={() => setFechaActiva(iso)}
              title={cerrado ? "El barbero no atiende este día" : undefined}
              className={`flex min-w-[64px] flex-col items-center rounded-lg border px-3 py-2 transition-colors ${
                cerrado
                  ? "cursor-not-allowed border-carbon-2 bg-carbon text-neutral-600"
                  : activo
                  ? "border-amarillo bg-amarillo/10 text-blanco"
                  : "border-carbon-2 text-criss hover:border-criss"
              }`}
            >
              <span className="font-body text-xs uppercase">{NOMBRES_DIA[d.getDay()]}</span>
              <span className="font-display text-sm">{d.getDate()}</span>
              <span className="mt-0.5 font-body text-[10px] uppercase">
                {cerrado ? "Cerrado" : esHoyBtn ? "Hoy" : "\u00A0"}
              </span>
            </button>
          );
        })}
      </div>

      {horasDelDia.length === 0 ? (
        <p className="font-body text-sm text-criss">No hay atención ese día. Elige otra fecha.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {horasDelDia.map((hora) => {
              const clave = `${fechaActiva}|${hora}`;
              const ocupado = ocupadas.has(clave);
              const [hh, mm] = hora.split(":").map(Number);
              const yaPaso = esHoy && hh * 60 + mm <= ahoraMin;
              const bloqueado = ocupado || yaPaso;
              const seleccionado = horaSeleccionada?.fecha === fechaActiva && horaSeleccionada?.hora === hora;

              return (
                <button
                  key={hora}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => onSeleccionar(fechaActiva, hora)}
                  className={`flex items-center justify-center gap-1 rounded-lg border py-2 font-body text-sm font-medium transition-colors ${
                    bloqueado
                      ? "cursor-not-allowed border-carbon-2 bg-carbon text-neutral-500"
                      : seleccionado
                      ? "border-amarillo bg-amarillo text-negro"
                      : "border-green-600/50 bg-green-600/10 text-green-400 hover:bg-green-600/20"
                  }`}
                >
                  {yaPaso && !ocupado && <Lock size={12} />}
                  {formatearAmPm(hora)}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 border-t border-carbon-2 pt-4 font-body text-xs text-criss">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-green-600/50" /> Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-carbon border border-carbon-2" /> Ocupado / no disponible
            </span>
          </div>
        </>
      )}
    </div>
  );
}