/** Keep Showdown names and printed TCG punctuation compatible in the existing search. */
export function gallerySearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    .replace(/[’‘']/g, '').replace(/♀/g, ' female').replace(/♂/g, ' male')
    .replace(/[.:-]/g, ' ').replace(/\balola\b/g, 'alolan').replace(/\bgalar\b/g, 'galarian')
    .replace(/\bhisui\b/g, 'hisuian').replace(/\bpaldea\b/g, 'paldean');
}
