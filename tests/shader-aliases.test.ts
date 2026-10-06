import test from 'node:test';
import assert from 'node:assert/strict';
import { eliminateShaderAliases, optimizeShaderBuilder } from '../src/rendering/ShaderAliases.ts';

const shader = (body: string, types = 'float nodeVar0;\nfloat nodeVar1;\nfloat nodeVar2;') => `${types}\nvoid main() {\n${body}\n}`;
test('synchronous and asynchronous builds optimize only after shader source is generated', async () => {
  for (const asynchronous of [false, true]) {
    let generated = 0;
    const builder = {
      vertexShader: '', fragmentShader: '',
      buildCode() {
        generated++;
        this.vertexShader = this.fragmentShader = shader('nodeVar0 = expensive();\nnodeVar1 = nodeVar0;\noutput = nodeVar1;');
        return this;
      },
      build() { return this.buildCode(); },
      async buildAsync() { await Promise.resolve(); return this.buildCode(); },
    };
    optimizeShaderBuilder(builder);
    assert.equal(asynchronous ? await builder.buildAsync() : builder.build(), builder);
    assert.equal(generated, 1);
    for (const source of [builder.vertexShader, builder.fragmentShader]) {
      assert.ok(source.includes('output = nodeVar0;'));
      assert.ok(!source.includes('nodeVar1 ='));
    }
  }
});
test('immutable copy chains reuse the original computation without duplicating it', () => {
  const result = eliminateShaderAliases(shader('nodeVar0 = expensive();\nnodeVar1 = nodeVar0;\nnodeVar2 = nodeVar1;\noutput = nodeVar2;'));
  assert.ok(result.includes('output = nodeVar0;'));
  assert.equal(result.match(/expensive\(\)/g)?.length, 1);
  assert.ok(!result.includes('nodeVar1 ='));
  assert.ok(!result.includes('nodeVar2 ='));
});
test('mutable sources, component writes and read-before-copy retain their original order', () => {
  for (const body of [
    'nodeVar0 = 1.;\nnodeVar1 = nodeVar0;\nnodeVar0 = 2.;\noutput = nodeVar1;',
    'nodeVar0 = 1.;\nnodeVar1 = nodeVar0;\nnodeVar0 += 2.;\noutput = nodeVar1;',
    'nodeVar0 = 1.;\nnodeVar1 = nodeVar0;\n++nodeVar0;\noutput = nodeVar1;',
    'output = nodeVar1;\nnodeVar0 = 1.;\nnodeVar1 = nodeVar0;',
    'nodeVar0 = vec2(1.);\nnodeVar1 = nodeVar0;\nnodeVar0.x = 2.;\noutput = nodeVar1;',
  ]) { const original = shader(body); assert.equal(eliminateShaderAliases(original), original); }
});
test('type conversions and inout functions are never rewritten', () => {
  const original = shader('nodeVar0 = 1;\nnodeVar1 = nodeVar0;\noutput = nodeVar1;', 'int nodeVar0;\nfloat nodeVar1;');
  assert.equal(eliminateShaderAliases(original), original);
  const reference = 'void change(inout float x) { x = 0.; }\n' + shader('nodeVar0 = 1.;\nnodeVar1 = nodeVar0;\nchange(nodeVar0);\noutput = nodeVar1;');
  assert.equal(eliminateShaderAliases(reference), reference);
});
test('helper-local names do not override global variable types', () => {
  const original = shader('nodeVar0 = 1;\nnodeVar1 = nodeVar0;\noutput = nodeVar1;',
    'int nodeVar0;\nfloat nodeVar1;\nfloat helper() {\nfloat nodeVar0;\nreturn 1.;\n}');
  assert.equal(eliminateShaderAliases(original), original);
});
test('runtime loops retain snapshots from earlier iterations', () => {
  const original = shader('for (int i = 0; i < 3; i++) {\nnodeVar0 = float(i);\nif (i == 0) {\nnodeVar1 = nodeVar0;\n}\n}\noutput = nodeVar1;');
  assert.equal(eliminateShaderAliases(original), original);
});
test('comment text cannot declare variables or add writes to the analysis', () => {
  const input = shader('nodeVar0 = 1.;\n// nodeVar0 = 2.;\nnodeVar1 = nodeVar0;\noutput = nodeVar1;',
    'float nodeVar0;\nfloat nodeVar1;\n/*\nint nodeVar0;\n*/');
  assert.ok(eliminateShaderAliases(input).includes('output = nodeVar0;'));
});
