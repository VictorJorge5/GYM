// app.js — bootstraps CARGA
import { startRouter, addRoute } from './router.js';
import * as dashboard from './views/dashboard.js';
import * as library from './views/library.js';
import * as routines from './views/routines.js';
import * as workout from './views/workout.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

addRoute('/dashboard', dashboard.render);
addRoute('/library', library.render);
addRoute('/routines', routines.render);
addRoute('/routines/:id', routines.renderEditor);
addRoute('/workout', workout.render);
addRoute('/workout/:routineId', workout.render);
addRoute('/progress', progress.render);
addRoute('/settings', settings.render);

const view = document.getElementById('view');
const nav = document.getElementById('bottom-nav');
startRouter(view, nav);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  });
}
