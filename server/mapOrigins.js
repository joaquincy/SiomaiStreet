// Vite increments its port when another development session is already running.
// Never allow these exceptions in a production/serverless deployment.
export function mapDevelopmentOrigins({ serverless = false, nodeEnv = process.env.NODE_ENV } = {}) {
  if (serverless || nodeEnv === 'production') return [];
  return [...Array.from({ length: 11 }, (_, i) => 3000 + i), 5173]
    .flatMap(port => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);
}
