"use client";
import { useEffect, useRef, useState } from "react";
import { request } from "@/services/client";
export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "select";
  value?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};
export function MutationButton({
  label,
  path,
  method = "PATCH",
  payload = {},
  fields = [],
  description,
  onDone,
}: {
  label: string;
  path: string;
  method?: string;
  payload?: Record<string, unknown>;
  fields?: Field[];
  description: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      dialog.current
        ?.querySelector<HTMLElement>("input,select,textarea")
        ?.focus();
    } else {
      dialog.current?.close();
      trigger.current?.focus();
    }
  }, [open]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      ...payload,
      motivo: form.get("motivo"),
    };
    for (const field of fields) {
      const value = form.get(field.name);
      if (field.required === false && value === "") continue;
      data[field.name] = value;
    }
    try {
      await request(`/api/admin/${path}`, method, data);
      setOpen(false);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={trigger}
        className="secondary"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
        aria-labelledby={`title-${path}-${label}`}
      >
        <form onSubmit={submit}>
          <h2 id={`title-${path}-${label}`}>{label}</h2>
          <p>{description}</p>
          {fields.map((field) => (
            <label key={field.name}>
              {field.label}
              {field.type === "select" ? (
                <select
                  name={field.name}
                  defaultValue={field.value}
                  required={field.required ?? true}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  defaultValue={field.value}
                  required={field.required ?? true}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  pattern={field.pattern}
                />
              )}
            </label>
          ))}
          <label>
            Motivo del cambio
            <textarea
              name="motivo"
              required
              minLength={5}
              maxLength={500}
              placeholder="Explica por qué realizas este cambio"
            />
          </label>
          <p>La acción quedará registrada en auditoría.</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button disabled={busy}>
              {busy ? "Guardando…" : "Confirmar cambio"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
