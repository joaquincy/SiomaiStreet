// Preserve raw request streams for multipart uploads and signed email webhooks.
export const config = { helpers: false };

process.env.SIOMAI_SERVERLESS = 'true';
const handler = import('../server/index.js').then(module => module.handleRequest);

export default async function api(req, res) {
  return (await handler)(req, res);
}
