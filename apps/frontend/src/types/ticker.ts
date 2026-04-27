export interface UpbitTicker {
  type: "ticker";
  code: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  prev_closing_price: number;
  acc_trade_price: number;
  change: "RISE" | "EVEN" | "FALL";
  change_price: number;
  signed_change_price: number;
  change_rate: number;
  signed_change_rate: number;
  ask_bid: "ASK" | "BID";
  trade_volume: number;
  acc_trade_volume: number;
  trade_date: string;
  trade_time: string;
  trade_timestamp: number;
  acc_trade_price_24h: number;
  acc_trade_volume_24h: number;
  streaming_type: "SNAPSHOT" | "REALTIME";
  timestamp: number;
  market_state: string;
  is_trading_suspended: boolean;
  market_warning: "NONE" | "CAUTION";
}
