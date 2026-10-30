import sharp from 'sharp';
// Decode/re-encode on the server too: browser processing is not a trust boundary.
export async function normalizeDocumentImage(file) {
  if(file.type==='application/pdf')return file;
  try {
    const bytes=Buffer.from(await file.arrayBuffer());
    const image=sharp(bytes,{limitInputPixels:24_000_000,failOn:'warning'});
    const meta=await image.metadata();
    if(!['jpeg','png'].includes(meta.format) || (meta.pages||1)>1)throw new Error('Unsupported image');
    // PNG preserves the submitted pixels without a second lossy compression pass.
    let normalized=await image.rotate().png().toBuffer();
    let type='image/png', extension='.png';
    // Photo PNGs can grow past the transport limit; retain a high-quality JPEG instead.
    if(normalized.length>10*1024*1024){normalized=await sharp(bytes,{limitInputPixels:24_000_000,failOn:'warning'}).rotate().jpeg({quality:95}).toBuffer();type='image/jpeg';extension='.jpg';}
    if(normalized.length>10*1024*1024)throw new Error('Normalized image too large');
    return new File([normalized],file.name.replace(/\.[^.]+$/,'')+extension,{type});
  }catch{throw Object.assign(new Error('This image could not be safely processed. Export a smaller, single-image JPG or PNG and try again.'),{status:422});}
}
