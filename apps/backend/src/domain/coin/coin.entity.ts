export class Coin {
  private market: string;
  private koreanName: string;
  private englishName: string;
  private marketWarning: string;

  constructor(market: string, koreanName: string, englishName: string, marketWarning: string = 'NONE') {
    this.market = market;
    this.koreanName = koreanName;
    this.englishName = englishName;
    this.marketWarning = marketWarning;
  }

  getMarketCode(): string {
    return this.market;
  }

  getKoreanName(): string {
    return this.koreanName;
  }

  getEnglishName(): string {
    return this.englishName;
  }

  getMarketWarning(): string {
    return this.marketWarning;
  }
}
