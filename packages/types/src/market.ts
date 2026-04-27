export interface Market {
  market: string;
  korean_name: string;
  english_name: string;
  market_warning?: "NONE" | "CAUTION";
  market_event?: MarketEvent;
}

export interface MarketEvent {
  warning: boolean;
  caution: {
    PRICE_FLUCTUATIONS: boolean;
    TRADING_VOLUME_SOARING: boolean;
    DEPOSIT_AMOUNT_SOARING: boolean;
    GLOBAL_PRICE_DIFFERENCES: boolean;
    CONCENTRATION_OF_SMALL_ACCOUNTS: boolean;
  };
}
