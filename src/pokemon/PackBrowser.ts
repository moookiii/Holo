import './browser.css';
import type { CardDefinition } from '../card/CardDefinition';
import type { PackDefinition } from '../pack/PackDefinition';
import { packRegistry } from '../pack/PackDefinition';
import type { PreparedPack } from '../pack/PreparedPack';
import { pokemonCatalog } from './TcgdexAdapter';
import { collatePokemon } from './collator';
import { recipeFor } from './recipes';
import { packAvailability } from './availability';
import { boundedMap, SelectionTask } from './requests';
import type { CatalogEntry, PokemonBooster, PokemonCard, PokemonSet } from './types';
import { pokemonDefinition } from './materials';
import { fallbackWrapper, prepareWrapper, usableCardFront } from './assets';
import { WIZARDS_PROMO_ID } from './WizardsPromoCatalog';
import { YugiohCatalogProvider } from '../yugioh/catalog/provider';
import type { YugiohCatalogSet } from '../yugioh/types';
import { implementationFor } from '../yugioh/catalog/implementations';

export interface PackBrowserDependencies {
  definitions: readonly CardDefinition[];
  prepare: (definition: PackDefinition, seed: number, cards: readonly CardDefinition[], signal: AbortSignal, progress: (done: number, total: number) => void) => Promise<PreparedPack>;
  open: (pack: PreparedPack) => Promise<void>;
  viewCard: (id: string) => Promise<void>;
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
  private step: 'type' | 'archive' | 'series' | 'sets' | 'boosters' | 'cards' | 'yugioh' | 'yugioh-sets' | 'yugioh-detail' = 'type';
  private yugiohProvider?: YugiohCatalogProvider;
  private yugiohSets: YugiohCatalogSet[] = [];
  private yugiohEra?: string;
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
    const pokemon = this.button('Pokémon', () => this.series(), undefined, 'Browse series, sets and boosters');
    this.button('Yu-Gi-Oh!', () => this.yugioh(), this.yugiohArtwork(), 'Browse series, sets and boosters');
    const request = this.task.begin();
    void pokemonCatalog.series(request.signal).then(series => {
      if (!this.task.current(request) || this.step !== 'type') return;
      const logo = series.find(entry => entry.id === 'base')?.logo;
      if (logo) {
        const image = new Image();
        image.alt = '';
        image.onload = () => {
          if (this.task.current(request) && this.step === 'type') pokemon.prepend(image);
        };
        image.src = logo;
      }
    }).catch(() => {});
  }
  private yugiohArtwork() { return `${import.meta.env.BASE_URL}packs/yugioh/lob-first-edition/front.png`; }
  private yugioh() {
    this.step = 'yugioh'; this.screen('Yu-Gi-Oh! series');
    if (!this.yugiohProvider) {
      let storage: Storage | undefined; try { storage = localStorage; } catch { /* private mode */ }
      this.yugiohProvider = new YugiohCatalogProvider(fetch, storage, `${import.meta.env.BASE_URL}catalog/yugioh/sets.json`);
    }
    void this.run('Loading series…', async request => {
      const result = await this.yugiohProvider!.sets(request.signal);
      if (!this.task.current(request)) return;
      this.yugiohSets = result.sets.filter(set => implementationFor(set.id)?.status === 'implemented');
      this.status.textContent = this.yugiohSets.length ? 'Choose a series. Supported sets are marked Opening available.' : 'No boosters are currently available.';
      for (const era of [...new Set(this.yugiohSets.map(set => set.era))].sort()) {
        this.button(era, () => { this.yugiohEra = era; this.yugiohSetSelection(); }, this.yugiohArtwork());
      }
    }, () => this.yugioh());
  }
  private yugiohSetSelection() {
    this.step = 'yugioh-sets'; this.screen(this.yugiohEra ?? 'Yu-Gi-Oh! sets', 'Choose a set.');
    for (const set of this.yugiohSets.filter(set => set.era === this.yugiohEra)) {
      this.button(set.name, () => this.yugiohDetail(set), this.yugiohArtwork(), 'Opening available');
    }
  }
  private yugiohDetail(set: YugiohCatalogSet) {
    const implementation = implementationFor(set.id);
    if (implementation?.status !== 'implemented') return;
    this.step = 'yugioh-detail'; this.screen(set.name,
      'Choose a booster. North American English · 2002 · 9 cards. Modeled pull rates; 12 card fronts use documented image fallbacks.');
    const button = this.button('1st Edition', () => { button.setAttribute('aria-pressed', 'true'); this.chooseYugioh(set, implementation.id); },
      this.yugiohArtwork());
    button.classList.add('pokemon-booster');
    button.setAttribute('aria-pressed', 'false');
  }
  private chooseYugioh(set: YugiohCatalogSet, productId: string, retainedSeed?: number) {
    const seed = retainedSeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    void this.run('Loading card metadata…', async request => {
      const { resolveYugiohProduct } = await import('../yugioh/products');
      if (!this.task.current(request)) return;
      const { pack, definitions } = resolveYugiohProduct(set.id, productId, seed);
      const prepared = await this.deps.prepare(pack, seed, definitions, request.signal, (done,total) => {
        if(this.task.current(request))this.status.textContent=`Preparing exact cards · ${done} / ${total}`;
      });
      if(this.task.current(request))this.ready(prepared);
    }, () => this.chooseYugioh(set, productId, seed));
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
      // TCGdex lists eras oldest first, but its undated miscellaneous group is first.
      // Keep the source chronology and place that group after the dated series.
      series.sort((a, b) => Number(a.id === 'misc') - Number(b.id === 'misc')).forEach(s => this.button(s.name, () => { this.selection.series = s; this.sets(); }, s.logo));
    }, () => this.series());
  }
  private sets() {
    const series = this.selection.series; if (!series) return this.series();
    this.step = 'sets'; this.selection.set = undefined; this.selection.booster = undefined; this.metadata = undefined;
    this.screen(series.name);
    void this.run('Loading sets…', async request => {
      const sets = await pokemonCatalog.sets(series.id, request.signal); if (!this.task.current(request)) return;
      this.status.textContent = 'Choose a set.';
      sets.sort((a, b) => Number(packAvailability(b.id).ready) - Number(packAvailability(a.id).ready)).forEach(set => this.button(set.name, () => set.id === WIZARDS_PROMO_ID ? this.promoCards() : this.boosters(set.id), set.id === 'lc' ? `${set.logo}?v=high-res` : set.logo,
        packAvailability(set.id).label));
    }, () => this.sets());
  }
  private promoCards() {
    this.step = 'cards'; this.selection.booster = undefined;
    this.screen('Wizards Black Star Promos', 'Choose an individual promo card. No booster pack is opened.');
    void this.run('Loading promo cards…', async request => {
      const set = await pokemonCatalog.set(WIZARDS_PROMO_ID, request.signal);
      const cards = await pokemonCatalog.cards(set, request.signal);
      if (!this.task.current(request)) return;
      this.selection.set = set;
      this.status.textContent = `${cards.length} promo cards · choose a card to view.`;
      for (const card of cards) {
        const button = this.button(card.id === 'basep-ancient-mew' ? 'Ancient Mew' : `#${card.localId} · ${card.name}`, () => {
          if (this.disposed) return;
          this.root.close();
          const target = card.id === 'basep-ancient-mew' ? 'ancient-mew' : `pokemon:${card.id}:${card.variants[0] ?? 'normal'}`;
          void this.deps.viewCard(target).then(() => this.dispose(), error => {
            if (this.disposed) return;
            this.root.showModal();
            this.status.textContent = error instanceof Error ? error.message : 'Unable to open this card.';
          });
        }, card.thumbnail, card.id === 'basep-ancient-mew' ? 'Ancient Mew · Full foil' : Number(card.localId) >= 50 ? 'Wizards Black Star Promo · e-Reader layout' : Number(card.localId) >= 2 && Number(card.localId) <= 5 ? 'First Movie · Gold stamp' : card.variants.includes('holo') ? 'Wizards Black Star Promo · Holo' : 'Wizards Black Star Promo · Non-holo');
        button.classList.add('pokemon-promo-card');
      }
    }, () => this.promoCards());
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
    const availability = packAvailability(set.id);
    this.status.textContent = availability.ready && recipe ? `Choose a booster. ${recipe.note} ${availability.detail}`.trim() : availability.detail;
    set.boosters.forEach(booster => {
      const button = this.button(booster.name, () => this.choose(booster), booster.front ?? fallbackWrapper(set), booster.front ? undefined : 'Set artwork fallback');
      if (booster.frontBounds) {
        const img = button.querySelector('img')!, frame = document.createElement('span');
        const [left, top, right, bottom] = booster.frontBounds;
        frame.className = 'pokemon-wrapper-crop'; img.replaceWith(frame); frame.append(img);
        const size = () => frame.style.setProperty('--wrapper-aspect', String(img.naturalWidth * (right - left) / (img.naturalHeight * (bottom - top))));
        img.addEventListener('load', size, { once: true }); if (img.complete && img.naturalWidth) size();
        Object.assign(img.style, { position: 'absolute', maxWidth: 'none', objectFit: 'fill',
          width: `${100 / (right - left)}%`, height: `${100 / (bottom - top)}%`,
          left: `${-100 * left / (right - left)}%`, top: `${-100 * top / (bottom - top)}%` });
      }
      button.classList.add('pokemon-booster'); button.disabled = !availability.ready;
      button.setAttribute('aria-pressed', String(this.selection.booster?.id === booster.id));
    });
  }
  private choose(booster: PokemonBooster, retainedSeed?: number) {
    const set = this.selection.set!; this.selection.booster = booster; this.prepared = undefined; this.showBoosters();
    if (!packAvailability(set.id).ready) return;
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
      const definitions = resolved.pulls.map(p => pokemonDefinition(p.card, p.variant, this.deps.definitions, set.id));
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
    this.prepared = prepared;
    const openPack = () => {
      if (this.prepared !== prepared) return;
      this.root.close();
      void this.deps.open(prepared).then(() => this.dispose(), error => {
        if (this.disposed) return;
        this.root.showModal();
        this.status.textContent = `Unable to open: ${error instanceof Error ? error.message : 'Please retry.'}`;
        this.body.replaceChildren();
        const retry = this.button('Retry Open Pack', openPack);
        retry.classList.add('pokemon-open'); retry.focus();
      });
    };
    openPack();
  }
  private goBack() {
    switch (this.step) {
      case 'yugioh-detail': this.yugiohSetSelection(); break;
      case 'yugioh-sets': this.yugioh(); break;
      case 'yugioh': this.types(); break;
      case 'cards': this.sets(); break;
      case 'boosters': this.sets(); break;
      case 'sets': this.series(); break;
      case 'series': case 'archive': this.types(); break;
      default: this.dispose();
    }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.task.cancel(); this.prepared = undefined; this.root.close(); this.root.remove(); this.deps.close(); }
}
