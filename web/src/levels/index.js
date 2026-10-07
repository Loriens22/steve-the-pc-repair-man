import { ShopLevel, TitleLevel, EpilogueLevel } from './shop.js';
import { PlaneLevel } from './plane.js';
import { ChaletLevel } from './chalet.js';
import { VaultLevel } from './vault.js';
export const LEVELS = { title: TitleLevel, shop: ShopLevel, plane: PlaneLevel, chalet: ChaletLevel, vault: VaultLevel, epilogue: EpilogueLevel };
export const CHAPTERS = [
  { id: 'shop', title: 'Have You Tried Turning It Off And On Again?', blurb: "Steve's shop. A dead CMOS battery, a 93-year-old customer, and a visitor who never buys hard drives." },
  { id: 'plane', title: 'Seat 2A', blurb: 'First class to Zurich. Clone a keycard from a very large, very asleep man.' },
  { id: 'chalet', title: 'Cold Boot', blurb: 'A ski chalet on a data vault. Guards, cameras, and somewhere, a sticky note.' },
  { id: 'vault', title: 'The Asset', blurb: 'Down the server halls to W.I.N.S.T.O.N. Time to talk about his uptime.' },
  { id: 'epilogue', title: 'Paid In Full', blurb: 'Back home. Ms. Ellis has broken her computer again. On purpose?' },
];
