-- ============================================================
-- CURRICULUM ESCUELITA DOMINICAL — Ago-Dic 2026
-- SQL para importar en otra instancia de Supabase
-- ============================================================
-- INSTRUCCIONES:
-- 1. Asegúrate de que tu base tenga las tablas: niveles, niveles_estrella,
--    devocionales_ninos, actividades (misma estructura que escuelita dominical v2).
-- 2. Ajusta el UUID de "creado_por" y "docente_id" al ID del admin de esa base.
-- 3. Ejecuta este archivo completo en el SQL Editor de Supabase.
-- ============================================================

-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 1. NIVELES (grupos de edad)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

-- Si tus niveles ya existen, esto los actualiza. Si no, créalos primero.
UPDATE niveles SET edad_min = 1, edad_max = 5 WHERE nombre LIKE '%Pequeños%';
UPDATE niveles SET edad_min = 6, edad_max = 14 WHERE nombre LIKE '%Valientes%';

-- Si NO tienes niveles, descomenta esto:
-- INSERT INTO niveles (nombre, edad_min, edad_max, color, activo, orden)
-- VALUES
--   ('🐣 Pequeños Héroes', 1, 5, '#FFD700', true, 1),
--   ('🦁 Héroes Valientes', 6, 14, '#FF6B35', true, 2);

-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 2. NIVELES DE ESTRELLA (insignias motivacionales)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

-- Borra los existentes y reinserta (más limpio que actualizar uno a uno)
DELETE FROM niveles_estrella;

INSERT INTO niveles_estrella (emoji, nombre, min_estrellas, orden) VALUES
  ('🐣', 'Semilla plantada',  0,  0),
  ('🌱', 'Brote de fe',       3,  3),
  ('📖', 'Aprendiz bíblico',  7,  7),
  ('🦁', 'Valiente de Dios', 12, 12),
  ('🌟', 'Estrella bíblica', 18, 18),
  ('👑', 'Campeón de fe',    25, 25);

-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 3. DEVOCIONALES (17 viernes, ago 28 - dic 18 de 2026)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- nivel_id = NULL → se muestra para toda la escuelita
-- Cambia el UUID de creado_por al ID del admin de tu otra base

INSERT INTO devocionales_ninos (titulo, versiculo, contenido, fecha, activo, enlace_externo, creado_por) VALUES

-- BLOQUE 1: Quién soy en Cristo
('Dios me creó especial',
 'Salmo 139:14 — Te doy gracias porque me hiciste de una manera maravillosa.',
 '<p>¿Sabías que antes de que nacieras, Dios ya te conocía? Él pensó en cada detalle tuyo: tus ojos, tu sonrisa, hasta las cosas que te hacen reír.</p><p>No hay nadie igualito a ti en todo el mundo. Para Dios, tú eres lo más especial que hay.</p>',
 '2026-08-28', false, 'https://www.youtube.com/watch?v=ZzKF6BQNZ0U', NULL),

('Dios me conoce por mi nombre',
 'Isaías 43:1 — Te he llamado por tu nombre, tú eres mío.',
 '<p>Cuando Jesús caminaba por la orilla del lago, vio a unos pescadores y los llamó por su nombre. No les dijo "oye, tú". Les dijo su nombre.</p><p>Así hace Dios contigo: te conoce, sabe cómo te llamas y lo que sientes cada día. No eres uno más para Él.</p>',
 '2026-09-04', false, 'https://www.youtube.com/watch?v=5QD8ViK_m5Y', NULL),

('Soy hijo de Dios',
 'Juan 1:12 — A todos los que lo recibieron, les dio el derecho de ser hijos de Dios.',
 '<p>Un muchacho se fue lejos de su papá y gastó todo lo que tenía. Cuando se quedó sin nada, pensó: "Voy a volver a casa".</p><p>Y cuando el papá lo vio llegar de lejos, salió corriendo a abrazarlo. Así es Dios con nosotros: siempre nos espera con los brazos abiertos, porque somos sus hijos.</p>',
 '2026-09-11', false, 'https://www.youtube.com/watch?v=C3LiJrlQYzY', NULL),

