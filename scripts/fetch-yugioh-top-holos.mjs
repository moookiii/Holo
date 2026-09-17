import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const cards = [
  ['mulcharmy-fuwalos', 'Mulcharmy Fuwalos', '42141493', 1, '96.58%', 'ROTA-EN024', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['mulcharmy-purulia', 'Mulcharmy Purulia', '84192580', 2, '89.73%', 'INFO-EN027', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['solemn-judgment', 'Solemn Judgment', '41420027', 3, '53.61%', 'RA05-EN124', 'Starlight Rare', 'ygo-starlight'],
  ['pot-of-sloth', 'Pot of Sloth', '98476659', 4, '52.09%', 'CORI-EN061', 'Starlight Rare', 'ygo-starlight'],
  ['sp-little-knight', 'S:P Little Knight', '29301450', 5, '50.19%', 'AGOV-EN046', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['harpies-feather-duster', "Harpie's Feather Duster", '18144507', 6, '47.53%', 'MP25-EN016', 'Starlight Rare', 'ygo-starlight'],
  ['fallen-and-virtuous', 'The Fallen & The Virtuous', '30271097', 7, '42.59%', 'UP01-EN006', 'Ultimate Rare', 'ygo-ultimate'],
  ['albion-branded-dragon', 'Albion the Branded Dragon', '87746184', 8, '42.59%', 'MP22-EN076', 'Prismatic Secret Rare', 'ygo-prismatic-secret'],
  ['ecclesia-dark-dragon', 'Ecclesia and the Dark Dragon', '78397661', 9, '41.83%', 'BPRO-EN041', 'Starlight Rare', 'ygo-starlight'],
  ['bystial-magnamhut', 'Bystial Magnamhut', '33854624', 10, '38.40%', 'MP25-EN043', 'Starlight Rare', 'ygo-starlight'],
  ['fydraulis-harmonia', 'Fydraulis Harmonia', '70088809', 11, '35.36%', 'BLZD-EN024', 'Starlight Rare', 'ygo-starlight'],
  ['golden-cloud-beast-malong', 'Golden Cloud Beast - Malong', '93125329', 12, '34.22%', 'MP24-EN203', 'Ultra Rare', 'ygo-ultra'],
  ['chaos-angel', 'Chaos Angel', '22850702', 13, '30.42%', 'RA05-EN043', 'Starlight Rare', 'ygo-starlight'],
  ['solemn-accusation', 'Solemn Accusation', '78114463', 14, '28.90%', 'BLZD-EN079', 'Starlight Rare', 'ygo-starlight'],
  ['lava-golem', 'Lava Golem', '102380', 15, '27.38%', 'RA01-EN001', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['medius-the-pure', 'Medius the Pure', '97556336', 16, '23.95%', 'DUAD-EN008', 'Starlight Rare', 'ygo-starlight'],
  ['vidolium-power-patron', 'Vidolium the Unstable Power Patron of Unity', '70488851', 17, '23.95%', 'BLZD-EN010', 'Super Rare', 'ygo-super'],
  ['prohibited-power-patron-portal', 'Prohibited Power Patron Portal - Terminus', '25661743', 18, '23.57%', 'BLZD-EN056', 'Super Rare', 'ygo-super'],
  ['ragged-records-of-rites', 'Ragged Records of Rites', '24461358', 19, '23.19%', 'CORI-EN062', 'Super Rare', 'ygo-super'],
  ['junoldo-power-patron', 'Junoldo the Shadespirit Power Patron', '10266279', 20, '23.19%', 'BLZD-EN013', 'Starlight Rare', 'ygo-starlight'],
  ['skull-archfiend-of-chaos', 'Skull Archfiend of Chaos', '24088928', 21, '22.43%', 'CORI-EN002', 'Starlight Rare', 'ygo-starlight'],
  ['magician-dark-chaos-black-chaos', 'Magician of Dark Chaos - Black Chaos', '44001993', 22, '22.43%', 'CORI-EN027', 'Starlight Rare', 'ygo-starlight'],
  ['dominus-impulse', 'Dominus Impulse', '40366667', 23, '21.67%', 'ROTA-EN079', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['infinite-impermanence', 'Infinite Impermanence', '10045474', 24, '21.67%', 'RA01-EN075', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['charmer-quartet-in-bloom', 'Charmer Quartet in Bloom', '27519978', 25, '21.67%', 'BLZD-EN050', 'Starlight Rare', 'ygo-starlight'],
  ['griffoh', 'Griffoh', '97462632', 26, '20.15%', 'CORI-EN004', 'Starlight Rare', 'ygo-starlight'],
  ['black-chaos', 'Black Chaos', '98684220', 27, '20.15%', 'CORI-EN001', 'Starlight Rare', 'ygo-starlight'],
  ['mind-shuffle', 'Mind Shuffle', '24749710', 28, '20.15%', 'CORI-EN065', 'Super Rare', 'ygo-super'],
  ['crystal-wing-synchro-dragon', 'Crystal Wing Synchro Dragon', '50954680', 29, '20.15%', 'RA02-EN029', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['elfnote-lucina', 'Elfnote Lucina', '13597785', 30, '19.77%', 'BPRO-EN010', 'Starlight Rare', 'ygo-starlight'],
  ['elfnote-tinia', 'Elfnote Tinia', '59581480', 31, '19.77%', 'BPRO-EN011', 'Starlight Rare', 'ygo-starlight'],
  ['elfnote-regina', 'Elfnote Regina', '56651978', 32, '19.77%', 'BLZD-EN014', 'Starlight Rare', 'ygo-starlight'],
  ['elfnote-power-patron', 'Elfnote Power Patron', '12375297', 33, '19.77%', 'BPRO-EN013', 'Super Rare', 'ygo-super'],
  ['elfnotes-welcome-home', 'Elfnotes: Welcome Home', '64491754', 34, '19.77%', 'BPRO-EN056', 'Super Rare', 'ygo-super'],
  ['elfnote-seraphim-strelitzia', 'Elfnote Seraphim Strelitzia', '42302563', 35, '19.77%', 'BPRO-EN040', 'Starlight Rare', 'ygo-starlight'],
  ['elfnote-fortuna', 'Elfnote Fortuna', '85976588', 36, '19.77%', 'BPRO-EN012', 'Super Rare', 'ygo-super'],
  ['elfnote-june-pride', 'Elfnote June Pride', '5559570', 37, '19.77%', 'CORI-EN035', 'Starlight Rare', 'ygo-starlight'],
  ['fa-dawn-dragster', 'F.A. Dawn Dragster', '33158448', 38, '19.77%', 'MP25-EN284', 'Ultra Rare', 'ygo-ultra'],
  ['wind-pegasus-ignister', 'Wind Pegasus @Ignister', '98506199', 39, '19.01%', 'IGAS-EN042', 'Super Rare', 'ygo-super'],
  ['bystial-druiswurm', 'Bystial Druiswurm', '6637331', 40, '18.25%', 'MP25-EN044', 'Starlight Rare', 'ygo-starlight'],
  ['super-polymerization', 'Super Polymerization', '48130397', 41, '17.49%', 'BLMR-EN089', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['super-starslayer-ty-phon', 'Super Starslayer TY-PHON - Sky Crisis', '93039339', 42, '17.11%', 'AGOV-EN042', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['junora-power-patron', 'Junora the Power Patron of Tuning', '5914858', 43, '17.11%', 'BPRO-EN039', 'Super Rare', 'ygo-super'],
  ['bls-soldier-light-darkness', 'Black Luster Soldier - Soldier of Light and Darkness', '70405001', 44, '16.73%', 'CORI-EN028', 'Starlight Rare', 'ygo-starlight'],
  ['magicians-souls', "Magicians' Souls", '97631303', 45, '16.35%', 'RA02-EN014', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['dharc-dark-charmer-gloomy', 'Dharc the Dark Charmer, Gloomy', '8264361', 46, '16.35%', 'RA03-EN048', 'Quarter Century Secret Rare', 'ygo-quarter-century'],
  ['zennas-deceiving-doll-maidens', "Zenna's Deceiving Doll Maidens", '7594154', 47, '16.35%', 'CORI-EN043', 'Starlight Rare', 'ygo-starlight'],
  ['dark-magician-of-destruction', 'Dark Magician of Destruction', '59400890', 48, '15.97%', 'MZMU-EN011', "Collector's Rare", 'ygo-collector'],
  ['cross-sheep', 'Cross-Sheep', '50277355', 49, '15.21%', 'RA05-EN106', 'Starlight Rare', 'ygo-starlight'],
  ['stardust-dragon', 'Stardust Dragon', '44508094', 50, '15.21%', 'DAMA-EN100', 'Starlight Rare', 'ygo-starlight'],
];

const root = path.resolve('public/cards/yugioh-top-holos');
const headers = { 'User-Agent': 'HoloArchive/1.0 (local interactive card viewer)', Accept: 'application/json' };
await mkdir(root, { recursive: true });
const sources = [];
for (const [slug, title, passcode, rank, usage, setCode, rarity, profile] of cards) {
  const metadata = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(title)}`;
  const response = await fetch(metadata, { headers });
  if (!response.ok) throw new Error(`${response.status} ${metadata}`);
  const card = (await response.json()).data[0];
  if (String(card.id) !== passcode) throw new Error(`${title}: expected passcode ${passcode}, received ${card.id}`);
  const printing = (card.card_sets ?? []).find(set => set.set_code === setCode && set.set_rarity.toLowerCase() === rarity.toLowerCase());
  if (!printing) throw new Error(`${title}: ${setCode} is not listed as ${rarity}`);
  const image = `https://images.ygoprodeck.com/images/cards/${passcode}.jpg`;
  const imageResponse = await fetch(image, { headers });
  if (!imageResponse.ok) throw new Error(`${imageResponse.status} ${image}`);
  await writeFile(path.join(root, `${slug}.jpg`), Buffer.from(await imageResponse.arrayBuffer()));
  sources.push({ rank, usage, title, slug, passcode, cardType: card.type, setCode, rarity, profile, image, metadata,
    rankingSource: 'https://ygotcgstats.com/stats/cards?section=main_side&limit=300&period=last_month' });
}
await writeFile(path.join(root, 'sources.json'), `${JSON.stringify(sources, null, 2)}\n`);
console.log(`Downloaded and verified ${sources.length} Yu-Gi-Oh holo candidates.`);
