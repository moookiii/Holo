export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; }
export function button(text: string, action: () => void, title = '') { const b = element('button', '', text); b.type = 'button'; b.onclick = action; if (title) b.title = title; return b; }
export function select(label: string, options: Array<[string, string]>, action: (value: string) => void) { const el = element('select'); el.setAttribute('aria-label', label); for (const [value, name] of options) el.add(new Option(name, value)); el.onchange = () => action(el.value); return el; }
export function section(title: string, open = true) { const el = element('details', 'hl-group'); el.open = open; el.append(element('summary', '', title)); return el; }
export function numeric(label: string, value: number, min: number, max: number, step: number, change: (n: number) => void, begin = () => {}, commit = () => {}) {
  const row = element('label', 'hl-number'), title = element('span', '', label), range = element('input'), number = element('input');
  range.type = 'range'; number.type = 'number';
  // Preserve exact accepted values even if a family's calibration exceeds an authoring range.
  min = Math.min(min, value); max = Math.max(max, value);
  for (const input of [range, number]) { input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value); input.setAttribute('aria-label', `${label}${input === number ? ' value' : ''}`); }
  const apply = (source: HTMLInputElement) => {
    if (!source.value.trim() || !Number.isFinite(source.valueAsNumber)) return;
    const n = Math.max(min, Math.min(max, source.valueAsNumber));
    if (source === range) number.value = String(n); else range.value = String(n);
    change(n);
  };
  range.onpointerdown = begin; range.onkeydown = event => { if (event.key.startsWith('Arrow') || ['Home','End','PageUp','PageDown'].includes(event.key)) begin(); };
  range.oninput = () => apply(range); range.onchange = commit; range.onpointerup = commit; range.onpointercancel = commit; range.onblur = commit;
  number.onfocus = begin; number.oninput = () => apply(number); number.onchange = commit; number.onblur = commit;
  row.append(title, number, range);
  return { row, range, number, update: (n: number) => { if (document.activeElement !== number && document.activeElement !== range) { number.value = String(Number(n.toFixed(3))); range.value = String(n); } } };
}
export function askName(title: string, initial: string): Promise<string | undefined> {
  return new Promise(resolve => {
    const dialog = element('dialog', 'hl-dialog'), form = element('form'), input = element('input');
    form.method = 'dialog'; input.value = initial; input.required = true; input.maxLength = 160; input.setAttribute('aria-label', title);
    const accept = button('Continue', () => { if (input.value.trim()) { resolve(input.value.trim()); dialog.close(); } });
    form.append(element('h2', '', title), input, button('Cancel', () => dialog.close()), accept); dialog.append(form); document.body.append(dialog);
    form.onsubmit = event => { event.preventDefault(); accept.click(); }; dialog.onclose = () => { resolve(undefined); dialog.remove(); };
    dialog.showModal(); input.select();
  });
}