('Dios me cuida siempre',
 'Salmo 23:1 — El Señor es mi pastor, nada me falta.',
 '<p>Jesús contó la historia de un pastor que tenía 100 ovejas, y una se perdió. ¿Sabes qué hizo? Dejó las 99 y salió a buscar a la que faltaba.</p><p>Cuando la encontró, se la puso en los hombros y volvió contento. Dios hace lo mismo contigo: nunca te pierde de vista.</p>',
 '2026-09-18', false, 'https://www.youtube.com/watch?v=pHSqkf2b7GI', NULL),

('Dios tiene un plan para mí',
 'Jeremías 29:11 — Yo sé los planes que tengo para ti, planes de bien y no de mal.',
 '<p>Jeremías era joven cuando Dios le habló. Le dijo: "Antes de que nacieras, ya tenía planes para ti". Jeremías se asustó un poco, pero Dios le prometió que iba a estar con él.</p><p>Tú también puedes estar tranquilo: Dios ya tiene algo bueno preparado para tu vida.</p>',
 '2026-09-25', false, 'https://www.youtube.com/watch?v=3SQa3fjPvzE', NULL),

-- BLOQUE 2: Héroes que obedecieron
('Obedecer aunque nadie entienda',
 'Hebreos 11:7 — Por la fe, Noé construyó un arca para salvar a su familia.',
 '<p>Imagínate que Dios te dice: "Construye un barco gigante". Y tus vecinos se ríen porque ni siquiera está lloviendo. Eso le pasó a Noé.</p><p>Él obedeció aunque nadie entendía. Y cuando llegó la lluvia, el arca estaba lista. A veces obedecer a Dios no tiene sentido para los demás, pero Él sabe lo que hace.</p>',
 '2026-10-02', false, 'https://www.youtube.com/watch?v=bN1s_Ug1MWQ', NULL),

('Confiar sin ver',
 'Hebreos 11:8 — Por la fe, Abraham obedeció y salió sin saber a dónde iba.',
 '<p>Dios le dijo a Abraham: "Sal de tu casa y ve a un lugar que yo te voy a mostrar". Abraham no sabía a dónde iba. No tenía mapa ni GPS.</p><p>Pero confió en Dios y se fue. A veces nos toca caminar sin saber qué viene, pero si Dios va adelante, el camino siempre es seguro.</p>',
 '2026-10-09', false, 'https://www.youtube.com/watch?v=vF4sCiTG-Xw', NULL),

('Lo pequeño con Dios es grande',
 '1 Samuel 17:47 — La batalla es del Señor.',
 '<p>David era el más chiquito de sus hermanos. Cuando un gigante llamado Goliat retó al ejército de Israel, todos tenían miedo.</p><p>Pero David agarró cinco piedras y dijo: "Yo vengo en el nombre de Dios". Una sola piedra bastó. Con Dios, no importa tu tamaño.</p>',
 '2026-10-16', false, 'https://www.youtube.com/watch?v=8SvZJm59XpI', NULL),

('Valiente aunque dé miedo',
 'Josué 1:9 — Sé fuerte y valiente, no tengas miedo, porque el Señor tu Dios está contigo.',
 '<p>A Daniel le dijeron: "Si oras a tu Dios, te echamos al foso de los leones". Daniel tenía miedo, claro. Pero oró igual, de rodillas, como siempre.</p><p>Y Dios cerró la boca de los leones. Ser valiente no es no tener miedo. Ser valiente es hacer lo correcto aunque tiembles por dentro.</p>',
 '2026-10-23', false, 'https://www.youtube.com/watch?v=XfVPXmJFIRY', NULL),

('Fiesta de la Luz — Jesús alumbra todo',
 'Juan 8:12 — Yo soy la luz del mundo. El que me sigue no caminará en oscuridad.',
 '<p>Cuando todo está oscuro, basta una vela para que puedas ver. Jesús dijo: "Yo soy la luz del mundo".</p><p>Eso quiere decir que donde hay miedo, Él trae paz. Donde hay confusión, Él trae claridad. Hoy celebramos que su luz es más fuerte que cualquier oscuridad.</p>',
 '2026-10-30', false, 'https://www.youtube.com/watch?v=xRCpMf4VkDU', NULL),

-- BLOQUE 3: Vivir como Jesús
('Dar gracias en todo',
 '1 Tesalonicenses 5:18 — Den gracias a Dios en todo.',
 '<p>Jesús sanó a diez hombres que estaban enfermos. Los diez se fueron contentos, pero solo uno regresó a darle las gracias. Uno de diez.</p><p>Jesús preguntó: "¿Y los otros nueve?". A veces se nos olvida agradecer. Hoy piensa en tres cosas buenas que tienes y dile gracias a Dios por ellas.</p>',
 '2026-11-06', false, 'https://www.youtube.com/watch?v=Nz9pv7BQef4', NULL),

