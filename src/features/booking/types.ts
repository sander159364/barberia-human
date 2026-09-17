export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
}

export interface Barbero {
  id: string;
  nombre: string;
  especialidad: string;
}