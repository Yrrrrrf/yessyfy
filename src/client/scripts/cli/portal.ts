// portal.ts — Hub dashboard and GitHub Pages SPA router fallback generator
export interface HubOptions {
  readonly repoName: string;
  readonly commitSha?: string;
  readonly timestamp?: string;
}

export function generateHubHtml(options: HubOptions): string {
  const {
    repoName,
    commitSha = "latest",
    timestamp = new Date().toISOString(),
  } = options;

  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yessyfy · Hub de Plataformas SPA</title>
  <meta name="description" content="Portal central de aplicaciones de Yessyfy: Cliente Web, Colaborador Colab y Consola de Operaciones Vision." />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
  <style>
    :root {
      --bg: #070a12;
      --card-bg: #0f172a;
      --card-hover: #162036;
      --border: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.2);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
      position: relative;
      overflow-x: hidden;
    }
    .ambient-glow {
      position: absolute;
      top: -120px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 400px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.08) 40%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }
    .container {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem 1.5rem;
      z-index: 1;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    header {
      text-align: center;
      margin-bottom: 3.5rem;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.875rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #34d399;
      margin-bottom: 1.25rem;
      letter-spacing: 0.025em;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    h1 {
      font-size: clamp(2.5rem, 5vw, 3.75rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      font-size: 1.125rem;
      color: var(--muted);
      max-width: 640px;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.75rem;
      margin-bottom: 4rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .card:hover {
      transform: translateY(-4px);
      background: var(--card-hover);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.5), 0 0 25px -5px var(--accent-glow);
    }
    .card-badge {
      display: inline-flex;
      align-self: flex-start;
      padding: 0.25rem 0.625rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.25rem;
    }
    .badge-web { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-colab { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
    .badge-vision { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .card-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card-desc {
      color: var(--muted);
      font-size: 0.9375rem;
      line-height: 1.55;
      margin-bottom: 1.5rem;
      flex-grow: 1;
    }
    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 2rem;
      font-size: 0.875rem;
      color: #cbd5e1;
    }
    .feature-list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .feature-list li span {
      color: #34d399;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9375rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: #10b981;
      color: #041f16;
    }
    .btn-primary:hover {
      background: #34d399;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
    }
    .btn-subtle {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
    }
    .btn-subtle:hover {
      background: #334155;
      border-color: #475569;
    }
    footer {
      margin-top: auto;
      padding-top: 2.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--muted);
    }
    footer a {
      color: #38bdf8;
      text-decoration: none;
      transition: color 0.15s;
    }
    footer a:hover {
      color: #7dd3fc;
      text-decoration: underline;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8125rem;
    }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>
  <div class="container">
    <header>
      <div class="brand-badge">
        <div class="pulse-dot"></div>
        <span>3 APLICACIONES EN VIVO</span>
      </div>
      <h1>YESSYFY PLATFORM</h1>
      <p class="subtitle">Ecosistema de asistencia para el hogar y servicios técnicos en tiempo real con geolocalización, cámara de inspección y facturación SAT.</p>
    </header>

    <main class="grid">
      <!-- App 1: Web Client -->
      <article class="card">
        <span class="card-badge badge-web">PWA Cliente</span>
        <h2 class="card-title">📱 Cliente Web</h2>
        <p class="card-desc">Portal de usuario para cotización instantánea de reparaciones, tracking satelital del técnico en ruta, chat bidireccional y emisión de facturas CFDI 4.0.</p>
        <ul class="feature-list">
          <li><span>✓</span> Cotizador interactivo con retención 1% ISR</li>
          <li><span>✓</span> Telemetría de ruta en tiempo real (Leaflet GIS)</li>
          <li><span>✓</span> Chat sincronizado con filtro antifraude</li>
          <li><span>✓</span> Descarga de Factura SAT y Póliza de Garantía</li>
        </ul>
        <a href="./web/" class="btn btn-primary">Abrir App Cliente →</a>
      </article>

      <!-- App 2: Colab Field App -->
      <article class="card">
        <span class="card-badge badge-colab">PWA Colaborador</span>
        <h2 class="card-title">⚡ Colab Field</h2>
        <p class="card-desc">Herramienta táctica para contratistas en campo. Alertas audibles de chambas cercanas, navegación GPS 1-tap, cámara con sellado de marca de agua y balance financiero.</p>
        <ul class="feature-list">
          <li><span>✓</span> Radar de Chamba con radio de 150 metros</li>
          <li><span>✓</span> Cámara de alta visibilidad para guantes (56px)</li>
          <li><span>✓</span> Billetera fiscal con retención automática</li>
          <li><span>✓</span> Pases de seguridad para acceso residencial</li>
        </ul>
        <a href="./colab/" class="btn btn-primary">Abrir App Colab →</a>
      </article>

      <!-- App 3: Vision Operations CRM -->
      <article class="card">
        <span class="card-badge badge-vision">Centro de Mando</span>
        <h2 class="card-title">🛡️ Vision Ops CRM</h2>
        <p class="card-desc">Consola central de despacho táctico para monitoreo de cuadrillas en la CDMX, matriz Kanban de estados de servicio, auditoría de eventos y prevención de desintermediación.</p>
        <ul class="feature-list">
          <li><span>✓</span> Despacho espacial sobre mapa de calor y zonas</li>
          <li><span>✓</span> Tablero Kanban de cuadrillas activas</li>
          <li><span>✓</span> Registro y auditoría de incidentes en tiempo real</li>
          <li><span>✓</span> Supervisión de garantías y conciliación bancaria</li>
        </ul>
        <a href="./vision/" class="btn btn-primary">Abrir Consola Vision →</a>
      </article>
    </main>

    <footer>
      <div>
        <span>Monorepo: </span>
        <a href="https://github.com/Yrrrrrf/${repoName}" target="_blank" rel="noopener">github.com/Yrrrrrf/${repoName}</a>
        <span style="margin: 0 0.5rem">·</span>
        <span>Tecnología: SvelteKit 5 (Runes) + Deno + Leaflet + DaisyUI v5</span>
      </div>
      <div class="mono">
        Commit: ${commitSha.slice(0, 7)} · Desplegado: ${timestamp.slice(0, 10)}
      </div>
    </footer>
  </div>
</body>
</html>
`;
}

export function generate404Html(repoName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Yessyfy · Redirigiendo...</title>
  <script>
    // GitHub Pages SPA router redirect handler
    (function() {
      var l = window.location;
      var path = l.pathname.replace(/^\\/+/, '').split('/');
      var repo = '${repoName}';
      var app = path[1]; // e.g. web, colab, vision
      
      if (['web', 'colab', 'vision'].indexOf(app) !== -1) {
        var sub = path.slice(2).join('/');
        l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + '/' + repo + '/' + app + '/' + (sub ? '#' + sub : '') + l.search + l.hash);
      } else {
        l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + '/' + repo + '/');
      }
    })();
  </script>
</head>
<body style="background:#070a12;color:#94a3b8;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Redirigiendo a Yessyfy...</p>
</body>
</html>
`;
}
