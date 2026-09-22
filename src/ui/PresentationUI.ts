import type { CardDefinition } from '../card/CardDefinition';
import type { LightPreset } from '../lighting/StudioLighting';

interface ViewerActions {
  flip: () => void;
  reset: () => void;
  light: (preset: LightPreset) => void;
  card: (id: string) => void;
  profile: (id: string) => void;
  importCard: () => void;
  removeCard: (id: string) => void;
  pack: () => void;
}
export interface ProfileOption { id: string; name: string; family: string; labOnly?: boolean; }
type CardFinish = 'all' | 'holo' | 'non-holo' | 'metal';
const icon = (paths: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export function createUI(root: HTMLElement, cards: CardDefinition[], profiles: ProfileOption[], actions: ViewerActions, development = false) {
  root.innerHTML = `<a class="lab-entry" href="?lab=1">Holo Lab ↗</a><button id="pack-open" class="pack-entry">${icon('<path d="M6 3h12v18H6zM6 6h12M6 18h12m-8-8 2-2 2 2-2 4z"/>')}<span>Open a pack</span></button><nav class="controls" aria-label="Card controls">
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
  root.querySelector<HTMLButtonElement>('#pack-open')!.onclick = actions.pack;
  let selectedCard = cards[0].id;
  let selectedProfile = cards[0].profile;
  const selectProfile = (id: string) => {
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
    };
  });
  let selectedFinish: CardFinish = 'all';
  let selectedCategory = 'All';
  root.querySelector<HTMLButtonElement>('#import-card')!.onclick = () => { close(); actions.importCard(); };
  const finishTabs = root.querySelector<HTMLElement>('.card-finish-tabs')!;
  const searchField = root.querySelector<HTMLInputElement>('#card-search')!;
  let searchQuery = '';
  const cardsForFinish = () => cards.filter(card => selectedFinish === 'all'
    || (selectedFinish === 'metal' ? card.construction?.kind === 'metal'
      : !card.construction && (selectedFinish === 'holo' ? card.profile !== 'print-only' : card.profile === 'print-only')));
  const availableCategories = () => ['All', ...new Set(cardsForFinish().map(card => card.franchise))];
  const grid = root.querySelector<HTMLElement>('.card-grid')!;
  const empty = root.querySelector<HTMLElement>('.card-empty')!;
  const matchesSearch = (card: CardDefinition) => !searchQuery || [card.title, card.set, card.number, card.franchise].some(value => value.toLocaleLowerCase().includes(searchQuery));
  const pickerPriority = ['pikachu-vmax-vivid-voltage', 'nocturne', 'lugia-neo-genesis'];
  const drawCards = () => {
    grid.replaceChildren();
    const visibleCards = cardsForFinish().filter(card => (selectedCategory === 'All' || card.franchise === selectedCategory) && matchesSearch(card));
    visibleCards.sort((a, b) => {
      if (a.imported !== b.imported) return Number(b.imported) - Number(a.imported);
      const priorityA = pickerPriority.indexOf(a.id);
      const priorityB = pickerPriority.indexOf(b.id);
      if (priorityA !== priorityB) return (priorityA < 0 ? pickerPriority.length : priorityA) - (priorityB < 0 ? pickerPriority.length : priorityB);
      return Number(a.profile === 'print-only') - Number(b.profile === 'print-only');
    });
    empty.hidden = visibleCards.length > 0;
    visibleCards.forEach(card => {
      const button = document.createElement('button'); button.className = 'card-option';
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
    drawFinishTabs(); drawFilters(); drawCards(); drawProfiles();
  };
  refreshCards();
  const lightPanel = root.querySelector('#light-panel')!;
  (['Studio', 'Strip', 'Soft', 'Low key'] as LightPreset[]).forEach((preset, i) => {
    const button = document.createElement('button'); button.textContent = preset; button.className = i === 0 ? 'selected' : '';
    button.onclick = () => { actions.light(preset); lightPanel.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button)); close(); };
    lightPanel.append(button);
  });
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
  return { selectProfile, refreshCards, selectCard: (id: string) => { selectedCard = id; drawCards(); drawProfiles(); }, close, dispose: () => {
    close(); clearTimeout(hideTimer);
    document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard);
    document.removeEventListener('pointermove', wake); document.removeEventListener('keydown', wake); document.removeEventListener('pointerdown', wake);
  } };
}
