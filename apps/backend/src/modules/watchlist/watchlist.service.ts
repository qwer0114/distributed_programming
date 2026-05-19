import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WatchlistItemOrm } from '../../orm/watchlist-item.orm-entity';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistItemOrm) private readonly repo: Repository<WatchlistItemOrm>,
  ) {}

  async list(memberId: number): Promise<WatchlistItemOrm[]> {
    return this.repo.find({ where: { memberId }, order: { createdAt: 'ASC' } });
  }

  async toggle(memberId: number, market: string): Promise<{ market: string; added: boolean }> {
    const existing = await this.repo.findOne({ where: { memberId, market } });
    if (existing) {
      await this.repo.remove(existing);
      return { market, added: false };
    }
    await this.repo.save(this.repo.create({ memberId, market }));
    return { market, added: true };
  }
}
