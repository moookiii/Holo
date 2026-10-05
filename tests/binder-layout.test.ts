import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BINDER, BinderNavigation, binderCount, pocket, restingPoint, faceHeight, sheetPoint, spreadCount, spreadIndices, spreadFaces } from '../src/binder/BinderLayout.ts';
const settle = (nav: BinderNavigation) => { for (let i=0; i<300 && nav.turn; i++) nav.advance(1/60); assert.equal(nav.turn, undefined); };
test('all 40 faces and multiple binders cover every favorite exactly once', () => {
  assert.equal(BINDER.columns * BINDER.rows, 12);
  for (const count of [0,1,12,24,73,479,480,481,960,961,10000]) {
    const indices = Array.from({length:binderCount(count)},(_,b)=>Array.from({length:spreadCount()},(_,s)=>spreadIndices(s,count,b)).flat()).flat();
    assert.deepEqual(indices,Array.from({length:count},(_,i)=>i));
  }
  assert.deepEqual(spreadFaces(1),[1,2]);
  assert.deepEqual(spreadFaces(20),[39]);
});
test('starts open and turns through every sheet past page six, then back to the cover', () => {
  const nav = new BinderNavigation(0); assert.equal(nav.spread,1);
  for(let target=2;target<=20;target++) { assert.ok(nav.begin(1)); assert.equal(nav.begin(1),false); settle(nav); assert.equal(nav.spread,target); }
  assert.equal(nav.begin(1),false);
  for(let target=19;target>=0;target--) { assert.ok(nav.begin(-1)); settle(nav); assert.equal(nav.spread,target); }
  assert.equal(nav.begin(-1),false);
});
test('drag follows pointer, returns below threshold, completes above, and can be cancelled', () => {
  const nav=new BinderNavigation(1000);
  for(const [progress,cancel,expected] of [[.2,false,1],[.8,true,1],[.8,false,2]] as const) {
    assert.ok(nav.begin(1,true)); nav.drag(progress); nav.advance(.016); assert.equal(nav.turn?.progress,progress);
    nav.release(cancel); settle(nav); assert.equal(nav.spread,expected);
  }
  nav.selectBinder(2); assert.equal(nav.binder,2); assert.equal(nav.spread,1);
  nav.setCount(480); assert.equal(nav.binder,0); assert.equal(nav.spread,1);
});
test('deformation lands in registration for both directions',()=>{
  for(const side of [-1,1] as const) {
    const start=sheetPoint(BINDER.pageWidth,0,side),end=sheetPoint(BINDER.pageWidth,1,side);
    assert.ok(Math.abs(start.x-side*(BINDER.pageWidth+BINDER.hinge))<1e-6);
    assert.ok(Math.abs(end.x+side*(BINDER.pageWidth+BINDER.hinge))<1e-6);
    assert.ok(Math.abs(end.z-.42)<1e-6);
  }
  for(let i=0;i<12;i++) assert.equal(pocket(i,-1).y,pocket(i,1).y);
});

test('resting pockets stay planar beneath rigid cards at every stack height', () => {
  for (let face = 0; face < BINDER.faces; face++) for (const side of [-1, 1] as const) {
    for (let column = 0; column < BINDER.columns; column++) {
      const { u } = pocket(column, side), center = restingPoint(u, side, faceHeight(face));
      for (let dx = -BINDER.cardWidth / 2; dx <= BINDER.cardWidth / 2; dx += .1) {
        const point = restingPoint(u + dx, side, faceHeight(face));
        const expectedZ = center.z - side * Math.tan(center.angle) * dx;
        assert.ok(Math.abs(point.z - expectedZ) < 1e-10, `face ${face}, column ${column}, offset ${dx}`);
        assert.ok(Math.abs(point.angle - center.angle) < 1e-10);
      }
    }
  }
});
