// Binance WebSocket and REST API Service for Live Market Data

export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  volume: string;
  lastUpdate: number;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type TickerCallback = (data: TickerData) => void;
type KlineCallback = (data: KlineData) => void;

class BinanceService {
  private wsConnections: Map<string, WebSocket> = new Map();
  private tickerCallbacks: Map<string, Set<TickerCallback>> = new Map();
  private klineCallbacks: Map<string, Set<KlineCallback>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastTickerData: Map<string, TickerData> = new Map();

  private readonly WS_BASE_URL = 'wss://stream.binance.com:9443/ws';
  private readonly REST_BASE_URL = 'https://api.binance.com/api/v3';

  // Supported trading pairs
  readonly SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'LTCUSDT', 'DOGEUSDT', 'TRXUSDT', 'SHIBUSDT'] as const;
  
  // Display names
  readonly SYMBOL_NAMES: Record<string, string> = {
    BTCUSDT: 'BTC/USDT',
    ETHUSDT: 'ETH/USDT',
    BNBUSDT: 'BNB/USDT',
    SOLUSDT: 'SOL/USDT',
    LTCUSDT: 'LTC/USDT',
    DOGEUSDT: 'DOGE/USDT',
    TRXUSDT: 'TRX/USDT',
    SHIBUSDT: 'SHIB/USDT',
  };

  // Subscribe to ticker updates for a symbol
  subscribeTicker(symbol: string, callback: TickerCallback): () => void {
    const normalizedSymbol = symbol.toUpperCase();
    
    if (!this.tickerCallbacks.has(normalizedSymbol)) {
      this.tickerCallbacks.set(normalizedSymbol, new Set());
      this.connectTickerWs(normalizedSymbol);
    }
    
    this.tickerCallbacks.get(normalizedSymbol)!.add(callback);
    
    // Send last known data immediately if available
    const lastData = this.lastTickerData.get(normalizedSymbol);
    if (lastData) {
      callback(lastData);
    }

    return () => {
      const callbacks = this.tickerCallbacks.get(normalizedSymbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.disconnectWs(`ticker_${normalizedSymbol}`);
          this.tickerCallbacks.delete(normalizedSymbol);
        }
      }
    };
  }

  // Subscribe to kline (candlestick) updates
  subscribeKlines(symbol: string, interval: string, callback: KlineCallback): () => void {
    const key = `${symbol.toUpperCase()}_${interval}`;
    
    if (!this.klineCallbacks.has(key)) {
      this.klineCallbacks.set(key, new Set());
      this.connectKlineWs(symbol.toUpperCase(), interval);
    }
    
    this.klineCallbacks.get(key)!.add(callback);

    return () => {
      const callbacks = this.klineCallbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.disconnectWs(`kline_${key}`);
          this.klineCallbacks.delete(key);
        }
      }
    };
  }

  private connectTickerWs(symbol: string) {
    const wsKey = `ticker_${symbol}`;
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const ws = new WebSocket(`${this.WS_BASE_URL}/${streamName}`);

    ws.onopen = () => {
      console.log(`Binance ticker WS connected: ${symbol}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const tickerData: TickerData = {
          symbol: data.s,
          price: data.c,
          priceChange: data.p,
          priceChangePercent: data.P,
          high: data.h,
          low: data.l,
          volume: data.v,
          lastUpdate: Date.now(),
        };
        
        this.lastTickerData.set(symbol, tickerData);
        
        const callbacks = this.tickerCallbacks.get(symbol);
        if (callbacks) {
          callbacks.forEach(cb => cb(tickerData));
        }
      } catch (error) {
        console.error('Error parsing ticker data:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`Binance ticker WS error for ${symbol}:`, error);
    };

    ws.onclose = () => {
      console.log(`Binance ticker WS closed: ${symbol}`);
      this.wsConnections.delete(wsKey);
      
      // Reconnect if still subscribed
      if (this.tickerCallbacks.has(symbol) && this.tickerCallbacks.get(symbol)!.size > 0) {
        this.scheduleReconnect(wsKey, () => this.connectTickerWs(symbol));
      }
    };

    this.wsConnections.set(wsKey, ws);
  }

  private connectKlineWs(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    const wsKey = `kline_${key}`;
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`${this.WS_BASE_URL}/${streamName}`);

    ws.onopen = () => {
      console.log(`Binance kline WS connected: ${symbol} ${interval}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const kline = data.k;
        const klineData: KlineData = {
          time: kline.t,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
        };
        
        const callbacks = this.klineCallbacks.get(key);
        if (callbacks) {
          callbacks.forEach(cb => cb(klineData));
        }
      } catch (error) {
        console.error('Error parsing kline data:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`Binance kline WS error for ${key}:`, error);
    };

    ws.onclose = () => {
      console.log(`Binance kline WS closed: ${key}`);
      this.wsConnections.delete(wsKey);
      
      if (this.klineCallbacks.has(key) && this.klineCallbacks.get(key)!.size > 0) {
        this.scheduleReconnect(wsKey, () => this.connectKlineWs(symbol, interval));
      }
    };

    this.wsConnections.set(wsKey, ws);
  }

  private scheduleReconnect(wsKey: string, reconnectFn: () => void) {
    const existingTimeout = this.reconnectTimeouts.get(wsKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      reconnectFn();
      this.reconnectTimeouts.delete(wsKey);
    }, 3000);
    
    this.reconnectTimeouts.set(wsKey, timeout);
  }

  private disconnectWs(wsKey: string) {
    const ws = this.wsConnections.get(wsKey);
    if (ws) {
      ws.close();
      this.wsConnections.delete(wsKey);
    }
    
    const timeout = this.reconnectTimeouts.get(wsKey);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(wsKey);
    }
  }

  // REST API fallback methods
  async fetchTicker(symbol: string): Promise<TickerData | null> {
    try {
      const response = await fetch(`${this.REST_BASE_URL}/ticker/24hr?symbol=${symbol.toUpperCase()}`);
      const data = await response.json();
      return {
        symbol: data.symbol,
        price: data.lastPrice,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        high: data.highPrice,
        low: data.lowPrice,
        volume: data.volume,
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching ticker:', error);
      return null;
    }
  }

  async fetchKlines(symbol: string, interval: string, limit = 100): Promise<KlineData[]> {
    try {
      const response = await fetch(
        `${this.REST_BASE_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
      );
      const data = await response.json();
      return data.map((k: number[]) => ({
        time: k[0],
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      return [];
    }
  }

  async fetchAllTickers(): Promise<TickerData[]> {
    try {
      const promises = this.SYMBOLS.map(symbol => this.fetchTicker(symbol));
      const results = await Promise.all(promises);
      return results.filter((t): t is TickerData => t !== null);
    } catch (error) {
      console.error('Error fetching all tickers:', error);
      return [];
    }
  }

  // Utility functions
  formatPrice(price: string | number, symbol: string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // SHIB has very small prices, needs 8 decimals
    if (symbol.includes('SHIB')) {
      return numPrice.toFixed(8);
    }
    // Low-price coins need 5 decimals
    if (symbol.includes('DOGE') || symbol.includes('TRX')) {
      return numPrice.toFixed(5);
    }
    // High-value coins (BTC, ETH, BNB, SOL, LTC) use 2 decimals
    return numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPercent(percent: string | number): string {
    const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
    const sign = numPercent >= 0 ? '+' : '';
    return `${sign}${numPercent.toFixed(2)}%`;
  }

  isPositiveChange(percent: string | number): boolean {
    const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
    return numPercent >= 0;
  }

  // Check if kline WebSocket is connected
  isKlineWsConnected(symbol: string, interval: string): boolean {
    const key = `${symbol.toUpperCase()}_${interval}`;
    const wsKey = `kline_${key}`;
    const ws = this.wsConnections.get(wsKey);
    return ws?.readyState === WebSocket.OPEN;
  }

  // Check if ticker WebSocket is connected
  isTickerWsConnected(symbol: string): boolean {
    const wsKey = `ticker_${symbol.toUpperCase()}`;
    const ws = this.wsConnections.get(wsKey);
    return ws?.readyState === WebSocket.OPEN;
  }

  // Cleanup all connections
  cleanup() {
    this.wsConnections.forEach((ws, key) => {
      ws.close();
    });
    this.wsConnections.clear();
    this.tickerCallbacks.clear();
    this.klineCallbacks.clear();
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }
}

export const binanceService = new BinanceService();