('Amar al prójimo',
 'Juan 13:34 — Ámense los unos a los otros como yo los he amado.',
 '<p>Un hombre estaba herido al lado del camino. Pasaron dos personas que podían ayudarlo y siguieron de largo. Después pasó un samaritano, alguien que la gente despreciaba, y fue el que se paró a ayudar.</p><p>Jesús preguntó: "¿Quién fue el buen vecino?". Amar al prójimo es ayudar a quien lo necesita, sin excusas.</p>',
 '2026-11-13', false, 'https://www.youtube.com/watch?v=HsZ6A7eFjWw', NULL),

('Perdonar de corazón',
 'Efesios 4:32 — Sean buenos y compasivos unos con otros, perdonándose como Dios los perdonó.',
 '<p>Pedro le falló a Jesús tres veces. Dijo "yo no lo conozco" cuando más lo necesitaba. Después se sintió terrible.</p><p>Pero cuando Jesús resucitó, no le reclamó. Le preguntó tres veces: "¿Me amas?". Y cada vez que Pedro decía "sí", Jesús le daba una nueva oportunidad. Perdonar es eso: dar otra chance de corazón.</p>',
 '2026-11-20', false, 'https://www.youtube.com/watch?v=fN2GkCkXkXE', NULL),

('Servir a los demás',
 'Marcos 10:45 — El Hijo del Hombre no vino para que le sirvan, sino para servir.',
 '<p>La noche antes de morir, Jesús se arrodilló y les lavó los pies a sus discípulos. Ellos se quedaron sin palabras. El maestro sirviendo a los alumnos.</p><p>Jesús les dijo: "Si yo, que soy su maestro, hice esto, ustedes también deben servir a los demás". Servir no es de débiles. Es de grandes.</p>',
 '2026-11-27', false, 'https://www.youtube.com/watch?v=PUx9pJ1JCdQ', NULL),

-- BLOQUE 4: Navidad — Dios cumple
('Dios cumple sus promesas',
 'Isaías 9:6 — Nos ha nacido un niño, se nos ha dado un hijo. Se llamará Consejero admirable, Dios fuerte, Príncipe de paz.',
 '<p>Mucho antes de que Jesús naciera, Dios mandó un mensaje por los profetas: "Va a venir un niño especial. Se va a llamar Consejero, Dios fuerte, Príncipe de paz".</p><p>Pasaron muchos años y la gente seguía esperando. Pero Dios no se olvidó. Él siempre cumple lo que promete, aunque tardemos en verlo.</p>',
 '2026-12-04', false, 'https://www.youtube.com/watch?v=4x0d3L31LR4', NULL),

('Dios escoge a los humildes',
 'Lucas 1:37 — Para Dios no hay nada imposible.',
 '<p>María era una muchacha joven, de un pueblo chiquito, sin fama ni dinero. Y Dios la escogió a ella para ser la mamá de Jesús.</p><p>El ángel le dijo: "No tengas miedo, Dios te ha favorecido". María pudo haber dicho que no. Pero contestó: "Que se haga lo que Dios quiere". Dios no busca a los famosos. Busca a los que dicen sí.</p>',
 '2026-12-11', false, 'https://www.youtube.com/watch?v=jv1RQdEY-i4', NULL),

('Nació Jesús — La mejor noticia del mundo',
 'Lucas 2:11 — Hoy les ha nacido un Salvador, que es Cristo el Señor.',
 '<p>No nació en un hospital ni en una casa bonita. Nació en un pesebre, donde dormían los animales. Los primeros en enterarse no fueron los reyes, sino unos pastores que estaban trabajando de noche.</p><p>Un ángel les dijo: "Les traigo la mejor noticia: hoy nació el Salvador". Y fueron corriendo a conocerlo. Jesús llegó así: sin lujos, pero cambiando todo.</p>',
 '2026-12-18', false, 'https://www.youtube.com/watch?v=TY3bIMaKIhc', NULL);


-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 4. ACTIVIDADES — Pequeños Héroes (17 viernes)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- nivel_id se busca dinámicamente por nombre
-- Cambia el UUID de docente_id al ID del admin de tu otra base

