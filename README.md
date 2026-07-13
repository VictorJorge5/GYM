# CARGA — tu app de rutinas de gimnasio

Una PWA personal para planificar rutinas, registrar series y pesos, y hacer
seguimiento de tus récords (PRs). Sin cuentas, sin servidores: todo se guarda
en tu propio dispositivo (IndexedDB). El catálogo de 1.324 ejercicios (con
GIFs, instrucciones en español y datos de músculo/equipo) viene del
repositorio público [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset),
cuyas imágenes pertenecen a gymvisual.com y están cedidas para uso educativo
y personal — exactamente el uso que le da esta app. No se distribuyen ni se
alojan copias de esas imágenes: la app las referencia directamente desde el
repositorio original y las cachea en tu navegador la primera vez que las ves.

## Qué incluye

- **Inicio** — resumen semanal (entrenos, volumen, racha), tu rutina de hoy y tus últimos récords.
- **Ejercicios** — buscador y filtros (categoría/equipo) sobre los 1.324 ejercicios, con GIF, instrucciones en español y un registro rápido de serie desde la propia ficha.
- **Rutinas** — crea rutinas con series/reps/descanso objetivo por ejercicio, en el orden que quieras, con día fijo opcional.
- **Entrenamiento** — modo activo: añade series con peso y reps, temporizador de descanso, y detección automática de PRs (por peso y por 1RM estimado con la fórmula de Epley) mientras entrenas.
- **Progreso** — evolución de tu 1RM estimado por ejercicio, frecuencia semanal de entrenos, volumen total histórico y un registro simple de peso corporal.
- **Ajustes** — exporta/importa toda tu información en un `.json` (tu copia de seguridad), resincroniza el catálogo de ejercicios, o borra tus datos.
- Instalable como app (Añadir a pantalla de inicio) y funciona sin conexión tras la primera carga.

## Cómo probarla ahora mismo (en tu ordenador)

No hace falta ningún paso de compilación. Solo necesitas servir la carpeta
con un servidor local (los módulos ES no funcionan abriendo el `index.html`
directamente con doble clic):

```bash
cd carga
python3 -m http.server 8000
# abre http://localhost:8000 en el navegador
```

## Cómo publicarla en GitHub Pages (como hiciste con tu otra PWA)

1. Crea un repositorio nuevo en GitHub (puede ser privado) y sube todo el contenido de esta carpeta a la rama `main`.
2. En el repo: **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Espera un par de minutos y entra en la URL que te da GitHub (algo como `https://tuusuario.github.io/turepo/`).
4. En el móvil, ábrela con Chrome/Safari y usa "Añadir a pantalla de inicio" para instalarla como app.

La primera vez que abras la sección **Ejercicios**, la app descarga el
catálogo completo (~16 MB) desde GitHub y lo guarda en tu dispositivo —
hazlo con wifi la primera vez. A partir de ahí funciona sin conexión.

## Cómo funciona por dentro

```
carga/
├── index.html            # shell de la app + navegación inferior
├── manifest.json          # metadatos PWA (nombre, iconos, colores)
├── sw.js                  # service worker: cachea la app y los GIFs/JSON
├── css/styles.css         # sistema de diseño (tokens, componentes)
├── icons/                 # iconos de la app (barra con discos)
└── js/
    ├── app.js              # arranca el router y registra el service worker
    ├── router.js           # router por hash (#/dashboard, #/library…)
    ├── db.js               # capa genérica sobre IndexedDB
    ├── dataset.js           # descarga/cachea/busca en el catálogo de ejercicios
    ├── tracking.js          # lógica de PRs, volumen, rachas
    ├── plate.js             # la "barra cargada" — visualización de peso con discos reales
    ├── chart.js             # gráficos de líneas/barras en <canvas>, sin librerías externas
    ├── modal.js             # ficha de ejercicio (overlay reutilizable)
    └── views/               # una vista por pantalla (dashboard, library, routines, workout, progress, settings)
```

Todos tus datos (rutinas, entrenos, PRs, peso corporal) viven en IndexedDB,
en el almacén `carga-db` de tu navegador — por eso son privados y por eso
conviene exportarlos de vez en cuando desde **Ajustes**.

### La barra de discos

El elemento visual distintivo de la app: cuando un peso corresponde a un
ejercicio con barra (barra libre, barra Z, multipower...), en vez de solo
mostrar el número se dibuja una barra real con discos del color y tamaño
que usarías en el gimnasio (rojo 25 kg, azul 20 kg, amarillo 15 kg, verde
10 kg...). Para mancuernas, poleas o peso corporal se muestra solo el
número — el gesto se reserva para donde tiene sentido real.

## Ideas para seguir ampliándola

- Selector de unidades kg/lb.
- Compartir/exportar una rutina como texto para mandarla por WhatsApp.
- Modo "superserie"/circuito (agrupar varios ejercicios sin descanso entre ellos).
- Gráfico de volumen por grupo muscular a lo largo del tiempo.
- Recordatorio/notificación del día de entreno según la rutina asignada.

## Aviso

Si dejas la pantalla de **Entrenamiento** sin pulsar "Terminar entrenamiento",
esa sesión no se guarda — es la única acción que persiste el entreno.
