// Progress describes browser transfer only, never scanner or reviewer completion.
export function uploadWithProgress(url, body, onProgress) {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',url);xhr.setRequestHeader('Accept','application/json');xhr.timeout=600000;
    xhr.upload.onprogress=e=>onProgress(e.lengthComputable?`Uploading — ${Math.min(100,Math.floor(e.loaded/e.total*100))}% transferred`:'Uploading documents…');
    xhr.upload.onload=()=>onProgress('Transfer complete — waiting for server checks and a submission receipt.');
    xhr.onerror=xhr.ontimeout=xhr.onabort=()=>reject(new Error('Upload interrupted'));
    xhr.onload=()=>resolve({ok:xhr.status>=200&&xhr.status<300,json:async()=>JSON.parse(xhr.responseText)});
    onProgress('Uploading documents…');xhr.send(body);
  });
}
