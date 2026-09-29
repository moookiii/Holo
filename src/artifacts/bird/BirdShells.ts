import { CatmullRomCurve3, Group, Vector3 } from 'three/webgpu';
import { BirdParts, ref, type P, type XY } from './BirdParts.ts';

import { torso, head, section } from './BirdEnvelope.ts';

function panel(parts: BirdParts, group: Group, stations: number[][], u0: number, u1: number, a0: number, a1: number, satin = false) {
  const sample = (u: number, v: number) => section(stations, u0 + (u1 - u0) * u, a0 + (a1 - a0) * v);
  parts.surface(group, sample, 40, 24, .019, satin);
  // Thin polished cut edge; its material is acrylic, not a white metal outline.
  const edges = [Array.from({ length: 41 }, (_, i) => sample(i / 40, 0).toArray() as P), Array.from({ length: 41 }, (_, i) => sample(i / 40, 1).toArray() as P)];
  for (const edge of edges) parts.tube(group, edge, .010, parts.m.acrylicEdge, 48);
  for (const u of [0, 1]) parts.tube(group, Array.from({ length: 25 }, (_, i) => sample(u, i / 24).toArray() as P), .009, parts.m.acrylicEdge, 30);
}

/** Smooth, thin pressed sheet; its outline is a spline through reference pixels. */
function wingSheet(parts: BirdParts, group: Group, outline: P[], center: P, thickness: number) {
  const curve = new CatmullRomCurve3(outline.map(p => new Vector3(...p)), true, 'centripetal');
  const c = new Vector3(...center);
  parts.surface(group, (u, v) => {
    const p = curve.getPoint(v === 1 ? 0 : v);
    return c.clone().lerp(p, u).add(new Vector3(0, 0, (center[2] < 0 ? -1 : 1) * .035 * Math.sin(u * Math.PI)));
  }, 14, 80, thickness);
  parts.tube(group, curve.getPoints(90).map(p => p.toArray() as P), .009, parts.m.acrylicEdge, 90);
}

export function buildShells(parts: BirdParts, groups: Map<string, Group>) {
  const { acrylic, acrylicSatin, aluminium, brass } = parts.m;
  for (const sign of [1, -1]) {
    const side = groups.get(sign > 0 ? 'shell-front' : 'shell-back')!;
    const centerAngle = sign > 0 ? 0 : Math.PI;
    // Main body and overlapping neck/chest panels retain separate cut edges.
    panel(parts, side, torso, 0, .79, centerAngle - 1.04, centerAngle + 1.04);
    panel(parts, side, torso, .775, 1, centerAngle - 1.04, centerAngle + 1.04, true);
    for (const [u, angle] of [[.11, -.7], [.28, .88], [.53, .9], [.72, -.83], [.84, .45], [.65, -.9]]) {
      const p = section(torso, u, centerAngle + sign * angle).toArray() as P;
      parts.cylinder(side, p, .05, .035, acrylicSatin);
      parts.screw(side, [p[0], p[1], p[2] + sign * .025], .027, .09, sign);
    }
  }
  panel(parts, groups.get('shell-dorsal')!, torso, 0, 1, 1.025, Math.PI - 1.025, true);
  panel(parts, groups.get('shell-belly')!, torso, 0, 1, Math.PI + 1.025, 2 * Math.PI - 1.025, true);
  // Close the loft ends: edge walls alone only close panel thickness, not the body.
  const cap = (group: Group, stations: number[][], u: number) => {
    const center = section(stations, u, 0).add(section(stations, u, Math.PI)).multiplyScalar(.5);
    parts.surface(group, (r, v) => center.clone().lerp(section(stations, u, v * Math.PI * 2), r), 12, 64, .019, true);
  };
  cap(groups.get('shell-belly')!, torso, 0);
  cap(groups.get('shell-belly')!, torso, 1);
  const skull = groups.get('head')!;
  panel(parts, skull, head, 0, 1, -Math.PI / 2, Math.PI / 2);
  panel(parts, skull, head, 0, 1, Math.PI / 2, Math.PI * 1.5);
  cap(skull, head, 0);
  cap(skull, head, 1);
  // The lower cheek is part of the closed skull loft and meets the bill root.
  for (const sign of [-1, 1]) {
    for (const p of [ref(1108, 116, sign * .31), ref(1298, 171, sign * .17), ref(1160, 247, sign * .33)]) parts.screw(skull, p, .024, .06, sign);
    // The newer reference has a compact formed-metal bill, with a real lower jaw.
    for(const lower of [false,true]) {
      parts.surface(skull,(u,v)=>{
        const angle=v*Math.PI/2, taper=Math.pow(1-u,.7);
        const x=2.25+u*.46,y=1.46-u*.055;
        return new Vector3(x,y+(lower?-1:1)*Math.sin(angle)*(lower?.11:.23)*taper,sign*Math.cos(angle)*.18*taper);
      },22,14,.013,false,parts.m.aluminium);
    }
    parts.tube(skull,[[2.27,1.46,sign*.184],[2.44,1.44,sign*.135],[2.59,1.42,sign*.072],[2.71,1.405,0]],.008,parts.m.black,22);
    parts.ball(skull,[2.38,1.565,sign*.136],[.031,.021,.005],parts.m.black);
    parts.screw(skull,[2.22,1.445,sign*.23],.03,.09,sign);
  }

  for (const sign of [1, -1]) {
    const wing = groups.get(sign > 0 ? 'wing-front' : 'wing-back')!;
    const offset = sign < 0 ? .05 : 0;
    const points = [ref(277, 627, sign * .24), ref(390, 543, sign * .48), ref(610, 423, sign * .77), ref(805, 314, sign * .83), ref(951, 276, sign * .72), ref(1066, 300, sign * .67), ref(1091, 363, sign * .68), ref(1043, 434, sign * .84), ref(898, 516, sign * .87), ref(718, 567, sign * .76), ref(485, 610, sign * .47)];
    for (const p of points) p[1] += offset;
    wingSheet(parts, wing, points, ref(790, 431, sign * .99), .021);
    // Shoulder bearing and two remote sheet mountings, not decorative spokes.
    for (const p of [ref(997, 313, sign * .79), ref(789, 492, sign * .96), ref(650, 422, sign * .83)]) {
      parts.cylinder(wing, p, .056, .055, acrylicSatin);
      parts.screw(wing, [p[0], p[1], p[2] + sign * .036], .025, .085, sign);
    }
    parts.tube(wing, [ref(1018, 323, sign * .79), ref(945, 443, sign * .92), ref(782, 518, sign * .96), ref(548, 581, sign * .62), ref(307, 621, sign * .29)], .010, parts.m.acrylicEdge, 64);
  }

  const tail = groups.get('tail')!;
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * .16, y = i % 2 * 10;
    wingSheet(parts, tail, [ref(638, 577, z), ref(698, 629, z * 1.35), ref(567, 682, z * 1.1), ref(206 + i * 12, 804 - y, z * .7), ref(287, 740 - y, z * .75), ref(479, 628, z)], ref(474, 673, z), .017);
    parts.rod(tail, ref(590, 631, z), ref(239 + i * 12, 780 - y, z * .72), .010, aluminium);
    parts.rod(tail, ref(551, 641, z + .018), ref(285, 755 - y, z * .73), .005, brass);
    parts.screw(tail, ref(610, 625, z + .025), .022);
  }
  // A small tail root hinge bridges all four laminae.
  parts.rod(tail, ref(613, 623, -.34), ref(613, 623, .34), .055, brass);
  for (const z of [-.32, .32]) parts.ring(tail, ref(613, 623, z), .075, .012, aluminium);
}
