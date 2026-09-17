import type { Servicio, Barbero } from "../types";

// TODO: cuando conectemos Supabase, esto se reemplaza por:
// const { data } = await supabase.from("servicios").select("*").eq("activo", true)
export const SERVICIOS: Servicio[] = [
  {
    id: "corte-autor",
    nombre: "Corte de autor",
    descripcion:
      "Diseños a la vanguardia y desvanecidos de alta precisión adaptados a tu estilo.",
    duracionMin: 40,
    precio: 35,
  },
  {
    id: "ritual-barba",
    nombre: "Ritual de barba",
    descripcion:
      "Una experiencia premium con vapor, toalla caliente y productos de alta gama para el cuidado de tu piel y barba.",
    duracionMin: 35,
    precio: 30,
  },
  {
    id: "limpieza-express",
    nombre: "Limpieza facial express",
    descripcion:
      "Una renovación rápida que elimina impurezas cotidianas, ideal para refrescar el rostro.",
    duracionMin: 20,
    precio: 25,
  },
  {
    id: "limpieza-profunda",
    nombre: "Limpieza facial profunda",
    descripcion:
      "Tratamiento exhaustivo con exfoliación y nutrición profunda para revitalizar la piel por completo.",
    duracionMin: 45,
    precio: 45,
  },
  {
    id: "ondulacion",
    nombre: "Ondulación",
    descripcion:
      "Textura y volumen personalizado con técnicas avanzadas para un acabado natural y duradero.",
    duracionMin: 50,
    precio: 40,
  },
  {
    id: "tinte",
    nombre: "Tinte",
    descripcion:
      "Cobertura de canas o cambio de color con matices perfectos que cuidan la salud de tu cabello.",
    duracionMin: 60,
    precio: 55,
  },
];

// TODO: reemplazar por consulta a la tabla "barberos"
export const BARBEROS: Barbero[] = [
  { id: "cualquiera", nombre: "Cualquiera disponible", especialidad: "El primero libre" },
  { id: "b1", nombre: "Cristian", especialidad: "Cortes clásicos y fade" },
  { id: "b2", nombre: "Renzo", especialidad: "Barba y diseño" },
  { id: "b3", nombre: "Jhon", especialidad: "Color y estilos modernos" },
];

// Horario de atención (usado para generar los slots del día)
export const HORARIO_ATENCION = { inicio: "09:00", fin: "19:00" };

// TODO: reemplazar por lectura real de la tabla "citas" filtrando por
// barbero_id + fecha, para saber qué horas ya están ocupadas.
export const HORAS_OCUPADAS_MOCK = ["10:00", "10:30", "15:00"];