INSERT INTO actividades (titulo, descripcion, fecha, versiculo_clave, historia_biblica, nivel_id, audiencia, visible_padres, es_tarea, enlace_externo, docente_id) VALUES

('🐣 ¡Dios me hizo especial!',
 '<p>Hoja para colorear con la escena de la creación: el sol, los animales, las flores y un niño en el centro. Usa crayones o colores. Mientras colorean, repite con ellos: "Dios me hizo y me hizo bien".</p>',
 '2026-08-28', 'Salmo 139:14', 'La creación (Génesis 1-2)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=H2sF3_TxMFI', NULL),

('🐣 Dios sabe mi nombre',
 '<p>Recortar letras grandes y pegarlas para armar su propio nombre. Debajo, pegar una frase que diga "Dios me conoce". Necesitas: hojas de colores, tijeras (con ayuda), pegamento.</p>',
 '2026-09-04', 'Isaías 43:1', 'Jesús llama a sus discípulos (Lucas 5)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=0C_mvEBbmDg', NULL),

('🐣 Mi papá Dios me abraza',
 '<p>Sopa de letras sencilla con letra grande. Palabras a buscar: HIJO, AMOR, PAPÁ, DIOS, CASA. Para los más chiquitos, señala la dirección de cada palabra y que la marquen con color.</p>',
 '2026-09-11', 'Juan 1:12', 'El hijo pródigo (Lucas 15)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=qCd-LdGcRnQ', NULL),

('🐣 La ovejita perdida',
 '<p>Laberinto sencillo con camino ancho: ayuda al pastor a encontrar a su ovejita. Al llegar al final, el niño colorea la oveja. Imprime en hoja A4.</p>',
 '2026-09-18', 'Salmo 23:1', 'El pastor y la oveja perdida (Lucas 15:1-7)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=Ly-0rUGe3FA', NULL),

('🐣 Dios tiene planes para mí',
 '<p>Títeres de dedo: imprime la hoja con los personajes de Jeremías (Jeremías joven y la mano de Dios). Recorta con ayuda y pega en forma de anillo para los dedos. Los niños actúan la escena del llamado.</p>',
 '2026-09-25', 'Jeremías 29:11', 'Jeremías desde joven (Jeremías 1)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=8dH5_FPfEgc', NULL),

('🐣 Noé obedeció a Dios',
 '<p>Hoja para colorear con el arca, los animales entrando de dos en dos y el arcoíris. Mientras colorean, pregúntales: "¿Qué animales ves?" y cuenta la historia.</p>',
 '2026-10-02', 'Hebreos 11:7', 'Noé y el arca (Génesis 6-9)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=L4lGH8HSKLY', NULL),

('🐣 Abraham caminó con Dios',
 '<p>Recortar y pegar: piezas del camino de Abraham (tienda, camello, estrellas, la familia). Los niños arman la escena en orden pegando cada pieza en una hoja. Necesitas: tijeras, pegamento, hoja base.</p>',
 '2026-10-09', 'Hebreos 11:8', 'Abraham sale de su tierra (Génesis 12)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=MdRAx8SfrIs', NULL),

('🐣 David y el gigante',
 '<p>Sopa de letras con letra grande. Palabras: DAVID, PIEDRA, GOLIAT, DIOS, FE. Para los más chiquitos, pueden buscar solo DAVID y DIOS. Colorean el dibujo de David al terminar.</p>',
 '2026-10-16', '1 Samuel 17:47', 'David y Goliat (1 Samuel 17)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=7jR2LvuCIb0', NULL),

('🐣 Daniel y los leones',
 '<p>Laberinto: ayuda a Daniel a salir del foso de los leones. Camino ancho y claro para los pequeños. Al final, colorean a Daniel orando. Imprime en A4.</p>',
 '2026-10-23', 'Josué 1:9', 'Daniel en el foso de los leones (Daniel 6)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=PLcRl3bL8rE', NULL),

('🐣 Jesús es mi luz',
 '<p>Títeres de dedo: imprime los personajes (Jesús, una vela, una estrella). Los niños recortan con ayuda, arman los títeres y repiten: "Jesús es la luz del mundo". Actividad especial de Fiesta de la Luz.</p>',
 '2026-10-30', 'Juan 8:12', 'Jesús, la luz del mundo (Juan 8:12)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=6M9mxEB3w_U', NULL),

