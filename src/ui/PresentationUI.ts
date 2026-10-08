import type { CardDefinition } from '../card/CardDefinition';
import { canonicalProfileId } from '../materials/profiles/ProfileAliases.ts';
import { compareGallerySetNames, gallerySetName } from '../gallery/GalleryQuery';
import { lightPresets, type StudioLighting, type LightPreset } from '../lighting/StudioLighting';

interface ViewerActions {
  lighting: StudioLighting;
  flip: () => void;
  reset: () => void;
  light: (preset: LightPreset) => void;
  card: (id: string) => void;
  profile: (id: string) => void;
  importCard: () => void;
  removeCard: (id: string) => void;
  pack: () => void;
  gallery: () => void;
}
export interface ProfileOption { id: string; name: string; family: string; labOnly?: boolean; }
type CardFinish = 'all' | 'holo' | 'non-holo' | 'metal';
export const FIRST_PICKER_CARD_ID = 'ancient-mew';
const icon = (paths: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export function createUI(root: HTMLElement, cards: CardDefinition[], profiles: ProfileOption[], actions: ViewerActions, development = false) {
  root.innerHTML = `<a class="artifact-entry" href="${import.meta.env.BASE_URL}artifacts">Artifacts ↗</a><nav class="top-actions" aria-label="Viewer destinations"><button id="lab-open" class="lab-entry">Holo Lab</button><button id="gallery-open" class="gallery-entry">Gallery</button><button id="pack-open" class="pack-entry">${icon('<path d="M6 3h12v18H6zM6 6h12M6 18h12m-8-8 2-2 2 2-2 4z"/>')}<span>Open a pack</span></button></nav><nav class="controls" aria-label="Card controls">
    <button id="card-toggle" class="text-control" aria-expanded="false" aria-controls="card-panel">Card ${icon('<path d="m8 10 4 4 4-4"/>')}</button>
    <div class="select-wrap"><select id="holo-select" aria-label="Holographic treatment"></select>${icon('<path d="m8 10 4 4 4-4"/>')}</div>
    <div class="divider"></div>
    <button id="light-toggle" class="icon-control" aria-label="Studio lighting" aria-expanded="false" aria-controls="light-panel">${icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>')}</button>
    <button id="flip" class="icon-control" aria-label="Flip card">${icon('<path d="M15 5h3v14h-3M9 5H6v14h3M12 3v18"/>')}</button>
    <button id="reset" class="icon-control" aria-label="Reset view">${icon('<path d="M4 9a8 8 0 1 1 0 6M4 4v5h5"/>')}</button>
    <button id="fullscreen" class="icon-control" aria-label="Enter fullscreen">${icon('<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>')}</button>
  </nav>
  <section id="card-panel" class="popover card-panel" aria-label="Choose card" hidden><div class="card-panel-actions"><button id="import-card">Import card</button></div><div class="card-finish-tabs" role="group" aria-label="Card finish"></div><div class="filters" role="group" aria-label="Card category"></div><div class="card-search"><input id="card-search" type="search" aria-label="Search cards" placeholder="Search cards" autocomplete="off" spellcheck="false"></div><div class="card-grid"></div><p class="card-empty" role="status" hidden>No cards match these filters.</p></section>
  <section id="light-panel" class="popover light-panel" aria-label="Choose lighting" hidden></section>`;
  const select = root.querySelector<HTMLSelectElement>('#holo-select')!;
  const randomButton = document.createElement('button');
  randomButton.id = 'random-card';
  randomButton.className = 'random-entry';
  randomButton.type = 'button';
  randomButton.textContent = 'Random card';
  const labButton = root.querySelector<HTMLButtonElement>('#lab-open')!;
  labButton.after(randomButton);
  randomButton.onclick = () => {
    const candidates = cards.filter(card => !card.pickerHidden && card.id !== selectedCard);
    if (!candidates.length) return;
    close();
    actions.card(candidates[Math.floor(Math.random() * candidates.length)].id);
  };
  labButton.onclick = () => { window.location.href = '?lab=1'; };
  root.querySelector<HTMLButtonElement>('#gallery-open')!.onclick = actions.gallery;
  root.querySelector<HTMLButtonElement>('#pack-open')!.onclick = actions.pack;
  let selectedCard = cards[0].id;
  let selectedProfile = cards[0].profile;
  const selectProfile = (id: string) => {
    id = canonicalProfileId(id);
    selectedProfile = id;
    // Debug scripts can apply a non-presentation treatment without mislabeling it
    // or adding it to the list of selectable treatments.
    if (![...select.options].some(option => option.value === id)) {
      const profile = profiles.find(p => p.id === id);
      if (profile) { const option = new Option(profile.name, id); option.hidden = true; option.disabled = true; select.append(option); }
    }
    select.value = id;
  };
  const drawProfiles = () => {
    const card = cards.find(c => c.id === selectedCard) ?? cards[0];
    // Keep the established library available across cards. Printing defaults are
    // recommendations, not restrictions on the user's material experiments.
    const available = card.construction?.kind === 'metal' && !development
      ? profiles.filter(p => p.id === card.profile)
      : card.profile === 'print-only'
      ? profiles.filter(p => p.id === 'print-only')
      : (development ? profiles : profiles.filter(p => p.id === card.profile || !p.labOnly));
    select.replaceChildren();
    for (const family of [...new Set(available.map(p => p.family))]) {
      const group = document.createElement('optgroup'); group.label = family;
      available.filter(p => p.family === family).forEach(profile => group.append(new Option(profile.name, profile.id)));
      select.append(group);
    }
    selectProfile(selectedProfile);
  };
  drawProfiles();
  select.onchange = () => actions.profile(select.value);
  root.querySelector<HTMLButtonElement>('#flip')!.onclick = actions.flip;
  root.querySelector<HTMLButtonElement>('#reset')!.onclick = actions.reset;
  root.querySelector<HTMLButtonElement>('#fullscreen')!.onclick = () => {
    if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen();
  };
  const panels = ['card', 'light'] as const;
  let pickerDirty = true;
  const ensurePicker = () => { if (pickerDirty) drawCards(); };
  const close = () => { panels.forEach(name => {
    root.querySelector<HTMLElement>(`#${name}-panel`)!.hidden = true;
    root.querySelector(`#${name}-toggle`)!.setAttribute('aria-expanded', 'false');
  }); root.classList.remove('open'); };
  panels.forEach(name => {
    root.querySelector<HTMLButtonElement>(`#${name}-toggle`)!.onclick = () => {
      const panel = root.querySelector<HTMLElement>(`#${name}-panel`)!;
      const wasHidden = panel.hidden === true; close(); panel.hidden = !wasHidden;
      root.querySelector(`#${name}-toggle`)!.setAttribute('aria-expanded', String(wasHidden));
      root.classList.toggle('open', wasHidden);
      if (name === 'card' && wasHidden) {
        ensurePicker(); root.querySelector<HTMLInputElement>('#card-search')!.focus();
      }
    };
  });
  let selectedFinish: CardFinish = 'all';
  let selectedCategory = 'All';
  root.querySelector<HTMLButtonElement>('#import-card')!.onclick = () => { close(); actions.importCard(); };
  const finishTabs = root.querySelector<HTMLElement>('.card-finish-tabs')!;
  const searchField = root.querySelector<HTMLInputElement>('#card-search')!;
  let searchQuery = '';
  const cardsForFinish = () => cards.filter(card => !card.pickerHidden && (selectedFinish === 'all'
    || (selectedFinish === 'metal' ? card.construction?.kind === 'metal'
      : !card.construction && (selectedFinish === 'holo' ? card.profile !== 'print-only' : card.profile === 'print-only'))));
  const availableCategories = () => ['All', ...new Set(cardsForFinish().map(card => card.franchise))];
  const grid = root.querySelector<HTMLElement>('.card-grid')!;
  const empty = root.querySelector<HTMLElement>('.card-empty')!;
  const matchesSearch = (card: CardDefinition) => !searchQuery || [card.title, card.set, card.number, card.franchise].some(value => value.toLocaleLowerCase().includes(searchQuery));
  const baseSetHoloIds = cards
    .filter(card => card.set === 'Base Set' && card.profile === 'pokemon-base-set-star')
    .map(card => card.id);
  const jungleHoloIds = cards
    .filter(card => card.set === 'Jungle' && card.pokemon?.variant === 'holo')
    .map(card => card.id);
  const fossilHoloIds = cards
    .filter(card => card.set === 'Fossil' && card.pokemon?.variant === 'holo')
    .map(card => card.id);
  const baseSet2HoloIds = cards
    .filter(card => card.set === 'Base Set 2' && card.pokemon?.variant === 'holo')
    .map(card => card.id);
  const pickerPriority = [
    FIRST_PICKER_CARD_ID,
    'pokemon:sv08.5-161:holo',
    'pokemon:sv08.5-146:holo',
    'pokemon:sv08.5-167:holo',
    'pokemon:sv08.5-150:holo',
    'pokemon:sv08.5-153:holo',
    'pokemon:sv08.5-156:holo',
    'pokemon:sv08.5-155:holo',
    'pokemon:sv08.5-144:holo',
    'pikachu-vmax-vivid-voltage', 'pokemon:sv08.5-133:holo', 'nocturne', 'signal-arbor', 'recursive-gate',
    ...baseSetHoloIds,
    ...jungleHoloIds,
    ...fossilHoloIds,
    ...baseSet2HoloIds,
    'lugia-neo-genesis',
  ];
  const drawCards = () => {
    pickerDirty = false;
    grid.replaceChildren();
    const visibleCards = cardsForFinish().filter(card => (selectedCategory === 'All' || card.franchise === selectedCategory) && matchesSearch(card));
    visibleCards.sort((a, b) => {
      if (a.id === pickerPriority[0] || b.id === pickerPriority[0]) return Number(b.id === pickerPriority[0]) - Number(a.id === pickerPriority[0]);
      if (a.imported !== b.imported) return Number(b.imported) - Number(a.imported);
      const priorityA = pickerPriority.indexOf(a.id);
      const priorityB = pickerPriority.indexOf(b.id);
      if (priorityA !== priorityB) return (priorityA < 0 ? pickerPriority.length : priorityA) - (priorityB < 0 ? pickerPriority.length : priorityB);
      const setOrder = a.franchise === 'Pokémon' && b.franchise === 'Pokémon'
        ? compareGallerySetNames(gallerySetName(a), gallerySetName(b)) : 0;
      return setOrder || Number(a.profile === 'print-only') - Number(b.profile === 'print-only');
    });
    empty.hidden = visibleCards.length > 0;
    visibleCards.forEach(card => {
      const button = document.createElement('button'); button.className = 'card-option';
      button.dataset.cardId = card.id;
      button.setAttribute('aria-pressed', String(card.id === selectedCard));
      const image = document.createElement('img');

image.src =
  card.front.startsWith('blob:') ||
  card.front.startsWith('data:') ||
  card.front.startsWith('http://') ||
  card.front.startsWith('https://')
    ? card.front
    : `${import.meta.env.BASE_URL}${card.front.replace(/^\/+/, '')}`;

image.alt = '';
image.loading = 'lazy';
      if (card.frontFallback) image.onerror = () => {
        image.onerror = null;
        image.src = `${import.meta.env.BASE_URL}${card.frontFallback!.replace(/^\/+/, '')}`;
      };
      const name = document.createElement('span'); name.textContent = card.title;
      button.title = `${card.title} · ${card.set} · ${card.number}`;
      button.append(image, name); button.onclick = () => { actions.card(card.id); close(); };
      const item = document.createElement('div'); item.className = 'card-item'; item.append(button);
      if (card.imported) {
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'remove-import';
        remove.setAttribute('aria-label', `Remove ${card.title}`); remove.title = 'Remove from this session';
        remove.innerHTML = icon('<path d="M7 7l10 10M17 7L7 17"/>');
        remove.onclick = event => { event.stopPropagation(); actions.removeCard(card.id); };
        item.append(remove);
      }
      grid.append(item);
    });
  };
  searchField.oninput = () => { searchQuery = searchField.value.trim().toLocaleLowerCase(); drawCards(); };
  const filters = root.querySelector('.filters')!;
  const drawFinishTabs = () => {
    finishTabs.replaceChildren();
    const finishOptions: Array<[CardFinish, string]> = [['all', 'All'], ['holo', 'Holo'], ['non-holo', 'Non-holo'], ['metal', 'Metal']];
    finishOptions.forEach(([finish, label]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.setAttribute('aria-pressed', String(finish === selectedFinish));
      button.onclick = () => {
        selectedFinish = finish;
        if (!availableCategories().includes(selectedCategory)) selectedCategory = 'All';
        drawFinishTabs(); drawFilters(); drawCards();
      };
      finishTabs.append(button);
    });
  };
  const drawFilters = () => {
    const categories = availableCategories();
    if (!categories.includes(selectedCategory)) selectedCategory = 'All';
    filters.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = category; button.className = category === selectedCategory ? 'selected' : '';
      button.onclick = () => { selectedCategory = category; drawFilters(); drawCards(); };
      filters.append(button);
    });
  };
  const refreshCards = () => {
    pickerDirty = true;
    drawFinishTabs(); drawFilters();
    if (!root.querySelector<HTMLElement>('#card-panel')!.hidden) ensurePicker();
    drawProfiles();
  };
  refreshCards();
  const lightPanel = root.querySelector('#light-panel')!;
  const modes = document.createElement('div'); modes.className = 'light-modes'; lightPanel.append(modes);
  const note = document.createElement('p'); note.className = 'light-note';
  const settings = document.createElement('div'); settings.className = 'light-settings';
  const descriptions: Partial<Record<LightPreset, string>> = {
    Blacklight: 'Violet-light simulation; UV fluorescence is not measured.',
    'Holo skim': 'Sweep the foil response while keeping printed artwork lighting steady.',
    Polarizer: 'Approximate CPL rotation: reduce reflected glare on holographic fronts.',
    Skim: 'A low, narrow source reveals surface relief.',
    Spotlight: 'Move the cursor to position a fixed circular beam.',
  };
  const rows: { element: HTMLElement; modes?: LightPreset[] }[] = [];
  const slider = (label: string, key: 'azimuth' | 'elevation' | 'intensity' | 'speed' | 'filterAngle', min: number, max: number, step: number, unit: string, only?: LightPreset[]) => {
    const row = document.createElement('label'); row.className = 'light-setting';
    const caption = document.createElement('span'); caption.textContent = label;
    const value = document.createElement('output');
    const input = document.createElement('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(actions.lighting[key]);
    input.setAttribute('aria-label', label);
    const sync = () => { value.value = `${Number(input.value).toFixed(step < 1 ? 1 : 0)}${unit}`; };
    input.oninput = () => { actions.lighting[key] = Number(input.value); sync(); }; sync();
    row.append(caption, value, input); settings.append(row); rows.push({ element: row, modes: only });
    return input;
  };
  const directional: LightPreset[] = ['Moving light', 'Skim'];
  const azimuth = slider('Light position', 'azimuth', -85, 85, 1, '°', directional);
  const elevation = slider('Light elevation', 'elevation', -30, 75, 1, '°', directional);
  slider('Intensity', 'intensity', 0, 2, .1, '×');
  slider('Sweep speed', 'speed', .1, 2, .1, '×', ['Moving light', 'Skim', 'Holo skim']);
  slider('Filter rotation', 'filterAngle', 0, 180, 1, '°', ['Polarizer']);
  const pause = document.createElement('button'); pause.className = 'light-pause';
  const syncPause = () => { pause.textContent = actions.lighting.playing ? 'Pause sweep' : 'Play sweep'; pause.setAttribute('aria-pressed', String(actions.lighting.playing)); };
  pause.onclick = () => { actions.lighting.playing = !actions.lighting.playing; syncPause(); }; syncPause();
  settings.append(pause); rows.push({ element: pause, modes: ['Moving light', 'Skim', 'Holo skim'] });
  const refresh = (preset: LightPreset) => {
    note.textContent = descriptions[preset] ?? 'Adjust the light without moving the card.';
    rows.forEach(row => { row.element.hidden = !!row.modes && !row.modes.includes(preset); });
    azimuth.value = String(actions.lighting.azimuth); elevation.value = String(actions.lighting.elevation);
    [azimuth, elevation].forEach(input => { input.previousElementSibling!.textContent = `${input.value}°`; });
  };
  lightPresets.forEach((preset, i) => {
    const button = document.createElement('button'); button.textContent = preset; button.className = i === 0 ? 'selected' : '';
    button.setAttribute('aria-pressed', String(i === 0));
    button.onclick = () => { actions.light(preset); modes.querySelectorAll('button').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); refresh(preset); };
    modes.append(button);
  });
  lightPanel.append(note, settings); refresh('Studio');
  const outside = (e: PointerEvent) => { if (!root.contains(e.target as HTMLElement)) close(); };
  const keyboard = (e: KeyboardEvent) => {
    if (root.inert) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { close(); return; }
    if ((e.target as HTMLElement).matches('input,select,textarea,[contenteditable="true"]')) return;
    if (e.key.toLowerCase() === 'f' && !e.repeat) actions.flip();
    if (e.key.toLowerCase() === 'r' && !e.repeat) actions.reset();
  };
  document.addEventListener('pointerdown', outside); document.addEventListener('keydown', keyboard);
  let hideTimer = 0;
  const wake = () => { root.classList.remove('idle'); clearTimeout(hideTimer); hideTimer = window.setTimeout(() => root.classList.add('idle'), 4500); };
  document.addEventListener('pointermove', wake); document.addEventListener('keydown', wake); document.addEventListener('pointerdown', wake); wake();
  return { selectProfile, refreshCards, selectCard: (id: string) => {
    selectedCard = id;
    grid.querySelectorAll<HTMLButtonElement>('.card-option').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.cardId === id));
    });
    drawProfiles();
  }, close, dispose: () => {
    close(); clearTimeout(hideTimer);
    document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard);
    document.removeEventListener('pointermove', wake); document.removeEventListener('keydown', wake); document.removeEventListener('pointerdown', wake);
  } };
}
