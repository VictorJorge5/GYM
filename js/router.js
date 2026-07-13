// router.js — minimal hash router
const routes = [];
let currentUnmount = null;

export function addRoute(pattern, render) {
  routes.push({ pattern, render });
}

/** Views that start timers/intervals should call this after mounting so the
 * router can tear them down before navigating to a different view. */
export function onUnmount(fn) {
  currentUnmount = fn;
}

function matchRoute(hash) {
  const hparts = hash.split('/');
  for (const r of routes) {
    const parts = r.pattern.split('/');
    if (parts.length !== hparts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(':')) {
        params[parts[i].slice(1)] = decodeURIComponent(hparts[i]);
      } else if (parts[i] !== hparts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { render: r.render, params };
  }
  return null;
}

export function navigate(hash) {
  location.hash = hash;
}

export function startRouter(containerEl, navEl) {
  async function handle() {
    if (currentUnmount) {
      try { currentUnmount(); } catch (err) { console.warn(err); }
      currentUnmount = null;
    }
    const hash = (location.hash || '#/dashboard').slice(1);
    const match = matchRoute(hash) || matchRoute('/dashboard');
    containerEl.innerHTML = '<div class="loading">Cargando…</div>';
    containerEl.scrollTop = 0;
    updateNavActive(navEl, hash);
    try {
      await match.render(containerEl, match.params || {});
    } catch (err) {
      console.error(err);
      containerEl.innerHTML = `<div class="empty-state"><h2>Algo ha fallado</h2><p>${(err && err.message) || err}</p></div>`;
    }
  }
  window.addEventListener('hashchange', handle);
  handle();
}

function updateNavActive(navEl, hash) {
  if (!navEl) return;
  const base = '/' + hash.split('/')[1];
  navEl.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + base);
  });
}
