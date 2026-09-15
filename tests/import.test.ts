import test from 'node:test';
import assert from 'node:assert/strict';
import { packMapChannels } from '../src/assets/MapPacking.ts';
import { parseCardImportManifest, relativeAssetPath } from '../src/assets/CardImportManifest.ts';
import { masterPrism } from '../src/materials/HolographicProfile.ts';

const pixel = (r: number, g = r, b = r, a = 255) => [r, g, b, a];
const profiles = [masterPrism, { ...masterPrism, id: 'print-only' }, { ...masterPrism, id: 'pokemon-test', family: 'Pokémon' as const }];
const minimal = { title: 'Local original', front: 'front.png', back: 'back.jpg' };

test('individual maps override packed channels without losing independent masks', () => {
  const packed = packMapChannels(1, 1, {
    coverage: pixel(20, 30, 40, 50), surface: pixel(60, 70, 80),
    foil: pixel(210), roughness: pixel(190), stamp: pixel(160), pattern: pixel(0), secondaryPattern: pixel(96),
  });
  assert.deepEqual([...packed.coverage], [210, 30, 40, 50]);
  assert.deepEqual([...packed.surface], [60, 190, 80, 160]);
  assert.deepEqual([...packed.pattern], [0, 96, 255, 0]);
});

test('extended foil remains independent of primary coverage and honors print protection', () => {
  const packed = packMapChannels(3, 1, {
    foil: [...pixel(20), ...pixel(20), ...pixel(20)],
    extendedFoil: [...pixel(200), ...pixel(200), ...pixel(200)],
    protection: [...pixel(0), ...pixel(128), ...pixel(255)],
  });
  assert.deepEqual([packed.coverage[0], packed.coverage[4], packed.coverage[8]], [20, 10, 0]);
  assert.deepEqual([packed.pattern[3], packed.pattern[7], packed.pattern[11]], [200, 100, 0]);
});

test('print protection removes foil and stamps while preserving laminate and surface relief', () => {
  const packed = packMapChannels(2, 1, {
    coverage: [...pixel(255), ...pixel(255)], surface: [...pixel(100, 200, 150), ...pixel(100, 200, 150)],
    protection: [...pixel(255), ...pixel(128)], stamp: [...pixel(255), ...pixel(255)],
  });
  assert.deepEqual([...packed.coverage], [0, 0, 0, 255, 127, 127, 127, 255]);
  assert.deepEqual([...packed.surface], [100, 200, 150, 0, 100, 200, 150, 127]);
  assert.deepEqual([...packMapChannels(1, 1, {}).surface], [128, 128, 255, 0], 'legacy alpha is never an implicit stamp');
  assert.deepEqual([...packMapChannels(1, 1, { protection: pixel(128) }, 255).coverage], [127, 0, 0, 255], 'automatic whole-front foil honors print protection');
});

test('image hologram protection masks the window without changing virtual depth or angle', () => {
  const packed = packMapChannels(3, 1, {
    hologram: [...pixel(180, 240, 90), ...pixel(180, 240, 90), ...pixel(180, 240, 90)],
    protection: [...pixel(0), ...pixel(128), ...pixel(255)],
  });
  assert.deepEqual([...packed.hologram!], [180, 240, 90, 255, 180, 120, 90, 255, 180, 0, 90, 255]);
  assert.equal(packMapChannels(1, 1, {}).hologram, undefined, 'ordinary cards need no image-depth allocation');
});

test('manifest resolves safe paths, dimensions and independent regional tuning', () => {
  const spec = parseCardImportManifest({ ...minimal, version: 1, profile: 'master-prism', front: './art\\front.png',
    dimensions: { width: 6.2 }, backCrop: [0, .01, .98, .99], maps: { normal: 'maps/normal.png', stamp: 'maps/stamp.png' },
    profileOverrides: { diffraction: { strength: .8 }, secondaryProfile: 'master-prism', secondary: { surface: { roughness: .2 } }, stampProfile: 'master-prism', stamp: { glints: { ordered: true } } },
    mapSettings: { normalScale: .6, roughnessMode: 'absolute', embossStrength: .2 } }, profiles);
  assert.equal(spec.front, 'art/front.png'); assert.equal(spec.dimensions.width, 6.2); assert.equal(spec.dimensions.height, 8.8);
  assert.equal(spec.profileOverrides?.secondary?.surface?.roughness, .2);
  assert.equal(spec.profileOverrides?.stamp?.glints?.ordered, true);
  assert.deepEqual(spec.backCrop, [0, .01, .98, .99]);
  assert.equal(parseCardImportManifest(minimal, profiles).profile, 'print-only');
});

test('invalid paths, profiles and material values fail with actionable validation errors', () => {
  for (const path of ['../front.png', 'https://example.org/front.png', 'C:\\front.png', '/front.png', 'maps//front.png']) {
    assert.throws(() => relativeAssetPath(path, 'front'), /inside the selected bundle/);
  }
  assert.throws(() => parseCardImportManifest({ ...minimal, profile: 'missing' }, profiles), /Unknown foil profile/);
  assert.throws(() => parseCardImportManifest({ ...minimal, profile: 'pokemon-test' }, profiles), /selected franchise/);
  assert.throws(() => parseCardImportManifest({ ...minimal, dimensions: { thickness: .01, bevel: .01 } }, profiles), /half the thickness/);
  assert.throws(() => parseCardImportManifest({ ...minimal, profileOverrides: { secondary: { glints: { strength: 1 } } } }, profiles), /Choose secondaryProfile/);
  assert.throws(() => parseCardImportManifest({ ...minimal, profileOverrides: { diffraction: { strength: NaN } } }, profiles), /must be between/);
  assert.throws(() => parseCardImportManifest({ ...minimal, profileOverrides: { diffraction: { constructor: 1 } } }, profiles), /Unknown/);
  assert.throws(() => parseCardImportManifest({ ...minimal, maps: { sparkleMask: 'mask.png' } }, profiles), /Unknown maps field/);
  assert.throws(() => parseCardImportManifest({ ...minimal, backCrop: [0, .8, 1, .2] }, profiles), /positive width and height/);
  assert.throws(() => parseCardImportManifest({ ...minimal, backCrop: [0, 0, 1.2, 1] }, profiles), /between/);
});

test('registered material layout rejects inverted and misplaced artwork rectangles', () => {
  const layout = { artwork: [.12, .18, .88, .71], innerFrame: [.04, .03, .96, .97] };
  const spec = parseCardImportManifest({ ...minimal, layout,
    profileOverrides: { structure: { field: 'collector-prismatic' }, surface: { frameVarnish: .6 } } }, profiles);
  assert.deepEqual(spec.layout, layout);
  assert.equal(spec.profileOverrides?.surface?.frameVarnish, .6);
  assert.throws(() => parseCardImportManifest({ ...minimal, layout: { ...layout, artwork: [.8, .2, .1, .7] } }, profiles), /positive width and height/);
  assert.throws(() => parseCardImportManifest({ ...minimal, layout: { ...layout, artwork: [0, .18, .88, .71] } }, profiles), /inside layout.innerFrame/);
  assert.throws(() => parseCardImportManifest({ ...minimal, layout: { ...layout, innerFrame: [0, 0, 1, Infinity] } }, profiles), /between/);
});
