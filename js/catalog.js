// Catálogo de hábitos, categorías, iconos y paleta.
const H = 60;
const c = (key, name, category, type, iconKey, o = {}) => ({
  key, name, category, type, iconKey, moment: 'DAY', target: 1, unit: '', increment: 1, inverse: false,
  weeklyTotal: false, weeklyTarget: 3, timeLimitMinutes: 0, timeMode: 'BEFORE', weight: 1, suggested: false, ...o,
});

export const CATALOG = [
  c('entrenar', 'Entrenar', 'CUERPO', 'SEMANAL', 'fitness', { weeklyTarget: 5, weight: 3, suggested: true }),
  c('correr', 'Correr (km semanales)', 'CUERPO', 'CANTIDAD', 'run', { target: 20, unit: 'km', increment: 2.5, weeklyTotal: true, weight: 2, suggested: true }),
  c('pasos', '10.000 pasos', 'CUERPO', 'CANTIDAD', 'walk', { target: 10000, unit: 'pasos', increment: 1000, weight: 2, suggested: true }),
  c('estiramientos', 'Estirar / movilidad', 'CUERPO', 'CHECK', 'stretch', { moment: 'MORNING' }),
  c('ducha_fria', 'Ducha fría', 'CUERPO', 'CHECK', 'snow', { moment: 'MORNING' }),
  c('bici', 'Bicicleta', 'CUERPO', 'SEMANAL', 'bike', { weeklyTarget: 2 }),
  c('natacion', 'Natación', 'CUERPO', 'SEMANAL', 'pool', { weeklyTarget: 2 }),
  c('agua', 'Beber 3 L de agua', 'NUTRICION', 'CANTIDAD', 'water', { target: 3, unit: 'L', increment: 0.25, weight: 2, suggested: true }),
  c('proteina', 'Proteína', 'NUTRICION', 'CANTIDAD', 'meal', { target: 150, unit: 'g', increment: 25, weight: 2, suggested: true }),
  c('sin_alcohol', 'Sin alcohol', 'NUTRICION', 'EVITAR', 'nodrink', { moment: 'NIGHT', weight: 3, suggested: true }),
  c('sin_azucar', 'Sin azúcar añadido', 'NUTRICION', 'EVITAR', 'nosugar', { moment: 'NIGHT' }),
  c('sin_comida_rapida', 'Sin comida rápida', 'NUTRICION', 'EVITAR', 'nofood', { moment: 'NIGHT' }),
  c('verdura', 'Comer verdura', 'NUTRICION', 'CHECK', 'eco'),
  c('suplementos', 'Suplementos', 'NUTRICION', 'CHECK', 'pill', { moment: 'MORNING' }),
  c('cafe_max', 'Máximo de cafés', 'NUTRICION', 'CANTIDAD', 'coffee', { target: 2, unit: 'cafés', increment: 1, inverse: true }),
  c('cocinar', 'Cocinar en casa', 'NUTRICION', 'SEMANAL', 'cook', { weeklyTarget: 5 }),
  c('despertar', 'Despertar temprano', 'SUENO', 'HORA', 'alarm', { moment: 'MORNING', timeLimitMinutes: 7 * H, weight: 3, suggested: true }),
  c('acostarse', 'Acostarse a tiempo', 'SUENO', 'HORA', 'bed', { moment: 'NIGHT', timeLimitMinutes: 23 * H + 30, weight: 2 }),
  c('dormir_8h', 'Dormir 8 horas', 'SUENO', 'CANTIDAD', 'moon', { moment: 'MORNING', target: 8, unit: 'h', increment: 0.5, weight: 2 }),
  c('leer', 'Leer 10 páginas', 'MENTE', 'CANTIDAD', 'book', { moment: 'NIGHT', target: 10, unit: 'págs.', increment: 5, suggested: true }),
  c('meditar', 'Meditar', 'MENTE', 'CANTIDAD', 'meditate', { moment: 'MORNING', target: 10, unit: 'min', increment: 5 }),
  c('diario', 'Escribir un diario', 'MENTE', 'CHECK', 'journal', { moment: 'NIGHT' }),
  c('sin_movil', 'Sin móvil 30 min antes de dormir', 'MENTE', 'CHECK', 'nophone', { moment: 'NIGHT', suggested: true }),
  c('gratitud', 'Gratitud', 'MENTE', 'CHECK', 'heart', { moment: 'NIGHT' }),
  c('estudio', 'Estudio / TFG', 'CRECIMIENTO', 'CANTIDAD', 'school', { target: 2, unit: 'h', increment: 0.5, weight: 3, suggested: true }),
  c('idioma', 'Practicar un idioma', 'CRECIMIENTO', 'CHECK', 'language'),
  c('planificar', 'Planificar el día', 'CRECIMIENTO', 'CHECK', 'plan', { moment: 'MORNING' }),
  c('proyecto', 'Proyecto personal', 'CRECIMIENTO', 'CANTIDAD', 'code', { target: 60, unit: 'min', increment: 15, weight: 2 }),
  c('practicar', 'Practicar una habilidad', 'CRECIMIENTO', 'SEMANAL', 'brush', { weeklyTarget: 3 }),
  c('redes_max', 'Máximo en redes sociales', 'DIGITAL', 'CANTIDAD', 'phone', { target: 30, unit: 'min', increment: 15, inverse: true }),
  c('sin_pantallas', 'Sin pantallas en la cama', 'DIGITAL', 'EVITAR', 'nophone', { moment: 'NIGHT' }),
  c('pantalla_max', 'Máximo de pantalla', 'DIGITAL', 'CANTIDAD', 'screen', { target: 3, unit: 'h', increment: 0.5, inverse: true }),
  c('cama', 'Hacer la cama', 'PERSONAL', 'CHECK', 'bed', { moment: 'MORNING' }),
  c('ordenar', 'Ordenar', 'PERSONAL', 'CHECK', 'clean'),
  c('llamar', 'Llamar a alguien', 'PERSONAL', 'SEMANAL', 'heart', { weeklyTarget: 2 }),
  c('ahorro', 'Ahorrar', 'PERSONAL', 'CHECK', 'savings'),
  c('aire_libre', 'Tiempo al aire libre', 'PERSONAL', 'CANTIDAD', 'sun', { target: 30, unit: 'min', increment: 15 }),
];

