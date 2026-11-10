import React,{useEffect,useRef,useState} from 'react';
import {Mic,Square,LoaderCircle,AlertCircle} from 'lucide-react';
import './nexus-voice-recorder.css';

export default function NexusVoiceRecorder({onRecorded,disabled=false}){
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const recorder=useRef(null),stream=useRef(null),chunks=useRef([]),clock=useRef(null);
 useEffect(()=>()=>{if(clock.current)clearInterval(clock.current);stream.current?.getTracks().forEach(t=>t.stop());},[]);
 async function start(){if(disabled||recording||busy)return;setError('');setBusy(true);try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Seu navegador não permite gravar áudio aqui. Atualize o navegador ou anexe um áudio.');const media=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=media;const preferred=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/aac'].find(t=>MediaRecorder.isTypeSupported?.(t));const rec=new MediaRecorder(media,preferred?{mimeType:preferred}:undefined);recorder.current=rec;chunks.current=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.current.push(e.data)};rec.onstop=()=>{const blob=new Blob(chunks.current,{type:rec.mimeType||'audio/webm'});const ext=(blob.type.includes('mp4')?'m4a':blob.type.includes('aac')?'aac':'webm');if(blob.size>12*1024*1024){setError('O áudio passou de 12 MB. Grave uma mensagem menor.');}else if(blob.size>0)onRecorded(new File([blob],'mensagem-de-voz.'+ext,{type:blob.type}));media.getTracks().forEach(t=>t.stop());stream.current=null;setRecording(false);setBusy(false);if(clock.current)clearInterval(clock.current);};rec.start(250);setSeconds(0);setRecording(true);setBusy(false);clock.current=setInterval(()=>setSeconds(s=>s+1),1000);}catch(e){setError(e.message||'Não foi possível acessar o microfone.');stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setBusy(false);}}
 function stop(){if(recorder.current?.state==='recording')recorder.current.stop();}
 return <div className="nx-voice-wrap"><button type="button" className={'nx-voice-button '+(recording?'recording':'')} disabled={disabled||busy} onClick={recording?stop:start} title={recording?'Finalizar gravação':'Gravar mensagem de voz'}>{busy?<LoaderCircle size={16} className="nx-voice-spin"/>:recording?<Square size={14} fill="currentColor"/>:<Mic size={16}/>}</button>{recording&&<span className="nx-voice-recording"><i/> Gravando {String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')} · toque para finalizar</span>}{error&&<span className="nx-voice-error"><AlertCircle size={12}/>{error}</span>}</div>;
}
export function NexusMessageAttachment({url,path}){
 if(!url)return null;
 const ext=String(path||'').split('.').pop().toLowerCase();
 if(['webm','m4a','mp3','wav','aac','ogg','mp4'].includes(ext))return <audio className="nx-message-audio" controls preload="metadata" src={url}/>;
 if(['jpg','jpeg','png','webp','gif'].includes(ext))return <a className="nx-message-image-link" href={url} target="_blank" rel="noreferrer"><img src={url} alt="Imagem compartilhada" loading="lazy"/></a>;
 return <a className="social-chat-attachment" href={url} target="_blank" rel="noreferrer">Abrir arquivo compartilhado</a>;
}
