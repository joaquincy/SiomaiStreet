import { MAX_DOCUMENT_BYTES } from '../../shared/application.js';
import { QUALITY_SAMPLE_EDGE } from './imageQuality.js';

export const MAX_CAMERA_BYTES = 40 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const FULL_CROP = { left:0, top:0, right:0, bottom:0 };

export function cropRectangle(width, height, crop = FULL_CROP) {
  const values = ['left','top','right','bottom'].map(k => Number(crop[k]));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || values.some(n=>!Number.isFinite(n)||n<0||n>40)) throw new Error('Crop edges must be between 0% and 40%.');
  const [left,top,right,bottom] = values;
  return { x:Math.floor(width*left/100), y:Math.floor(height*top/100), width:Math.max(1,Math.floor(width*(100-left-right)/100)), height:Math.max(1,Math.floor(height*(100-top-bottom)/100)) };
}

export async function loadDocumentImage(file) {
  if (!file.size || file.size > MAX_CAMERA_BYTES) throw new Error('Choose a nonempty photo up to 40 MiB for processing. Export a smaller JPG if it is larger.');
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('This photo format cannot be processed here. Export or share it as JPG/PNG (for HEIC/HEIF, use your phone’s image export options), then select that file. Renaming the extension will not convert it.');
  // Decoder handles EXIF orientation; all exports below are newly drawn pixel data.
  const bitmap = await createImageBitmap(file, { imageOrientation:'from-image' }).catch(()=>{throw new Error('This image could not be opened. Export a fresh JPG or PNG and try again.');});
  if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) { bitmap.close(); throw new Error('This photo is over 24 megapixels. Export a lower-resolution copy and try again.'); }
  return bitmap;
}

const toBlob = (canvas, quality) =>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Your device could not process this photo. Choose a smaller JPG.')), 'image/jpeg', quality));

// Bound the processing buffers and upload size. Applicants must inspect fine
// print after compression; resolution alone cannot guarantee readability.
export const MAX_EDGE = { idPhoto: 1200, default: 2400 };
// Stop at the first quality that is "small enough" instead of always using
// the highest quality. This is a target, not a guaranteed maximum file size.
const TARGET_BYTES = 1.5 * 1024 * 1024;
const QUALITY_STEPS = [.85, .78, .7];

// Inspect the encoded JPEG that will actually be submitted. Request a small
// decoder output so quality hints do not need another full-size pixel buffer.
// Quality assessment is optional: decoder/analysis failure never loses a file.
export async function analyzeCompressedImage(blob, width, height, docKey, analyze) {
  if (!analyze) return null;
  let decoded;
  try {
    const scale = Math.min(1, QUALITY_SAMPLE_EDGE / Math.max(width, height));
    decoded = await createImageBitmap(blob, {
      resizeWidth: Math.max(1, Math.round(width * scale)),
      resizeHeight: Math.max(1, Math.round(height * scale)),
      resizeQuality: 'high',
    });
    return await analyze(decoded, width, height, docKey);
  } catch { return null; }
  finally { decoded?.close(); }
}

export async function renderDocumentImage(bitmap, rotation = 0, crop = FULL_CROP, { docKey, analyze } = {}) {
  const rotated = document.createElement('canvas');
  const output = document.createElement('canvas');
  try {
    const quarter = ((rotation % 360)+360)%360;
    if (!Number.isFinite(rotation) || ![0, 90, 180, 270].includes(quarter)) throw new Error('Rotate the photo in 90-degree steps.');
    const sideways = quarter === 90 || quarter === 270;
    const maxEdge = MAX_EDGE[docKey] || MAX_EDGE.default;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    rotated.width=Math.max(1,Math.round((sideways?bitmap.height:bitmap.width)*scale));
    rotated.height=Math.max(1,Math.round((sideways?bitmap.width:bitmap.height)*scale));
    const context=rotated.getContext('2d');
    if(!context)throw new Error('Image editing is unavailable on this device. Upload an exported JPG or PDF instead.');
    context.imageSmoothingQuality='high';
    context.fillStyle='#fff';context.fillRect(0,0,rotated.width,rotated.height);
    context.translate(rotated.width/2,rotated.height/2);context.rotate(quarter*Math.PI/180);
    context.drawImage(bitmap,-bitmap.width*scale/2,-bitmap.height*scale/2,bitmap.width*scale,bitmap.height*scale);
    const rectangle=cropRectangle(rotated.width,rotated.height,crop);
    output.width=rectangle.width;output.height=rectangle.height;
    const outputContext = output.getContext('2d');
    if (!outputContext) throw new Error('Image editing is unavailable on this device. Upload an exported JPG or PDF instead.');
    outputContext.drawImage(rotated,rectangle.x,rectangle.y,rectangle.width,rectangle.height,0,0,output.width,output.height);
    rotated.width=rotated.height=0; // release the intermediate buffer early on low-memory devices
    let blob;
    for(const quality of QUALITY_STEPS) { blob=await toBlob(output,quality); if(blob.size<=TARGET_BYTES)break; }
    if(blob.size>MAX_DOCUMENT_BYTES)throw new Error('The processed photo is still over 10 MiB. Choose a smaller image without sacrificing readable text.');
    const width = output.width, height = output.height;
    output.width = output.height = 0;
    const quality = await analyzeCompressedImage(blob, width, height, docKey, analyze);
    return {file:new File([blob],'document-photo.jpg',{type:'image/jpeg'}),width,height,quality};
  } finally {rotated.width=rotated.height=output.width=output.height=0;}
}
