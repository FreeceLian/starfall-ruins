type Sound = 'shot' | 'hit' | 'hurt' | 'pickup' | 'dash' | 'kill' | 'upgrade';
// One context, bounded voices, no interval timers or streamed assets.
export class AudioBus {
  private ctx?: AudioContext; private fx?: GainNode; private music?: GainNode;
  private effectsVolume = 0.35; private scoreVolume = 0.25;
  private voices = new Set<OscillatorNode>(); private last = new Map<Sound, number>();
  private beat = 0; private nextBeat = 0; private running = false;
  get volume() { return this.effectsVolume; }
  set volume(v: number) { this.effectsVolume = Math.max(0, Math.min(1, v)); if (this.fx) this.fx.gain.value = this.effectsVolume; }
  get musicVolume() { return this.scoreVolume; }
  set musicVolume(v: number) { this.scoreVolume = Math.max(0, Math.min(1, v)); if (this.music) this.music.gain.value = this.scoreVolume; }
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext(); this.fx = this.ctx.createGain(); this.music = this.ctx.createGain();
      this.fx.gain.value = this.volume; this.music.gain.value = this.musicVolume;
      this.fx.connect(this.ctx.destination); this.music.connect(this.ctx.destination);
    }
    void this.ctx.resume().catch(() => {});
  }
  private tone(freq: number, end: number, duration: number, loudness: number, type: OscillatorType, music = false, delay = 0) {
    const ctx = this.ctx, bus = music ? this.music : this.fx;
    if (!ctx || !bus || ctx.state !== 'running' || this.voices.size >= 32) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(loudness, now + Math.min(0.025, duration / 4)); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(bus); this.voices.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(osc); };
    osc.start(now); osc.stop(now + duration + 0.02);
  }
  play(kind: Sound) {
    if (!this.ctx || this.volume <= 0) return;
    const now = this.ctx.currentTime, gap = kind === 'pickup' ? 0.07 : kind === 'hit' ? 0.04 : 0.03;
    if (now - (this.last.get(kind) ?? -10) < gap) return;
    this.last.set(kind, now);
    switch (kind) {
      case 'shot': this.tone(750, 160, 0.10, 0.045, 'triangle'); break;
      case 'hit': this.tone(180, 60, 0.08, 0.06, 'triangle'); break;
      case 'hurt': this.tone(100, 36, 0.26, 0.16, 'sawtooth'); break;
      case 'pickup': this.tone(1046, 1568, 0.12, 0.055, 'sine'); break;
      case 'dash': this.tone(130, 670, 0.22, 0.08, 'triangle'); break;
      case 'kill': this.tone(240, 50, 0.25, 0.065, 'triangle'); break;
      case 'upgrade': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, f, 0.65, 0.08, 'sine', false, i * 0.10)); break;
    }
  }
  update(playing: boolean) {
    const ctx = this.ctx; if (!ctx) return;
    if (!playing) {
      if (this.running) for (const voice of this.voices) { try { voice.stop(); } catch { /* already ended */ } }
      this.running = false; this.nextBeat = ctx.currentTime; return;
    }
    if (!this.running) { this.nextBeat = ctx.currentTime; this.running = true; }
    if (this.musicVolume <= 0 || ctx.state !== 'running') { this.nextBeat = ctx.currentTime; return; }
    if (ctx.currentTime < this.nextBeat) return;
    // Original 32-beat ambient score. No sampled or copyrighted melody.
    const roots = [110, 87.307, 130.813, 97.999], root = roots[Math.floor(this.beat / 8) % 4];
    const notes = [2, 0, 3, 4, 0, 3, 2, 0], ratio = notes[this.beat % 8];
    if (this.beat % 8 === 0) { this.tone(root, root, 2.6, 0.085, 'sine', true); this.tone(root * 1.5, root * 1.5, 2.4, 0.035, 'sine', true); }
    if (ratio) this.tone(root * ratio, root * ratio, 0.85, 0.043, 'sine', true);
    if (this.beat % 2 === 0) this.tone(62, 36, 0.12, 0.05, 'sine', true);
    this.beat = (this.beat + 1) % 32; this.nextBeat = ctx.currentTime + 0.375;
  }
  diagnostics() { return { voices: this.voices.size, state: this.ctx?.state ?? 'locked', musicPlaying: this.running, musicVolume: this.musicVolume, volume: this.volume }; }
}