export const CATEGORIES = { CUERPO: 'Cuerpo', NUTRICION: 'Nutrición', SUENO: 'Sueño', MENTE: 'Mente', CRECIMIENTO: 'Crecimiento', DIGITAL: 'Digital', PERSONAL: 'Personal' };
export const MOMENTS = { MORNING: 'Mañana', DAY: 'Día', NIGHT: 'Noche' };
export const TYPES = {
  CHECK: ['Sí / No', 'Se marca una vez al día.'],
  CANTIDAD: ['Cantidad', 'Suma cantidades hasta un objetivo (agua, pasos, páginas…).'],
  HORA: ['Hora', 'Se cumple si lo registras antes o después de una hora.'],
  EVITAR: ['Evitar', 'Cuenta como cumplido salvo que marques que has fallado.'],
  SEMANAL: ['Veces por semana', 'Un número de veces por semana, sin penalizar cada día.'],
};
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const HABIT_COLORS = ['#7DB7FF', '#4FE0D2', '#FFB86B', '#FF8FA3', '#B7A4FF', '#FF7EC3', '#A6E36B', '#FFD86B'];

// Iconos (trazos SVG 24×24, estilo línea redondeada).
const P = (d) => d;
export const ICONS = {
  check: P('M5 12.5l4.5 4.5L19 7.5'),
  fitness: P('M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11'),
  run: P('M13 4.5a1.5 1.5 0 1 0 0 .01M9 20l2.5-5.5L9 12l3-3 3 2.5 3 .5M11 9l-4 1.5'),
  walk: P('M13 4.5a1.5 1.5 0 1 0 0 .01M10.5 20l1.5-6-2-2.5 2-3.5 2.5 2 2.5.5M12 14l3 2.5v3.5'),
  bike: P('M6 18.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18 18.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM6 15l4-7h5l3 7M10 8l3 7'),
  pool: P('M3 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 14c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M8 12V6a2 2 0 0 1 4 0M13 12V6'),
  stretch: P('M12 5a1.5 1.5 0 1 0 0 .01M5 9l7 2 7-2M12 11v4l-3 5M12 15l3 5'),
  snow: P('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5'),
  water: P('M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z'),
  meal: P('M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7v3h3'),
  cook: P('M5 11h14l-1 8H6zM8 11V8a4 4 0 0 1 8 0v3M9 15h6'),
  nodrink: P('M7 4h10l-1 7a4 4 0 0 1-8 0zM12 15v5M9 20h6M4 4l16 16'),
  nosugar: P('M5 8h14v11H5zM9 8V5h6v3M4 4l16 16'),
  nofood: P('M5 11h14l-1 8H6zM7 11a5 5 0 0 1 10 0M4 4l16 16'),
  eco: P('M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8'),
  pill: P('M8.5 15.5l7-7a3.5 3.5 0 0 0-5-5l-7 7a3.5 3.5 0 0 0 5 5zM9 8l5 5'),
  coffee: P('M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 9h2a2 2 0 0 1 0 5h-2M8 3v2M12 3v2'),
  alarm: P('M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 9.5V13l2.5 1.5M4 6l3-2M20 6l-3-2'),
  bed: P('M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 12a1.5 1.5 0 1 0 0 .01'),
  moon: P('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'),
  book: P('M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.500-1-5.5-1-8 .5-2.500-1.500-5.500-1.500-8-.5zM12 6v13.500'),
  meditate: P('M12 5a1.5 1.5 0 1 0 0 .01M12 8.500v4M7 12.500c2 1 3.500 1 5 0 1.500 1 3 1 5 0M6 18c2-2 4-2 6 0 2-2 4-2 6 0'),
  journal: P('M5 4h11l3 3v13H5zM9 10h6M9 14h6M9 17h3'),
  nophone: P('M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2M4 4l16 16'),
  phone: P('M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2'),
  screen: P('M3 5h18v11H3zM8 20h8M12 16v4'),
  heart: P('M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z'),
  school: P('M2 9l10-5 10 5-10 5zM6 11.500V16c3 2.500 9 2.500 12 0v-4.500M22 9v5'),
  language: P('M4 6h9M8.500 4v2M6 6c0 4 3 6.500 6 7.500M12 6c0 3-3 6-7 7.500M13 20l4-9 4 9M14.500 17h5'),
  plan: P('M5 6.500l1.500 1.500L9 5M5 12.500L6.500 14 9 11M5 18.500L6.500 20 9 17M12 7h8M12 13h8M12 19h8'),
  code: P('M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14'),
  brush: P('M4 20c3 0 4-1.500 4-3a3 3 0 0 1 3-3l8-9a1.500 1.500 0 0 0-2-2l-9 8a3 3 0 0 0-3 3c0 2-1 3-3 3z'),
  clean: P('M14 3l7 7-4 4-7-7zM10 7l-6 6 6 6 4-4M4 21l3-3'),
  savings: P('M5 12a7 5 0 0 1 14 0v3a3 3 0 0 1-3 3h-1v2h-3v-2H9v2H6v-3a6 6 0 0 1-1-2zM15 11.500v.01M19 9l2-1'),
  sun: P('M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800'),
  star: P('M12 3.500l2.700 5.500 6 .9-4.400 4.200 1 6L12 17.300 6.700 20.100l1-6L3.300 9.900l6-.9z'),
};
export const iconSvg = (key, size = 22, stroke = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[key] || ICONS.check}"/></svg>`;

export const ACHIEVEMENTS = {
  day7: 'Primera semana completada', day30: '30 días de arco', day60: '60 días de arco', day_end: 'Arco completo',
  streak7: 'Racha de 7 días', streak21: 'Racha de 21 días', streak50: 'Racha de 50 días',
  perfect1: 'Primer día perfecto', perfect10: '10 días perfectos', perfect30: '30 días perfectos', solid21: '21 días mínimos cumplidos',
};
