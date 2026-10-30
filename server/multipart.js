export async function readMultipart(req, { maxBytes = 110 * 1024 * 1024 } = {}) {
  const contentType = req.headers['content-type'];
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) throw Object.assign(new Error('Expected a multipart form submission.'), {status:400});
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error('Request is too large.'), {status:413});
    chunks.push(chunk);
  }
  try {
    return await new Request('http://localhost', {method:'POST',headers:{'content-type':contentType},body:Buffer.concat(chunks)}).formData();
  } catch {
    throw Object.assign(new Error('Malformed multipart form.'), {status:400});
  }
}
