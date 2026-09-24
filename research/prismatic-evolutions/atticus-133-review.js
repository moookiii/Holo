const toggle = document.querySelector('#toggle');
const coverages = [...document.querySelectorAll('.coverage')];
function showCoverage(visible) {
  const hidden = !visible;
  coverages.forEach(coverage => { coverage.hidden = hidden; });
  toggle.setAttribute('aria-pressed', String(!hidden));
  toggle.textContent = hidden ? 'Show foil coverage' : 'Hide foil coverage';
}
toggle.addEventListener('click', () => showCoverage(coverages[0].hidden));

const card = document.querySelector('#main-card');
const detail = document.querySelector('#detail-card');
const position = document.querySelector('#detail-position');
function focusDetail(x, y) {
  detail.style.left = `${135-x*3}px`;
  detail.style.top = `${142.5-y*3}px`;
  position.textContent = `Print coordinates: ${Math.round(x)}, ${Math.round(y)}`;
}
card.addEventListener('pointermove', event => {
  const bounds = card.getBoundingClientRect();
  const x = Math.max(45, Math.min(555, (event.clientX-bounds.left)/bounds.width*600));
  const y = Math.max(47.5, Math.min(777.5, (event.clientY-bounds.top)/bounds.height*825));
  focusDetail(x, y);
});

const reference = document.querySelector('#reference');
const note = document.querySelector('#registration-note');
const base = './registered/133-holo/';
const front = '/cards/pokemon/prismatic-evolutions/133.png';
try {
  const response = await fetch(`${base}registration.json`);
  if (!response.ok) throw new Error('Registered reference photographs unavailable');
  const registration = await response.json();
  if (registration.cardId !== 'sv08.5-133' || registration.variant !== 'holo') throw new Error('Reference printing does not match Atticus 133');
  for (const photo of registration.photos) {
    const option = document.createElement('option');
    option.value = photo.file;
    option.textContent = photo.source.includes('user-01') ? 'Your directional photograph' : `Photograph ${photo.source.replace('atticus-133-', '').split('.')[0].toUpperCase()}${photo.closeUp ? ' · close-up' : ''}`;
    reference.append(option);
  }
  reference.addEventListener('change', () => {
    const photo = registration.photos.find(photo => photo.file === reference.value);
    for (const image of document.querySelectorAll('.card img')) image.src = photo ? `${base}${photo.file}` : front;
    const [x0, y0, x1, y1] = photo?.printBounds ?? [0, 0, 600, 825];
    for (const overlay of document.querySelectorAll('.coverage, .trace-guide')) {
      overlay.style.clipPath = `inset(${y0/825*100}% ${(600-x1)/6}% ${(825-y1)/825*100}% ${x0/6}%)`;
    }
    note.textContent = photo
      ? `${photo.observed} ${photo.closeUp ? 'Blank areas were outside this close-up. ' : ''}Alignment median: ${photo.medianErrorPrintPixels.toFixed(2)} print pixels. Compare individual lines visually; alignment does not establish relief.`
      : 'Photographs are aligned for comparison only. None is a renderer texture.';
  });
} catch (error) {
  note.textContent = error.message;
}

const traceToggle = document.querySelector('#trace-toggle');
const traceNote = document.querySelector('#trace-note');
const guides = [...document.querySelectorAll('.trace-guide')];
try {
  const response = await fetch('./traces/133-holo-draft.json');
  if (!response.ok) throw new Error('Draft trace observations unavailable');
  const draft = await response.json();
  if (draft.cardId !== 'sv08.5-133' || draft.variant !== 'holo'
      || draft.status !== 'draft-observations' || draft.lineworkReviewed !== false) {
    throw new Error('Draft trace identity or review status does not match');
  }
  const region = draft.regions.find(region => region.id === (draft.focusRegion ?? 'extended-glove-palm'));
  if (!region?.lines.length) throw new Error('Glove observations unavailable');
  const lineCount = draft.regions.reduce((count, region) => count + region.lines.length, 0);
  traceNote.textContent = `${lineCount} draft segments in cyan across the glove palm and pointing finger; yellow dots mark their ends. Palm observations use your directional photo; finger observations use close-up J. Individual ridge correspondence between photos is still unverified. These lines are an inspection guide, not a relief map.`;
  traceToggle.disabled = false;
  traceToggle.addEventListener('click', () => {
    const visible = guides[0].hidden;
    guides.forEach(guide => { guide.hidden = !visible; });
    traceNote.hidden = !visible;
    traceToggle.setAttribute('aria-pressed', String(visible));
    traceToggle.textContent = visible ? 'Hide draft glove traces' : 'Show draft glove traces';
    if (visible) {
      showCoverage(false);
      const [x0, y0, x1, y1] = region.bounds;
      focusDetail((x0+x1)/2, (y0+y1)/2);
    }
  });
} catch (error) {
  traceNote.hidden = false;
  traceNote.textContent = error.message;
}
