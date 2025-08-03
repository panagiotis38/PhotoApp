import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { imageCompression } from 'https://unpkg.com/browser-image-compression@latest';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const video = document.getElementById('preview');
const canvas = document.getElementById('canvas');
const btnCapture = document.getElementById('btnCapture');
const photoPreview = document.getElementById('photoPreview');
const photoImg = document.getElementById('photoImg');
const btnUpload = document.getElementById('btnUpload');
const btnRetake = document.getElementById('btnRetake');
const counterEl = document.getElementById('counter');
const msgEl = document.getElementById('message');

let stream = null, blob = null;
let remaining = 10;
let userId = null;

function updateCounter(){
  counterEl.textContent = remaining;
  if(remaining <= 0){
    btnCapture.disabled = true;
    btnUpload.disabled = true;
    msgEl.textContent = 'Upload limit reached.';
  }
}

async function startCamera(){
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:true});
    video.srcObject = stream;
    btnCapture.disabled = false;
  } catch(e){
    msgEl.textContent = 'Camera access denied.';
    console.error(e);
  }
}

btnCapture.addEventListener('click',()=>{
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  canvas.toBlob(b=>{
    blob = b;
    photoImg.src = URL.createObjectURL(b);
    photoPreview.style.display='block';
    btnUpload.disabled=false;
    btnCapture.disabled=true;
  }, 'image/jpeg');
});

btnRetake.addEventListener('click',()=>{
  photoPreview.style.display='none';
  btnCapture.disabled = remaining <= 0;
});

btnUpload.addEventListener('click',async ()=>{
  btnUpload.disabled=true;
  msgEl.textContent = 'Compressing...';
  try{
    const compressed = await imageCompression(blob, {maxSizeMB:1, maxWidthOrHeight:1920, useWebWorker:true});
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('user_uploads').upload(path, compressed, { cacheControl:'3600', upsert:false });
    if(error) throw error;
    remaining--;
    updateCounter();
    msgEl.textContent = 'Uploaded!';
  } catch(e){
    console.error(e);
    msgEl.textContent='Upload failed.';
    btnUpload.disabled = false;
  }
  photoPreview.style.display='none';
  if(remaining>0) btnCapture.disabled=false;
});

async function init(){
  const { data:user, error } = await supabase.auth.signInAnonymously();
  if(error){
    msgEl.textContent='Auth failed.';
    console.error(error);
    return;
  }
  userId = user.id;
  updateCounter();
  startCamera();
}

init();