('🐣 ¡Gracias, Dios!',
 '<p>Hoja para colorear: el hombre que regresó a darle gracias a Jesús, arrodillado frente a Él. Mientras colorean, cada niño dice en voz alta una cosa por la que quiere dar gracias.</p>',
 '2026-11-06', '1 Tesalonicenses 5:18', 'Los 10 leprosos (Lucas 17:11-19)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=VLjW3Gg7_D0', NULL),

('🐣 Ayudo a los demás',
 '<p>Recortar y pegar: armar la historia del buen samaritano en 4 pasos. Cada pieza tiene un momento (el hombre herido, los que pasan de largo, el samaritano ayudando, el hombre sano). Pegar en orden sobre una hoja base.</p>',
 '2026-11-13', 'Juan 13:34', 'El buen samaritano (Lucas 10:25-37)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=zrZp6HFQwqI', NULL),

('🐣 Jesús perdona a Pedro',
 '<p>Sopa de letras sencilla con letra grande. Palabras: PERDON, AMOR, PEDRO, JESUS, AMIGOS. Los más chiquitos pueden buscar solo JESUS y AMOR. Al terminar, colorean un corazón grande al lado.</p>',
 '2026-11-20', 'Efesios 4:32', 'Jesús perdona a Pedro (Juan 21)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=nWjKzVUjOLM', NULL),

('🐣 Jesús nos enseña a servir',
 '<p>Laberinto: ayuda a Jesús a llegar hasta sus discípulos para lavarles los pies. Camino sencillo con dibujos en el recorrido. Al llegar al final, el niño colorea la escena.</p>',
 '2026-11-27', 'Marcos 10:45', 'Jesús lava los pies (Juan 13:1-17)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=V1tCnwWTJ3Q', NULL),

('🐣 Dios cumple lo que promete',
 '<p>Títeres de dedo: imprime al profeta Isaías y al bebé Jesús en el pesebre. Los niños recortan con ayuda, arman los títeres y el maestro narra: "Isaías dijo que vendría un niño especial... ¡y llegó!".</p>',
 '2026-12-04', 'Isaías 9:6', 'Los profetas anuncian al Mesías (Isaías 9:6)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=aH4eZaBcLbk', NULL),

('🐣 María dijo sí a Dios',
 '<p>Hoja para colorear: el ángel Gabriel visitando a María. Dibujo grande con pocos detalles para los más pequeños. Mientras colorean, repite con ellos: "Para Dios no hay nada imposible".</p>',
 '2026-12-11', 'Lucas 1:37', 'El ángel visita a María (Lucas 1:26-38)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=j_rC8TTfNpc', NULL),

('🐣 ¡Nació el niño Jesús!',
 '<p>Recortar y pegar: armar el pesebre completo. Piezas: María, José, el bebé Jesús, la estrella, los pastores y los animales. Los niños pegan todo sobre una hoja con el establo dibujado. Actividad especial de cierre de año.</p>',
 '2026-12-18', 'Lucas 2:11', 'El nacimiento de Jesús (Lucas 2:1-20)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Pequeños%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=9kd0oQ03Jzc', NULL);


-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 5. ACTIVIDADES — Héroes Valientes (17 viernes)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

INSERT INTO actividades (titulo, descripcion, fecha, versiculo_clave, historia_biblica, nivel_id, audiencia, visible_padres, es_tarea, enlace_externo, docente_id) VALUES

('🦁 Dios me creó con propósito',
 '<p>Hoja para colorear con la escena completa de la creación: día y noche, mar y tierra, animales y el ser humano. Al terminar, cada uno escribe al reverso algo que le gusta de cómo Dios lo hizo.</p>',
 '2026-08-28', 'Salmo 139:14', 'La creación (Génesis 1-2)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=H2sF3_TxMFI', NULL),

('🦁 Llamados por nombre',
 '<p>Recortar y armar la escena del llamado de los discípulos junto al lago. Piezas: la barca, las redes, Jesús llamando, Pedro y Andrés. Armar la secuencia en orden y pegar. Al final, escribir: "Jesús también me llama a mí".</p>',
 '2026-09-04', 'Isaías 43:1', 'Jesús llama a sus discípulos (Lucas 5)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=0C_mvEBbmDg', NULL),

