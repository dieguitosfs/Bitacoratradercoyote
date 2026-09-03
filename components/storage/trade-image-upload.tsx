'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Uploaded={storagePath:string;mimeType:'image/jpeg'|'image/png'|'image/webp';sizeBytes:number};
export function TradeImageUpload({onUploaded,required=false,label='Captura del análisis previo'}:{onUploaded:(value:Uploaded|null)=>void;required?:boolean;label?:string}){
 const [status,setStatus]=useState(''); const [preview,setPreview]=useState<string|null>(null);
 async function upload(file:File|null){ if(!file){onUploaded(null);setPreview(null);return;} const allowed=['image/jpeg','image/png','image/webp']; if(!allowed.includes(file.type)){setStatus('Formato no permitido. Usa JPG, PNG o WEBP.');return;} if(file.size>10*1024*1024){setStatus('La imagen supera 10 MB.');return;} const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user){setStatus('Sesión no válida.');return;} const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'; const now=new Date(); const path=`${user.id}/trades/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.${ext}`; setStatus('Subiendo…'); const {error}=await supabase.storage.from('trade-images').upload(path,file,{contentType:file.type,upsert:false}); if(error){setStatus(error.message);return;} setPreview(URL.createObjectURL(file)); setStatus('Captura cargada correctamente.'); onUploaded({storagePath:path,mimeType:file.type as Uploaded['mimeType'],sizeBytes:file.size}); }
 return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><label className="block font-medium">{label}{required?' *':''}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e.target.files?.[0]??null)} className="mt-2 block w-full text-sm"/></label>{preview&&<img src={preview} alt="Vista previa" className="mt-3 max-h-52 rounded-lg object-contain"/>}{status&&<p className="mt-2 text-xs text-slate-400">{status}</p>}</div>
}
