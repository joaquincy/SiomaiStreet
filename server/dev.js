import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const serverPath = fileURLToPath(new URL('./index.js', import.meta.url));
const vitePath = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const watchArgs = ['--watch', '--watch-preserve-output'];
if (['win32', 'darwin'].includes(process.platform)) {
  for (const path of ['./', '../shared/', '../.env', '../.env.local']) {
    const target = fileURLToPath(new URL(path, import.meta.url));
    if (existsSync(target)) watchArgs.push(`--watch-path=${target}`);
  }
}
const children = [
  // Trust the OS certificate store as well as Node's bundled roots in local development.
  spawn(process.execPath, [...watchArgs, serverPath], { stdio: 'inherit', env: { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA || '1' } }),
  spawn(process.execPath, [vitePath], { stdio: 'inherit', env: process.env }),
];

const stop = (signal = 'SIGTERM') => {
  for (const child of children) if (!child.killed) child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
    stop();
  });
}
