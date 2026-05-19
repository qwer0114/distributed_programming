import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HoldingCoinOrm } from '../../orm/holding-coin.orm-entity';
import { UpbitService } from '../upbit/upbit.service';

export interface HoldingView {
  currency: string;
  balance: number;
  avgBuyPrice: number;
  currentPrice: number;
  evalAmount: number;
  buyAmount: number;
  profitRate: number;
  profit: number;
}

export interface PortfolioView {
  totalEvalAmount: number;
  totalBuyAmount: number;
  totalProfitRate: number;
  totalProfit: number;
  holdings: HoldingView[];
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(HoldingCoinOrm) private readonly holdingRepo: Repository<HoldingCoinOrm>,
    private readonly upbit: UpbitService,
  ) {}

  async getPortfolio(memberId: number): Promise<PortfolioView> {
    const holdings = await this.holdingRepo.find({ where: { memberId } });
    if (holdings.length === 0) {
      return { totalEvalAmount: 0, totalBuyAmount: 0, totalProfitRate: 0, totalProfit: 0, holdings: [] };
    }

    const markets = holdings.map(h => `KRW-${h.currency}`).join(',');
    const tickers = await this.upbit.getTicker(markets);
    const priceMap = new Map(tickers.map(t => [t.market, t.trade_price]));

    const views: HoldingView[] = holdings.map(h => {
      const currentPrice = priceMap.get(`KRW-${h.currency}`) ?? h.avgBuyPrice;
      const evalAmount = h.balance * currentPrice;
      const buyAmount = h.balance * h.avgBuyPrice;
      const profit = evalAmount - buyAmount;
      const profitRate = buyAmount === 0 ? 0 : (profit / buyAmount) * 100;
      return {
        currency: h.currency,
        balance: h.balance,
        avgBuyPrice: h.avgBuyPrice,
        currentPrice,
        evalAmount,
        buyAmount,
        profitRate,
        profit,
      };
    });

    const totalEvalAmount = views.reduce((s, v) => s + v.evalAmount, 0);
    const totalBuyAmount = views.reduce((s, v) => s + v.buyAmount, 0);
    const totalProfit = totalEvalAmount - totalBuyAmount;
    const totalProfitRate = totalBuyAmount === 0 ? 0 : (totalProfit / totalBuyAmount) * 100;

    return { totalEvalAmount, totalBuyAmount, totalProfit, totalProfitRate, holdings: views };
  }
}
