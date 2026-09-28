import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to detect the actual Vite dev server by probing the Vite client endpoint
function waitForVite(ports = [5173, 5174], timeoutMs = 30000, intervalMs = 500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const checkOnce = () => {
      Promise.all(
        ports.map((port) =>
          new Promise((res) => {
            const req = http.get(
              { hostname: 'localhost', port, path: '/@vite/client' },
              (resp) => {
                // drain response to free socket
                resp.resume();
                res(resp.statusCode === 200);
              }
            );
            req.on('error', () => res(false));
          })
        )
      ).then((results) => {
        const idx = results.findIndex(Boolean);
        if (idx !== -1) {
          resolve(ports[idx]);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(checkOnce, intervalMs);
        } else {
          // Fallback: return the first preferred port
          resolve(ports[0]);
        }
      });
    };
    checkOnce();
  });
}

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev:vite'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env }
});

// Wait for Vite to be ready, then start Electron
waitForVite().then((port) => {
  console.log(`\nDetected Vite dev server on port ${port}, starting Electron...\n`);
  
  const electron = spawn('electron', ['.'], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: `http://localhost:${port}` }
  });

  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code);
  });
});

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
