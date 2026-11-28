// Gera as narrações MP3 das videoaulas (public/audio/mei/<aula>-<cena>.mp3).
// Uso (uma vez, no seu computador):
//   OPENAI_API_KEY=sk-... node scripts/generate-mei-audio.mjs
// Custo estimado: centavos (cerca de 8 mil caracteres no total). Arquivos já gerados são pulados.
import {mkdir,writeFile,access} from 'node:fs/promises';
import {LESSONS} from '../src/mei-content.js';

const key=process.env.OPENAI_API_KEY;
if(!key){console.error('Defina OPENAI_API_KEY.');process.exit(1)}
const model=process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice=process.env.OPENAI_TTS_VOICE||'nova';
const dir=new URL('../public/audio/mei/',import.meta.url);
await mkdir(dir,{recursive:true});
let made=0,skipped=0;
for(const l of LESSONS){
 for(let i=0;i<l.scenes.length;i++){
  const file=new URL(`${l.id}-${i}.mp3`,dir);
  try{await access(file);skipped++;continue}catch{}
  const body={model,voice,input:l.scenes[i].say,response_format:'mp3'};
  if(model.includes('gpt-4o'))body.instructions='Fale em português do Brasil, com tom simpático, calmo e claro, como um professor explicando para um iniciante.';
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){console.error(l.id,i,r.status,await r.text());process.exit(1)}
  await writeFile(file,Buffer.from(await r.arrayBuffer()));made++;console.log('ok',l.id,i);
 }
}
console.log(`Pronto: ${made} gerados, ${skipped} já existiam. Faça commit da pasta public/audio/mei.`);
