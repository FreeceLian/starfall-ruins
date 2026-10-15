type Point = { x: number; y: number };
type Pillar = Point & { radius: number };

// A bounded grid only for the large Boss. No additional entities or per-frame searches.
export class BossNavigation {
  private points: Point[] = [];
  private edges: number[][] = [];
  private parents: number[] = [];
  private route: Point[] = [];
  private nextRoute = -1;
  private lastTarget: Point = { x: -999, y: -999 };
  constructor(private obstacles: Pillar[], private radius: number, size: number) {
    const min = 52 + radius, max = size - min, step = 36;
    const width = Math.floor((max - min) / step) + 1, grid = new Map<number, number>();
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
      const p = { x: min + x * step, y: min + y * step };
      if (this.clear(p, p)) { grid.set(y * width + x, this.points.length); this.points.push(p); this.edges.push([]); }
    }
    for (const [cell, id] of grid) for (const offset of [1, width]) {
      if (offset === 1 && cell % width === width - 1) continue;
      const other = grid.get(cell + offset);
      if (other !== undefined && this.clear(this.points[id], this.points[other])) {
        this.edges[id].push(other); this.edges[other].push(id);
      }
    }
  }
  private clear(a: Point, b: Point) {
    const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
    return this.obstacles.every(o => {
      const t = length ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / length)) : 0;
      return Math.hypot(o.x - a.x - dx * t, o.y - a.y - dy * t) >= o.radius + this.radius + 2;
    });
  }
  private flood(target: Point) {
    let root = -1, best = Infinity;
    this.points.forEach((p, i) => { const d = Math.hypot(p.x - target.x, p.y - target.y); if (d < best) { root = i; best = d; } });
    this.parents = this.points.map(() => -1);
    if (root < 0) return;
    const queue = [root]; this.parents[root] = root;
    for (let head = 0; head < queue.length; head++) for (const next of this.edges[queue[head]]) {
      if (this.parents[next] !== -1) continue;
      this.parents[next] = queue[head]; queue.push(next);
    }
  }
  spawn(preferred: Point, target: Point): Point {
    this.flood(target);
    let best = Infinity, result: Point | undefined;
    this.points.forEach((p, i) => {
      if (this.parents[i] < 0) return;
      const distance = Math.hypot(p.x - target.x, p.y - target.y);
      const score = Math.hypot(p.x - preferred.x, p.y - preferred.y) + Math.max(0, 220 - distance) * 10;
      if (score < best) { best = score; result = p; }
    });
    return result ?? preferred;
  }
  waypoint(from: Point, target: Point, time: number): Point {
    if (this.clear(from, target)) { this.route = []; return target; }
    if (time >= this.nextRoute && (!this.route.length || Math.hypot(target.x - this.lastTarget.x, target.y - this.lastTarget.y) > 36)) {
      this.lastTarget = { ...target };
      this.nextRoute = time + .75; this.flood(target); this.route = [];
      let start = -1, best = Infinity;
      this.points.forEach((p, i) => {
        const d = Math.hypot(p.x - from.x, p.y - from.y);
        if (this.parents[i] >= 0 && d < best && this.clear(from, p)) { start = i; best = d; }
      });
      if (start >= 0) for (let i = start; ; i = this.parents[i]) {
        this.route.push(this.points[i]); if (this.parents[i] === i) break;
      }
    }
    while (this.route.length > 1 && this.clear(from, this.route[1])) this.route.shift();
    const next = this.route[0];
    return next ?? from;
  }
}
