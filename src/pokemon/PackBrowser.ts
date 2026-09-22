import './browser.css';
import type { CardDefinition } from '../card/CardDefinition';
import type { PackDefinition } from '../pack/PackDefinition';
import { packRegistry } from '../pack/PackDefinition';
import type { PreparedPack } from '../pack/PreparedPack';
import { pokemonCatalog } from './TcgdexAdapter';
import { collatePokemon } from './collator';
import { recipeFor } from './recipes';
import { boundedMap, SelectionTask } from './requests';
import type { CatalogEntry, PokemonBooster, PokemonCard, PokemonSet } from './types';
import { pokemonDefinition } from './materials';
import { fallbackWrapper, prepareWrapper, usableCardFront } from './assets';

export interface PackBrowserDependencies {
  definitions: readonly CardDefinition[];
  prepare: (definition: PackDefinition, seed: number, cards: readonly CardDefinition[], signal: AbortSignal, progress: (done: number, total: number) => void) => Promise<PreparedPack>;
  open: (pack: PreparedPack) => Promise<void>;
  close: () => void;
}
export class PackBrowser {
  readonly root = document.createElement('dialog');
  readonly selection: { series?: CatalogEntry; set?: PokemonSet; booster?: PokemonBooster } = {};
  private task = new SelectionTask();
  private body = document.createElement('div');
  private status = document.createElement('p');
  private heading = document.createElement('h2');
  private back = document.createElement('button');
  private prepared?: PreparedPack;
  private metadata?: PokemonCard[];
  private retry?: () => void;
  private step: 'type' | 'archive' | 'series' | 'sets' | 'boosters' = 'type';
  private disposed = false;
  constructor(private deps: PackBrowserDependencies) {
    this.root.className = 'pokemon-browser'; this.root.setAttribute('aria-label', 'Choose a pack');
    const header = document.createElement('header'), close = document.createElement('button');
    close.textContent = 'Close'; close.onclick = () => this.dispose();
    this.back.textContent = '← Back'; this.back.onclick = () => this.goBack();
    header.append(this.back, this.heading, close); this.body.className = 'pokemon-browser-grid';
    this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    this.root.append(header, this.status, this.body);
    this.root.addEventListener('cancel', e => { e.preventDefault(); this.dispose(); });
    document.body.append(this.root); this.root.showModal(); this.types();
  }
  private screen(title: string, status = '') {
    this.task.cancel(); this.prepared = undefined; this.retry = undefined; this.root.setAttribute('aria-busy', 'false');
    this.heading.textContent = title; this.status.textContent = status; this.body.replaceChildren();
    this.back.hidden = this.step === 'type';
  }
  private button(label: string, action: () => void, artwork?: string, description?: string) {
    const button = document.createElement('button'); button.className = 'pokemon-pack-tile';
    if (artwork) {
      const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = artwork;
      img.onerror = () => { img.onerror = null; img.src = fallbackWrapper({ name: label }); };
      button.append(img);
    }
    const text = document.createElement('strong'); text.textContent = label; button.append(text);
    if (description) { const detail = document.createElement('small'); detail.textContent = description; button.append(detail); }
    button.onclick = action; this.body.append(button); return button;
  }
  private async run(label: string, work: (request: AbortController) => Promise<void>, retry: () => void) {
    const request = this.task.begin(); this.status.textContent = label; this.root.setAttribute('aria-busy', 'true'); this.retry = retry;
    try { await work(request); }
    catch (error) {
      if (!this.task.current(request) || this.disposed) return;
      this.status.textContent = error instanceof Error ? error.message : 'Unable to load this pack.';
      this.body.querySelector('.pokemon-retry')?.remove();
      const button = this.button('Retry', retry); button.classList.add('pokemon-retry');
    } finally { if (this.task.current(request)) this.root.setAttribute('aria-busy', 'false'); }
  }
  private types() {
    this.step = 'type'; this.selection.series = undefined; this.selection.set = undefined; this.selection.booster = undefined;
    this.screen('Open Pack', 'Choose your collection.');
    this.button('Archive', () => this.archive(), `${import.meta.env.BASE_URL}packs/archive/front.svg`, 'Holo’s studio selection');
    this.button('Pokémon', () => this.series(), fallbackWrapper({ name: 'Pokémon' }), 'Browse series, sets and boosters');
  }
  private archive() {
    this.step = 'archive'; this.screen('Archive', 'Choose a studio pack.');
    for (const pack of packRegistry.filter(p => p.id !== 'test-pack')) this.button(pack.name, () => {
      this.screen(pack.name);
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      void this.run('Preparing exact pack…', async request => {
        const prepared = await this.deps.prepare(pack, seed, this.deps.definitions, request.signal, (done, total) => {
          if (this.task.current(request)) this.status.textContent = `Preparing cards · ${done} / ${total}`;
        });
        if (this.task.current(request)) this.ready(prepared);
      }, () => this.archive());
    }, `${import.meta.env.BASE_URL}${pack.wrapper.front.replace(/^\//, '')}`, `${pack.cardCount} cards`);
  }
  private series() {
    this.step = 'series'; this.selection.series = undefined; this.selection.set = undefined; this.selection.booster = undefined;
    this.screen('Pokémon series');
    void this.run('Loading series…', async request => {
      const series = await pokemonCatalog.series(request.signal); if (!this.task.current(request)) return;
      this.status.textContent = 'Choose a series. Supported sets are marked Opening available.';
      series.sort((a, b) => Number(b.id === 'sv') - Number(a.id === 'sv')).forEach(s => this.button(s.name, () => { this.selection.series = s; this.sets(); }, s.logo));
    }, () => this.series());
  }
  private sets() {
    const series = this.selection.series; if (!series) return this.series();
    this.step = 'sets'; this.selection.set = undefined; this.selection.booster = undefined; this.metadata = undefined;
    this.screen(series.name);
    void this.run('Loading sets…', async request => {
      const sets = await pokemonCatalog.sets(series.id, request.signal); if (!this.task.current(request)) return;
      this.status.textContent = 'Choose a set.';
      sets.sort((a, b) => Number(!!recipeFor(b.id)) - Number(!!recipeFor(a.id))).forEach(set => this.button(set.name, () => this.boosters(set.id), set.logo,
        recipeFor(set.id) ? 'Opening available' : 'Browse only · recipe not validated'));
    }, () => this.sets());
  }
  private boosters(id: string) {
    this.step = 'boosters'; this.selection.set = undefined; this.selection.booster = undefined; this.metadata = undefined;
    this.screen('Booster selection');
    void this.run('Loading set metadata…', async request => {
      const set = await pokemonCatalog.set(id, request.signal); if (!this.task.current(request)) return;
      this.selection.set = set; this.heading.textContent = set.name;
      this.showBoosters();
    }, () => this.boosters(id));
  }
  private showBoosters() {
    const set = this.selection.set!; this.body.replaceChildren();
    const recipe = recipeFor(set.id);
    this.status.textContent = recipe ? `Choose a booster. ${recipe.note}` : 'Opening unavailable: this set has no validated pack recipe.';
    set.boosters.forEach(booster => {
      const button = this.button(booster.name, () => this.choose(booster), booster.front ?? fallbackWrapper(set), booster.front ? undefined : 'Set artwork fallback');
      button.classList.add('pokemon-booster'); button.disabled = !recipe;
      button.setAttribute('aria-pressed', String(this.selection.booster?.id === booster.id));
    });
  }
  private choose(booster: PokemonBooster, retainedSeed?: number) {
    const set = this.selection.set!; this.selection.booster = booster; this.prepared = undefined; this.showBoosters();
    const seed = retainedSeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    void this.run('Loading card metadata…', async request => {
      const metadata = this.metadata ?? await pokemonCatalog.cards(set, request.signal, (done, total) => {
        if (this.task.current(request)) this.status.textContent = `Loading card metadata · ${done} / ${total}`;
      });
      if (!this.task.current(request)) return; this.metadata = metadata;
      const resolved = collatePokemon(set.id, booster.id, seed, metadata);
      this.status.textContent = 'Preparing booster artwork…';
      const wrapper = await prepareWrapper(set, booster, request.signal);
      if (!this.task.current(request)) return;
      const definitions = resolved.pulls.map(p => pokemonDefinition(p.card, p.variant, this.deps.definitions));
      this.status.textContent = 'Checking exact card images…';
      await boundedMap(definitions, 3, request.signal, async definition => {
        if (definition.front.startsWith('https://assets.tcgdex.net/')) definition.front = await usableCardFront(definition.front, request.signal, definition.pokemon?.thumbnail);
      });
      if (!this.task.current(request)) return;
      const pack: PackDefinition = { id: `pokemon:${set.id}:${booster.id}`, name: `${set.name} · ${booster.name}`, category: 'Pokémon',
        seed, cardCount: resolved.pulls.length, order: 'fixed', wrapper, pokemon: resolved,
        contents: resolved.pulls.map((p, i) => ({ cardId: definitions[i].id, rarity: p.variant === 'normal' ? 'standard' : 'foil' })) };
      Object.freeze(pack.contents); Object.freeze(pack.wrapper); Object.freeze(pack);
      const prepared = await this.deps.prepare(pack, seed, definitions, request.signal, (done, total) => {
        if (this.task.current(request)) this.status.textContent = `Preparing exact cards · ${done} / ${total}`;
      });
      if (this.task.current(request)) this.ready(prepared);
    }, () => this.choose(booster, seed));
  }
  private ready(prepared: PreparedPack) {
    this.prepared = prepared; this.status.textContent = `${prepared.contents.length} cards prepared. Your pack is ready.`;
    const open = this.button('Open Pack', () => {
      if (this.prepared !== prepared) return;
      open.disabled = true; this.root.close();
      void this.deps.open(prepared).then(() => this.dispose(), error => {
        if (this.disposed) return; this.root.showModal(); open.disabled = false;
        this.status.textContent = `Unable to open: ${error instanceof Error ? error.message : 'Please retry.'}`;
        open.textContent = 'Retry Open Pack';
      });
    });
    open.classList.add('pokemon-open'); open.focus();
  }
  private goBack() {
    switch (this.step) {
      case 'boosters': this.sets(); break;
      case 'sets': this.series(); break;
      case 'series': case 'archive': this.types(); break;
      default: this.dispose();
    }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.task.cancel(); this.prepared = undefined; this.root.close(); this.root.remove(); this.deps.close(); }
}
