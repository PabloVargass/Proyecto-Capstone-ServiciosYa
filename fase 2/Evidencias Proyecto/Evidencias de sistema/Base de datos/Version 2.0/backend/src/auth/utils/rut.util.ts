/**
 * Elimina puntos, guion y espacios del RUT.
 * Además convierte el dígito verificador K a mayúscula.
 *
 * Ejemplo:
 * 12.345.678-5 -> 123456785
 */
export function limpiarRut(rut: string): string {
  return rut
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s/g, '')
    .toUpperCase();
}

/**
 * Convierte el RUT al formato que guardaremos
 * en la base de datos.
 *
 * Ejemplo:
 * 12.345.678-5 -> 12345678-5
 * 12345678-5   -> 12345678-5
 */
export function normalizarRut(rut: string): string {
  const rutLimpio = limpiarRut(rut);

  if (rutLimpio.length < 2) {
    return rutLimpio;
  }

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);

  return `${cuerpo}-${dv}`;
}

/**
 * Comprueba que el RUT tenga un formato
 * válido y que su dígito verificador sea
 * correcto mediante módulo 11.
 */
export function validarRut(rut: string): boolean {
  const rutLimpio = limpiarRut(rut);

  if (!/^\d{7,8}[0-9K]$/.test(rutLimpio)) {
    return false;
  }

  const cuerpo = rutLimpio.slice(0, -1);
  const dvIngresado = rutLimpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma +=
      Number(cuerpo[i]) * multiplicador;

    multiplicador++;

    if (multiplicador > 7) {
      multiplicador = 2;
    }
  }

  const resto = 11 - (suma % 11);

  let dvCalculado: string;

  if (resto === 11) {
    dvCalculado = '0';
  } else if (resto === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = resto.toString();
  }

  return dvIngresado === dvCalculado;
}