"use client";
import { useEffect, useState } from "react";
import { request } from "@/services/client";
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true;
    request<T>(`/api/admin/${path}`)
      .then((value) => {
        if (current) {
          setData(value);
          setError("");
        }
      })
      .catch((e) => {
        if (current)
          setError(e instanceof Error ? e.message : "Error al cargar.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path, version]);
  function reload() {
    setLoading(true);
    setVersion((v) => v + 1);
  }
  return { data, error, loading, reload };
}
export function ResourceStatus({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (loading) return <p role="status">Cargando…</p>;
  if (error)
    return (
      <div className="notice" role="alert">
        <p>{error}</p>
        <button onClick={retry}>Reintentar</button>
      </div>
    );
  return null;
}
export function Pagination({
  page,
  hasNext,
  onPage,
}: {
  page: number;
  hasNext: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <button
        className="secondary"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </button>
      <span>Página {page}</span>
      <button
        className="secondary"
        disabled={!hasNext}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
export function date(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
