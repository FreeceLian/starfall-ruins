import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioBus } from '../src/game/audio';
import { parseSave } from '../src/game/storage';
class Param { value=0; setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} }
class Gain { gain=new Param(); disconnected=false; connect(){} disconnect(){this.disconnected=true;} }
class Osc { frequency=new Param(); onended?:()=>void; type='sine'; stopped=false; disconnected=false; connect(){} disconnect(){this.disconnected=true;} start(){} stop(){this.stopped=true;} end(){this.onended?.();} }
class Context { static current:Context; currentTime=0; state='running'; destination={}; oscs:Osc[]=[]; gains:Gain[]=[]; constructor(){Context.current=this;} resume(){return Promise.resolve();} createGain(){const g=new Gain();this.gains.push(g);return g;} createOscillator(){const o=new Osc();this.oscs.push(o);return o;} }
Object.assign(globalThis,{AudioContext:Context});
test('sound stays locked until gesture; all seven effects produce bounded audio',()=>{
 const a=new AudioBus(); a.play('hit'); assert.equal(a.diagnostics().state,'locked'); a.unlock();
 for(const kind of ['shot','hit','hurt','pickup','dash','kill','upgrade'] as const) a.play(kind);
 assert.equal(a.diagnostics().voices,10); for(let i=0;i<100;i++){Context.current.currentTime+=.1;a.play('upgrade');} assert.equal(a.diagnostics().voices,32);
 for(const o of Context.current.oscs)o.end(); assert.equal(a.diagnostics().voices,0); assert.ok(Context.current.oscs.every(o=>o.disconnected));
});
test('music pauses without timers and voices disconnect on completion',()=>{
 const a=new AudioBus();a.unlock();a.update(true);assert.ok(a.diagnostics().voices>0);assert.equal(a.diagnostics().musicPlaying,true);
 const count=Context.current.oscs.length;a.update(true);assert.equal(Context.current.oscs.length,count);a.update(false);assert.equal(a.diagnostics().musicPlaying,false);assert.ok(Context.current.oscs.every(o=>o.stopped));
 for(const o of Context.current.oscs)o.end();assert.equal(a.diagnostics().voices,0);a.update(false);assert.equal(a.diagnostics().voices,0);
});
test('music and effects mute separately; old saves migrate without losing records',()=>{
 const a=new AudioBus();a.unlock();a.musicVolume=0;a.update(true);assert.equal(a.diagnostics().voices,0);a.play('dash');assert.equal(a.diagnostics().voices,1);a.volume=0;a.play('hit');assert.equal(a.diagnostics().voices,1);
 const save=parseSave('{"volume":0.6,"bestKills":25,"runs":7}');assert.equal(save.musicVolume,.25);assert.equal(save.bestKills,25);assert.equal(save.runs,7);assert.equal(save.volume,.6);assert.equal(parseSave('{"musicVolume":9}').musicVolume,1);
});
