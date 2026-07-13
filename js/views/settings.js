// views/settings.js
import { dbGetAll, dbBulkPut, dbClear, dbGet, STORES } from '../db.js';
import { syncExercises } from '../dataset.js';

export async function render(container) {
  const meta = await dbGet('meta', 'lastSync');
  container.innerHTML = `
    <section class="section">
      <h1>Ajustes</h1>

      <div class="settings-card">
        <h3>Biblioteca de ejercicios</h3>
        <p class="muted">Última sincronización: ${meta ? new Date(meta.value).toLocaleString('es-ES') : 'nunca'}</p>
        <button class="btn btn--ghost btn--block" id="resync">Volver a sincronizar biblioteca</button>
        <p class="settings-msg" id="resync-msg"></p>
      </div>

      <div class="settings-card">
        <h3>Copia de seguridad</h3>
        <p class="muted">Tus rutinas, entrenamientos y récords viven solo en este dispositivo. Exporta una copia de vez en cuando.</p>
        <button class="btn btn--primary btn--block" id="export">Exportar datos (.json)</button>
        <label class="btn btn--ghost btn--block" for="import-file" style="text-align:center;cursor:pointer;">Importar datos</label>
        <input type="file" id="import-file" accept="application/json" hidden>
        <p class="settings-msg" id="import-msg"></p>
      </div>

      <div class="settings-card settings-card--danger">
        <h3>Zona de peligro</h3>
        <button class="btn btn--danger btn--block" id="wipe">Borrar todos mis datos</button>
      </div>

      <div class="settings-card">
        <h3>Acerca de CARGA</h3>
        <p class="muted">Catálogo de 1.324 ejercicios (imágenes y animaciones) cortesía de <strong>gymvisual.com</strong>, distribuido por el repositorio <em>hasaneyldrm/exercises-dataset</em> en GitHub para uso educativo y personal. CARGA es tu propia app, sin cuentas ni servidores: todo se guarda en tu navegador.</p>
      </div>
    </section>
  `;

  container.querySelector('#resync').addEventListener('click', async (e) => {
    const msg = container.querySelector('#resync-msg');
    e.target.disabled = true;
    msg.textContent = 'Descargando biblioteca actualizada…';
    try {
      const data = await syncExercises();
      msg.textContent = `Listo: ${data.length} ejercicios sincronizados.`;
    } catch (err) {
      msg.textContent = 'Error: ' + err.message;
    }
    e.target.disabled = false;
  });

  container.querySelector('#export').addEventListener('click', async () => {
    const dump = {};
    for (const store of STORES) {
      if (store === 'exercises') continue; // no need to back up the shared catalog
      dump[store] = await dbGetAll(store);
    }
    dump.exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carga-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  container.querySelector('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const msg = container.querySelector('#import-msg');
    if (!file) return;
    try {
      const text = await file.text();
      const dump = JSON.parse(text);
      if (!confirm('Esto añadirá/actualizará tus rutinas, entrenamientos y récords con los datos del archivo. ¿Continuar?')) return;
      for (const store of STORES) {
        if (store === 'exercises') continue;
        if (Array.isArray(dump[store]) && dump[store].length) await dbBulkPut(store, dump[store]);
      }
      msg.textContent = 'Datos importados correctamente.';
    } catch (err) {
      msg.textContent = 'El archivo no es una copia de seguridad válida.';
    }
  });

  container.querySelector('#wipe').addEventListener('click', async () => {
    if (!confirm('Esto borrará todas tus rutinas, entrenamientos, récords y peso corporal registrados en este dispositivo. No se puede deshacer. ¿Seguro?')) return;
    for (const store of STORES) {
      if (store === 'exercises') continue;
      await dbClear(store);
    }
    alert('Datos borrados.');
    location.hash = '#/dashboard';
  });
}
