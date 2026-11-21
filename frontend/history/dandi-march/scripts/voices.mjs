// Regenerate the scratch voice assets with an FFmpeg build that includes libflite.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lines } from '../story.mjs';
const dir = mkdtempSync(join(tmpdir(),'dandi-voices-'));
try {
  for (const [id,line] of Object.entries(lines)) {
    const txt = join(dir,id+'.txt');
    writeFileSync(txt,line.text.replaceAll('’',"'"));
    const voice = line.speaker==='raman'?'slt':'rms';
    const file = fileURLToPath(new URL('../voice-'+id+'.mp3',import.meta.url));
    const r = spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i',
      'flite=textfile='+txt+':voice='+voice,'-af','highpass=f=90,alimiter=limit=0.8','-ac','1','-ar','22050','-b:a','32k',file],{stdio:'inherit'});
    if (r.error || r.status!==0) throw r.error || new Error('ffmpeg failed: '+id);
  }
} finally {rmSync(dir,{recursive:true,force:true});}
