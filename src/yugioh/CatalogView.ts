import './browser.css';
import type { YugiohCatalogSet } from './types.ts';
import { queryCatalog, type CatalogQuery } from './catalog/provider.ts';

/** Paginated catalog: at most 36 set nodes, independent of provider catalog size. */
export class YugiohCatalogView {
  readonly root = document.createElement('section');
  private page = 0;
  private query: CatalogQuery = { search: '', format: 'TCG', era: '', family: '', sort: 'newest' };
  constructor(sets: readonly YugiohCatalogSet[], choose: (set: YugiohCatalogSet) => void) {
    this.root.className = 'yugioh-catalog';
    const controls = document.createElement('div'), list = document.createElement('div'), footer = document.createElement('nav'), summary = document.createElement('p');
    controls.className = 'yugioh-filters'; list.className = 'yugioh-results'; summary.setAttribute('role','status');
    const render = () => {
      const filtered = queryCatalog(sets, this.query), pageCount = Math.max(1, Math.ceil(filtered.length / 36));
      this.page = Math.min(this.page, pageCount - 1); list.replaceChildren(); footer.replaceChildren();
      summary.textContent = this.query.format === 'OCG' ? 'No OCG feed is available from this provider. Physical TCG sets are not relabeled as OCG.' : `${filtered.length} sets · Page ${this.page + 1} of ${pageCount}`;
      for (const set of filtered.slice(this.page * 36, (this.page + 1) * 36)) {
        const button = document.createElement('button'), title = document.createElement('strong'), meta = document.createElement('small'), status = document.createElement('span');
        button.className = 'pokemon-pack-tile yugioh-set'; title.textContent = set.name;
        meta.textContent = `${set.setCode ?? 'No code'} · ${set.releaseDate ?? 'Date unknown'} · ${set.cardCount ?? '?'} catalog cards`;
        status.textContent = set.implementationStatus === 'implemented' ? 'Opening available' : set.implementationStatus === 'partial' ? 'Partial' : 'Browse only';
        status.className = `yugioh-support ${set.implementationStatus}`;
        button.append(title,meta,status); button.onclick = () => choose(set); list.append(button);
      }
      for (const [label,delta] of [['Previous',-1],['Next',1]] as const) {
        const button=document.createElement('button');button.textContent=label;button.disabled=delta<0?this.page===0:this.page===pageCount-1;
        button.onclick=()=>{this.page+=delta;render();this.root.scrollIntoView({block:'start'});};footer.append(button);
      }
    };
    const search = document.createElement('input');search.type='search';search.placeholder='Search set name or code';search.setAttribute('aria-label','Search Yu-Gi-Oh! sets');
    search.oninput=()=>{this.query.search=search.value;this.page=0;render();};controls.append(search);
    const select = (key: 'format'|'era'|'family'|'sort', label: string, values: [string,string][]) => {
      const wrap=document.createElement('label'), caption=document.createElement('span'), field=document.createElement('select');caption.textContent=label;field.setAttribute('aria-label',label);
      for(const [value,name] of values){const option=document.createElement('option');option.value=value;option.textContent=name;field.append(option);}
      field.value=this.query[key];field.onchange=()=>{Object.assign(this.query,{[key]:field.value});this.page=0;render();};wrap.append(caption,field);controls.append(wrap);
    };
    select('format','Format',[['TCG','Physical TCG'],['OCG','Physical OCG'],['all','All available']]);
    select('era','Release period',[['','All periods'],...[...new Set(sets.map(s=>s.era))].sort().reverse().map(s=>[s,s] as [string,string])]);
    select('family','Product family',[['','All families'],...[...new Set(sets.map(s=>s.productFamily))].sort().map(s=>[s,s] as [string,string])]);
    select('sort','Sort',[['newest','Newest first'],['oldest','Oldest first'],['alphabetical','A–Z']]);
    this.root.append(controls,summary,list,footer);render();
  }
}
