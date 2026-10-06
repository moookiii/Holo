export type BinderFinish = 'tan' | 'charcoal';
export const BINDER_FINISH_STORAGE = 'holo.binder.finish';

// Color, roughness, metalness. Charcoal retains the original dark materials.
export const BINDER_FINISHES = {
  tan: {
    cover: ['#e1d4bc', .83, 0], piping: ['#d9ccb3', .8, 0],
    fabric: ['#eee5d4', .87, 0], leftLining: ['#e1d4bc', .78, 0],
    spineFabric: ['#e7dcc6', .9, 0], teeth: ['#e2d7c3', .32, .72],
    hardware: ['#c7bdaa', .32, .78], edge: ['#eee7da', .48, 0],
    backing: ['#f0e9dc', .88, 0], plastic: ['#fffaf0', .26, 0],
    weld: ['#bfb49f', .65, 0], stitch: ['#c9bda5', .95, 0],
  },
  charcoal: {
    cover: ['#4c4f55', .64, .03], piping: ['#454950', .58, 0],
    fabric: ['#464a50', .72, 0], leftLining: ['#464a50', .72, 0],
    spineFabric: ['#464a50', .78, 0], teeth: ['#80858d', .38, .82],
    hardware: ['#80858d', .38, .82], edge: ['#929da7', .31, 0],
    backing: ['#34383e', .78, 0], plastic: ['#e5e9ee', .14, .05],
    weld: ['#777d83', .26, .15], stitch: ['#555358', .9, 0],
  },
} as const;
