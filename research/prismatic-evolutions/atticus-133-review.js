const toggle = document.querySelector('#toggle');
const coverages = [...document.querySelectorAll('.coverage')];
toggle.addEventListener('click', () => {
  const hidden = !coverages[0].hidden;
  coverages.forEach(coverage => { coverage.hidden = hidden; });
  toggle.setAttribute('aria-pressed', String(!hidden));
  toggle.textContent = hidden ? 'Show foil coverage' : 'Hide foil coverage';
});

const card = document.querySelector('#main-card');
const detail = document.querySelector('#detail-card');
const position = document.querySelector('#detail-position');
card.addEventListener('pointermove', event => {
  const bounds = card.getBoundingClientRect();
  const x = Math.max(45, Math.min(555, (event.clientX-bounds.left)/bounds.width*600));
  const y = Math.max(47.5, Math.min(777.5, (event.clientY-bounds.top)/bounds.height*825));
  detail.style.left = `${135-x*3}px`;
  detail.style.top = `${142.5-y*3}px`;
  position.textContent = `Print coordinates: ${Math.round(x)}, ${Math.round(y)}`;
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
    option.textContent = photo.source.includes('user-01') ? 'Your directional photograph' : `Photograph ${photo.source.replace('atticus-133-', '').split('.')[0].toUpperCase()}`;
    reference.append(option);
  }
  reference.addEventListener('change', () => {
    const photo = registration.photos.find(photo => photo.file === reference.value);
    for (const image of document.querySelectorAll('.card img')) image.src = photo ? `${base}${photo.file}` : front;
    note.textContent = photo
      ? `${photo.observed} Alignment median: ${photo.medianErrorPrintPixels.toFixed(2)} print pixels. Compare individual lines visually; alignment does not establish relief.`
      : 'Photographs are aligned for comparison only. None is a renderer texture.';
  });
} catch (error) {
  note.textContent = error.message;
}
