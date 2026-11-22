/*
 * Efek visual ringan NUTRANTARA: partikel (konfeti, debu, kilau), pilar cahaya, dan gelombang cincin.
 * Semua efek dihapus otomatis setelah selesai.
 */
import * as THREE from './vendor/three/three.module.min.js';

const CONFETTI = ['#78f4bd', '#68dce7', '#ffd17c', '#ff9f91', '#c58cf0', '#ffffff'];

export function createFx(scene) {
  const live = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function particles(origin, { count = 40, colors = CONFETTI, speed = 5, up = 4, life = 1.4, gravity = 9, size = 0.18, spread = 0.2 } = {}) {
    if (reduce) count = Math.ceil(count / 4);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = origin.x + (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      vel.push(new THREE.Vector3(Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r));
      c.set(colors[i % colors.length]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    live.push({
      obj: pts, t: 0, life,
      update(dt) {
        const p = geo.attributes.position;
        for (let i = 0; i < count; i += 1) {
          vel[i].y -= gravity * dt;
          p.setXYZ(i, p.getX(i) + vel[i].x * dt, p.getY(i) + vel[i].y * dt, p.getZ(i) + vel[i].z * dt);
        }
        p.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - this.t / life);
      }
    });
  }

  function ring(origin, { color = '#68dce7', from = 0.3, to = 3, life = 0.7, y = 0.06 } = {}) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(origin.x, origin.y + y, origin.z);
    scene.add(m);
    live.push({ obj: m, t: 0, life, update() { const k = this.t / life; m.scale.setScalar(from + (to - from) * k); m.material.opacity = 1 - k; } });
  }

  function pillar(origin, { color = '#ffd17c', height = 14, life = 2.4, radius = 1.1 } = {}) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.3, height, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = height / 2;
    g.add(beam);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, height, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.position.y = height / 2;
    g.add(core);
    g.position.copy(origin);
    scene.add(g);
    live.push({
      obj: g, t: 0, life,
      update() {
        const k = this.t / life;
        const grow = Math.min(1, k * 4);
        g.scale.set(1 - k * 0.6, grow, 1 - k * 0.6);
        beam.material.opacity = 0.5 * (1 - k);
        core.material.opacity = 0.6 * (1 - k);
        g.rotation.y += 0.05;
      }
    });
  }

  return {
    confetti: (o) => particles(o, { count: 70, speed: 4, up: 6, life: 1.8, gravity: 7, size: 0.2 }),
    dust: (o) => particles(o, { count: 18, colors: ['#e8dcc0', '#d9c9a3', '#fff7e0'], speed: 2.2, up: 1.2, life: 0.7, gravity: 3, size: 0.25 }),
    sparkle: (o, color = '#ffd17c') => particles(o, { count: 26, colors: [color, '#ffffff'], speed: 2, up: 3, life: 0.9, gravity: 2, size: 0.15 }),
    rise: (o, color = '#ffd17c') => particles(o, { count: 50, colors: [color, '#ffffff', '#fff3c4'], speed: 1.2, up: 6, life: 2.2, gravity: -1, size: 0.17, spread: 1.6 }),
    ring,
    pillar,
    update(dt) {
      for (let i = live.length - 1; i >= 0; i -= 1) {
        const e = live[i];
        e.t += dt;
        e.update(dt);
        if (e.t >= e.life) {
          scene.remove(e.obj);
          e.obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
          live.splice(i, 1);
        }
      }
    }
  };
}