('🦁 Hijos del Rey',
 '<p>Sopa de letras con 10 palabras: HIJO, PADRE, PERDÓN, ABRAZO, REGRESO, FIESTA, AMOR, ANILLO, CASA, GRACIA. Al encontrar todas, responder la pregunta al pie: "¿Qué hizo el padre cuando vio llegar a su hijo?".</p>',
 '2026-09-11', 'Juan 1:12', 'El hijo pródigo (Lucas 15)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=qCd-LdGcRnQ', NULL),

('🦁 El buen pastor me cuida',
 '<p>Laberinto con bifurcaciones: el pastor busca la oveja perdida, pero hay caminos falsos con preguntas. En cada cruce, el niño responde una pregunta del tema para saber cuál camino tomar.</p>',
 '2026-09-18', 'Salmo 23:1', 'El pastor y la oveja perdida (Lucas 15:1-7)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=Ly-0rUGe3FA', NULL),

('🦁 Un plan desde antes de nacer',
 '<p>Títeres de dedo de los personajes del llamado de Jeremías: Jeremías joven, la mano de Dios, el pueblo. Recortar, armar y dramatizar la escena en grupos. Pregunta de cierre: "¿Qué crees que Dios tiene planeado para ti?".</p>',
 '2026-09-25', 'Jeremías 29:11', 'Jeremías desde joven (Jeremías 1)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=8dH5_FPfEgc', NULL),

('🦁 Obediencia sin ver la lluvia',
 '<p>Hoja para colorear con la escena completa del arca: Noé construyendo, los animales llegando, las nubes formándose. Al reverso, escribir: "¿Alguna vez te tocó obedecer sin entender por qué?" y compartir con el grupo.</p>',
 '2026-10-02', 'Hebreos 11:7', 'Noé y el arca (Génesis 6-9)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=L4lGH8HSKLY', NULL),

('🦁 Fe para caminar sin mapa',
 '<p>Recortar y armar la secuencia del viaje de Abraham en 5 pasos: su casa en Ur, la salida, el desierto, las estrellas de la promesa, la tierra prometida. Pegar en orden y trazar el camino con marcador.</p>',
 '2026-10-09', 'Hebreos 11:8', 'Abraham sale de su tierra (Génesis 12)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=MdRAx8SfrIs', NULL),

('🦁 Pequeño pero con Dios',
 '<p>Sopa de letras con 12 palabras: DAVID, GOLIAT, PIEDRA, HONDA, GIGANTE, VALIENTE, EJÉRCITO, DIOS, VICTORIA, FE, PASTOR, ISRAEL. Pregunta al pie: "¿Por qué David venció si era más chiquito?".</p>',
 '2026-10-16', '1 Samuel 17:47', 'David y Goliat (1 Samuel 17)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=7jR2LvuCIb0', NULL),

('🦁 Valientes de verdad',
 '<p>Laberinto con decisiones: en cada cruce hay una situación ("tus amigos se burlan de que oras", "te da pena hablar de Dios"). El niño elige el camino correcto según lo que haría. Al final llega a Daniel orando.</p>',
 '2026-10-23', 'Josué 1:9', 'Daniel en el foso de los leones (Daniel 6)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=PLcRl3bL8rE', NULL),

('🦁 La luz vence la oscuridad',
 '<p>Títeres de dedo para dramatizar Juan 8:12: Jesús, una persona en oscuridad, una luz. Los niños arman los títeres, se organizan en grupos y presentan una mini obra. Actividad especial de Fiesta de la Luz.</p>',
 '2026-10-30', 'Juan 8:12', 'Jesús, la luz del mundo (Juan 8:12)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=6M9mxEB3w_U', NULL),

('🦁 Uno de diez dio gracias',
 '<p>Hoja para colorear con la escena de los 10 leprosos: 9 se van caminando y 1 regresa arrodillado ante Jesús. Al reverso, el niño escribe 5 cosas por las que quiere dar gracias a Dios esta semana.</p>',
 '2026-11-06', '1 Tesalonicenses 5:18', 'Los 10 leprosos (Lucas 17:11-19)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=VLjW3Gg7_D0', NULL),

('🦁 ¿Quién es mi prójimo?',
 '<p>Recortar y armar la secuencia de la parábola del buen samaritano en 5 escenas: el viajero herido, el sacerdote que pasa de largo, el levita que pasa de largo, el samaritano que ayuda, el viajero recuperado. Pegar en orden y responder: "¿A quién puedes ayudar tú esta semana?".</p>',
 '2026-11-13', 'Juan 13:34', 'El buen samaritano (Lucas 10:25-37)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=zrZp6HFQwqI', NULL),

