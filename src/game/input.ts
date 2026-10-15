import type { Vec } from './model';
export class Controls {
  keys = new Set<string>(); axis: Vec = { x: 0, y: 0 }; private pointer: number | null = null;
  constructor(private pad: HTMLElement, private knob: HTMLElement, dash: HTMLElement, onDash: () => void, onPause: () => void) {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).matches('input,button')) { if (e.code === 'Escape') onPause(); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat) onDash();
      if (e.code === 'Escape' && !e.repeat) onPause();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    pad.addEventListener('pointerdown', e => { if (this.pointer !== null) return; this.pointer = e.pointerId; pad.setPointerCapture(e.pointerId); this.drag(e); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === this.pointer) this.drag(e); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(event, () => this.clear());
    dash.addEventListener('pointerdown', e => { e.preventDefault(); onDash(); });
    dash.addEventListener('click', e => { if (e.detail === 0) onDash(); });
  }
  private drag(e: PointerEvent) {
    const rect = this.pad.getBoundingClientRect(); const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y), radius = rect.width * 0.29, scale = Math.min(1, radius / Math.max(length, 0.01));
    this.axis = { x: x * scale / radius, y: y * scale / radius };
    this.knob.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
  }
  vector(): Vec {
    let x = this.axis.x + Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let y = this.axis.y + Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const n = Math.max(1, Math.hypot(x, y)); return { x: x / n, y: y / n };
  }
  clear() { this.keys.clear(); this.axis = { x: 0, y: 0 }; this.pointer = null; this.knob.style.transform = 'translate(0,0)'; }
}
