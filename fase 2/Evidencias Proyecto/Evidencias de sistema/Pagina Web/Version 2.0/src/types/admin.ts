export type User = {
  id: string;
  nombre: string;
  correo: string;
  rut: string;
  telefono: string | null;
  rol: "ADMIN" | "USUARIO";
  activo: boolean;
  correoVerificadoEn: string | null;
  creadoEn: string;
  _count?: {
    trabajos: number;
    postulaciones: number;
    resenasRecibidas: number;
  };
};
export type Person = { id: string; nombre: string };
export type Job = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  comuna: string;
  presupuesto: number;
  estado: string;
  oculto: boolean;
  creadoEn: string;
  propietario: Person;
  _count?: { postulaciones: number };
  postulaciones?: {
    id: string;
    estado: string;
    creadoEn: string;
    usuario: Person;
  }[];
};
export type Category = {
  id: string;
  nombre: string;
  activo: boolean;
  _count: { trabajos: number };
};
export type Review = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  oculta: boolean;
  autor: Person;
  receptor: Person;
  trabajo: { id: string; titulo: string };
};
export type Audit = {
  id: string;
  actor: Person;
  accion: string;
  recurso: string;
  recursoId: string;
  motivo: string;
  creadoEn: string;
  cambios: unknown;
};
export type Summary = {
  usuarios: number;
  activos: number;
  trabajos: number;
  postulaciones: number;
  resenas: number;
  estados: { estado: string; _count: { _all: number } }[];
};
export type Role = { codigo: string; nombre: string; descripcion: string };
