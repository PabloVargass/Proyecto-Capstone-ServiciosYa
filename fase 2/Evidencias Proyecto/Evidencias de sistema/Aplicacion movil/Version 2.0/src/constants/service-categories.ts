// Sugerencias de interfaz: el nombre se envía sin emoji y el backend valida la categoría.
export const generalServiceCategories = [
  { name: 'Limpieza', emoji: '🧹' },
  { name: 'Armado de muebles', emoji: '🪑' },
  { name: 'Reparaciones del hogar', emoji: '🛠️' },
  { name: 'Gasfitería', emoji: '🚰' },
  { name: 'Electricidad', emoji: '💡' },
  { name: 'Carpintería', emoji: '🪚' },
  { name: 'Pintura', emoji: '🎨' },
  { name: 'Construcción y albañilería', emoji: '🧱' },
  { name: 'Cerrajería', emoji: '🔑' },
  { name: 'Jardinería', emoji: '🌿' },
  { name: 'Mudanzas', emoji: '📦' },
  { name: 'Transporte y fletes', emoji: '🚚' },
  { name: 'Repartos y trámites', emoji: '🛵' },
  { name: 'Mecánica automotriz', emoji: '🔧' },
  { name: 'Lavado de vehículos', emoji: '🚗' },
  { name: 'Tecnología', emoji: '💻' },
  { name: 'Soporte técnico', emoji: '🖥️' },
  { name: 'Reparación de celulares', emoji: '📱' },
  { name: 'Reparación de electrodomésticos', emoji: '🔌' },
  { name: 'Climatización', emoji: '❄️' },
  { name: 'Diseño gráfico', emoji: '✏️' },
  { name: 'Desarrollo web', emoji: '🌐' },
  { name: 'Marketing y redes sociales', emoji: '📣' },
  { name: 'Fotografía y video', emoji: '📸' },
  { name: 'Clases particulares', emoji: '📚' },
  { name: 'Idiomas y traducción', emoji: '🗣️' },
  { name: 'Música', emoji: '🎵' },
  { name: 'Deportes y entrenamiento', emoji: '🏃' },
  { name: 'Cuidado de niños', emoji: '🧸' },
  { name: 'Acompañamiento de adultos mayores', emoji: '🤝' },
  { name: 'Cuidado de mascotas', emoji: '🐾' },
  { name: 'Paseo de mascotas', emoji: '🐕' },
  { name: 'Belleza y peluquería', emoji: '💇' },
  { name: 'Costura y confección', emoji: '🧵' },
  { name: 'Cocina y repostería', emoji: '🍰' },
  { name: 'Eventos y decoración', emoji: '🎉' },
  { name: 'Servicios administrativos', emoji: '🗂️' },
  { name: 'Contabilidad', emoji: '🧮' },
  { name: 'Otros servicios', emoji: '✨' },
];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function serviceCategoryOptions(existing: string[] = []) {
  const names = new Map(generalServiceCategories.map(item => [normalize(item.name), item.name]));
  for (const name of existing) if (name.trim()) names.set(normalize(name), name.trim());
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'es')).map(name => {
    const key = normalize(name);
    const matched = generalServiceCategories.find(item => normalize(item.name) === key)
      ?? generalServiceCategories.find(item => key.includes(normalize(item.name)) || normalize(item.name).includes(key));
    return { value: name, label: `${matched?.emoji ?? '✨'} ${name}` };
  });
}
