import { Level } from './base.js';
export class VaultLevel extends Level { async build() { this.game.makePlayer().place(0, 0, 0, 0); this.game.world.sun(0xffffff, 2, new (await import("three")).Vector3(5,10,5), 10); } }