('🦁 Tres veces perdonado',
 '<p>Sopa de letras con 12 palabras: PEDRO, JESUS, PERDON, NEGACION, GALLO, FUEGO, AMOR, RESTAURAR, SEGUNDA, OPORTUNIDAD, PESCADOR, AMIGO. Pregunta al pie: "¿Por qué Jesús le preguntó tres veces si lo amaba?".</p>',
 '2026-11-20', 'Efesios 4:32', 'Jesús perdona a Pedro (Juan 21)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=nWjKzVUjOLM', NULL),

('🦁 Servir es de valientes',
 '<p>Laberinto con preguntas sobre servicio: en cada cruce hay una situación real ("tu mamá necesita ayuda en la cocina", "un compañero no entiende la tarea"). El niño elige el camino del servicio. Al final, escribir una forma concreta de servir esta semana.</p>',
 '2026-11-27', 'Marcos 10:45', 'Jesús lava los pies (Juan 13:1-17)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=V1tCnwWTJ3Q', NULL),

('🦁 La promesa más grande',
 '<p>Títeres de dedo de los profetas: Isaías, Miqueas y el bebé Jesús. Recortar, armar y dramatizar en grupos: cada profeta dice su profecía y al final aparece el bebé cumpliendo la promesa. Pregunta de cierre: "¿Cuánto tiempo esperó la gente? ¿Valió la pena?".</p>',
 '2026-12-04', 'Isaías 9:6', 'Los profetas anuncian al Mesías (Isaías 9:6)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=aH4eZaBcLbk', NULL),

('🦁 Escogidos por Dios',
 '<p>Hoja para colorear con la escena completa de la anunciación: el ángel Gabriel, María en su casa, la luz que entra. Al reverso, escribir: "María era joven y de un pueblo chiquito. ¿Qué te dice eso sobre a quién escoge Dios?".</p>',
 '2026-12-11', 'Lucas 1:37', 'El ángel visita a María (Lucas 1:26-38)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=j_rC8TTfNpc', NULL),

('🦁 La noche que cambió todo',
 '<p>Recortar y armar la escena completa de la Navidad: el establo, María y José, el bebé Jesús, la estrella, los pastores, los ángeles. Pegar sobre una hoja con el cielo estrellado. Actividad especial de cierre de año y entrega de insignias.</p>',
 '2026-12-18', 'Lucas 2:11', 'El nacimiento de Jesús (Lucas 2:1-20)',
 (SELECT id FROM niveles WHERE nombre LIKE '%Valientes%' LIMIT 1),
 'ninos', true, false, 'https://www.youtube.com/watch?v=9kd0oQ03Jzc', NULL);


-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- 6. RLS — Permitir actividades de "toda la escuelita" (nivel_id IS NULL)
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- Solo necesitas esto si tu otra base tiene la misma RLS de actividades

DROP POLICY IF EXISTS "ver actividades propias o públicas" ON public.actividades;

CREATE POLICY "ver actividades propias o públicas" ON public.actividades FOR SELECT TO authenticated
  USING (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','coordinador'))
    or exists (select 1 from public.docentes_niveles dn where dn.nivel_id = actividades.nivel_id and dn.docente_id = auth.uid())
    or (actividades.nivel_id is null and actividades.audiencia = 'ninos'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'docente'))
    or (
      actividades.visible_padres = true
      and exists (
        select 1 from public.ninos_padres np join public.ninos n on n.id = np.nino_id
        where np.padre_id = auth.uid() and n.nivel_id = actividades.nivel_id
      )
    )
    or (
      actividades.nivel_id is null
      and actividades.audiencia = 'ninos'
      and actividades.visible_padres = true
      and exists (select 1 from public.ninos_padres np where np.padre_id = auth.uid())
    )
  );

-- ============================================================
-- FIN — Verificación rápida
-- ============================================================
-- SELECT 'devocionales' as tabla, count(*) FROM devocionales_ninos WHERE fecha >= '2026-08-28'
-- UNION ALL
-- SELECT 'actividades', count(*) FROM actividades WHERE fecha >= '2026-08-28';
-- Esperado: 17 devocionales, 34 actividades
