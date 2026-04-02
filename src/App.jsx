import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Filter, ArrowRightLeft, AlertCircle, Info, X, Activity, Radio, Newspaper } from 'lucide-react';

// === 產生 30 天模擬展示資料的輔助函式 ===
const generateMockData = () => {
  const data = {};
  const baseDate = new Date();
  
  const currentStocks = [
    { symbol: "2330", name: "台積電", weight: 31.2, shares: 1450000, trend: 1 },
    { symbol: "2317", name: "鴻海", weight: 5.5, shares: 820000, trend: -1 },
    { symbol: "2454", name: "聯發科", weight: 4.8, shares: 250000, trend: 0 },
    { symbol: "2308", name: "台達電", weight: 3.2, shares: 150000, trend: 1 }, 
    { symbol: "2382", name: "廣達", weight: 2.8, shares: 320000, trend: 1 },
    { symbol: "2603", name: "長榮", weight: 1.5, shares: 150000, trend: -1 },
    { symbol: "2881", name: "富邦金", weight: 0, shares: 0, trend: -1 }       
  ];

  const histories = currentStocks.map(stock => {
    let currentW = stock.weight;
    let currentS = stock.shares;
    const history = [];
    
    for (let i = 0; i < 30; i++) {
      if (stock.symbol === "2308" && i > 15) { 
        history.push({ w: 0, s: 0 }); 
        continue; 
      }
      if (stock.symbol === "2881") {
        if (i === 0) {
          history.push({ w: 0, s: 0 });
        } else {
          currentW = currentW === 0 ? 2.5 : currentW + (Math.random() * 0.1 - 0.02);
          currentS = currentS === 0 ? 450000 : currentS + (Math.random() * 5000 - 1000);
          history.push({ w: currentW, s: currentS });
        }
        continue;
      }

      history.push({ w: currentW, s: currentS });

      let wStep = stock.trend * (Math.random() * 0.08 + 0.02) + (Math.random() - 0.5) * 0.06;
      let sStep = stock.trend * (Math.random() * 2000 + 500) + (Math.random() - 0.5) * 1500;

      currentW = Math.max(0, currentW - wStep);
      currentS = Math.max(0, currentS - sStep);
    }
    return { symbol: stock.symbol, name: stock.name, history };
  });

  let daysSubtracted = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    while (true) {
      const tempD = new Date(baseDate);
      tempD.setDate(baseDate.getDate() - daysSubtracted);
      const day = tempD.getDay();
      if (day !== 0 && day !== 6) {
        d.setTime(tempD.getTime());
        daysSubtracted++;
        break;
      }
      daysSubtracted++;
    }
    
    const dateStr = d.toISOString().split('T')[0];
    
    data[dateStr] = histories.map(h => ({
      symbol: h.symbol,
      name: h.name,
      weight: Math.max(0, Number(h.history[i].w.toFixed(2))),
      shares: Math.max(0, Math.round(h.history[i].s))
    })).filter(s => s.weight > 0 || (i === 0 && s.symbol === "2881"));
  }
  
  return data;
};

// === 自製輕量級 SVG 折線圖元件 ===
const TrendChart = ({ data, dataKey, title, strokeColor, formatFn }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) return null;

  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  const padRatio = 0.15;
  const paddedMin = Math.max(0, minVal - range * padRatio); 
  const paddedMax = maxVal + range * padRatio;
  const paddedRange = paddedMax - paddedMin === 0 ? 1 : paddedMax - paddedMin;

  const getX = (i) => data.length <= 1 ? 50 : (i / (data.length - 1)) * 100;
  const getY = (val) => 100 - ((val - paddedMin) / paddedRange) * 100;

  const pathData = data.length === 1 
    ? `M 0 ${getY(values[0])} L 100 ${getY(values[0])}`
    : data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[dataKey])}`).join(' ');

  return (
    <div 
      className="bg-slate-900 border border-slate-700/60 p-4 rounded-xl flex flex-col h-full shadow-inner relative group"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-slate-300">{title}</span>
        <div className="flex gap-3 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-400/50"/> 低: {formatFn(minVal)}</span>
          <span className="flex items-center gap-1"><TrendingUp size={12} className="text-green-400/50"/> 高: {formatFn(maxVal)}</span>
        </div>
      </div>

      <div className="relative flex-grow w-full mt-2">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-t border-b border-slate-800/50">
          <div className="w-full h-px bg-slate-800/30"></div>
          <div className="w-full h-px bg-slate-800/30"></div>
          <div className="w-full h-px bg-slate-800/30"></div>
        </div>

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d={`${pathData} L 100 100 L 0 100 Z`}
            fill={`url(#gradient-${dataKey})`}
            opacity="0.15"
          />
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          />
        </svg>

        <svg className="absolute inset-0 w-full h-full overflow-visible">
          {data.map((d, i) => (
            <g key={i} onMouseEnter={() => setHoverIndex(i)}>
              <rect
                x={`${Math.max(0, getX(i) - 2)}%`}
                y="0"
                width="4%"
                height="100%"
                fill="transparent"
                className="cursor-pointer"
              />
              <circle
                cx={`${getX(i)}%`}
                cy={`${getY(d[dataKey])}%`}
                r={hoverIndex === i ? "5" : "3.5"}
                fill={hoverIndex === i ? strokeColor : "#0f172a"}
                stroke={strokeColor}
                strokeWidth="2"
                className="transition-all duration-200 z-10 relative pointer-events-none"
              />
            </g>
          ))}
        </svg>

        {hoverIndex !== null && (
          <div
            className="absolute z-50 bg-slate-800 text-white text-xs py-1.5 px-2.5 rounded-lg shadow-xl border border-slate-600 pointer-events-none transition-all duration-75 ease-out flex flex-col gap-1 whitespace-nowrap"
            style={{
              left: `${getX(hoverIndex)}%`,
              top: `calc(${getY(data[hoverIndex][dataKey])}% - 12px)`,
              transform: `translate(${getX(hoverIndex) > 85 ? '-100%' : getX(hoverIndex) < 15 ? '0%' : '-50%'}, -100%)`,
              marginLeft: getX(hoverIndex) > 85 ? '-8px' : getX(hoverIndex) < 15 ? '8px' : '0px'
            }}
          >
            <div className="font-mono text-slate-400 text-[10px]">{data[hoverIndex].date}</div>
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strokeColor }}></div>
              {formatFn(data[hoverIndex][dataKey])}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-4">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default function App() {
  const [historicalData, setHistoricalData] = useState({});
  const [dates, setDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('weight-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMockData, setIsMockData] = useState(false); 
  const [selectedStock, setSelectedStock] = useState(null); 
  const [showOnlyChangedShares, setShowOnlyChangedShares] = useState(false);

  // ETF 總體即時報價狀態
  const [realtimeQuote, setRealtimeQuote] = useState({
    price: null,
    referencePrice: null,
    change: null,
    changePercent: null,
    volume: null,
    time: null,
    connected: false,
    direction: null 
  });

  // 儲存各成分股的即時報價狀態
  const [stockQuotes, setStockQuotes] = useState({});
  
  // 儲存目前選中標的的即時新聞與載入狀態
  const [stockNews, setStockNews] = useState([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isNewsError, setIsNewsError] = useState(false);

  const fugleToken = "NjFkNTkzMDQtZTI3Zi00ZjIzLTk1YjItZjg2ZDRhMTQ0ZDNhIDc4Y2VkYzhlLTAzYzAtNDI2NC1hM2Y5LWE4MWVjMWNiMTIyZg==";

  // 原始的靜態資料拉取邏輯
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const cacheBuster = `t=${Date.now()}`;
        const dataPath = `data.json?${cacheBuster}`;
        
        const res = await fetch(dataPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        if (!data || Object.keys(data).length === 0) throw new Error('Empty Data');
        
        setHistoricalData(data);
        const availableDates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
        setDates(availableDates);
        
        if (availableDates.length > 0) {
          setEndDate(availableDates[0]); 
          setStartDate(availableDates.length > 1 ? availableDates[1] : availableDates[0]); 
        }
        setIsMockData(false);
      } catch (err) {
        console.warn('使用模擬資料');
        const mockData = generateMockData();
        setHistoricalData(mockData);
        const availableDates = Object.keys(mockData).sort((a, b) => new Date(b) - new Date(a));
        setDates(availableDates);
        if (availableDates.length > 0) {
          setEndDate(availableDates[0]); 
          setStartDate(availableDates.length > 1 ? availableDates[1] : availableDates[0]); 
        }
        setIsMockData(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHoldings();
  }, []);

  // 當選擇成分股時，去 FinMind 抓取近 14 日焦點新聞 (加入防呆與錯誤處理)
  useEffect(() => {
    if (!selectedStock) {
      setStockNews([]);
      setIsNewsError(false);
      return;
    }

    let isMounted = true;
    const fetchStockNews = async () => {
      setIsNewsLoading(true);
      setIsNewsError(false); 
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 14); 
        
        const endDateStr = end.toISOString().split('T')[0];
        const startDateStr = start.toISOString().split('T')[0];
        
        const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockNews&data_id=${selectedStock.symbol}&start_date=${startDateStr}&end_date=${endDateStr}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        if (json.status === 200 && json.data) {
          const uniqueNews = [];
          const titles = new Set();
          
          const reversedData = [...json.data].reverse();
          
          for (const item of reversedData) {
            if (!titles.has(item.title)) {
              titles.add(item.title);
              uniqueNews.push(item);
            }
            if (uniqueNews.length >= 4) break;
          }
          if (isMounted) setStockNews(uniqueNews);
        } else {
          if (isMounted) setIsNewsError(true);
        }
      } catch (e) {
        console.error("[FinMind News API] 發生網路或 CORS 錯誤:", e);
        if (isMounted) setIsNewsError(true); 
      } finally {
        if (isMounted) setIsNewsLoading(false);
      }
    };

    fetchStockNews();

    return () => {
      isMounted = false;
    };
  }, [selectedStock]);

  const holdingsDiff = useMemo(() => {
    if (!startDate || !endDate || !historicalData || Object.keys(historicalData).length === 0) return [];

    const startData = historicalData[startDate] || [];
    const endData = historicalData[endDate] || [];
    const map = new Map();

    startData.forEach(item => {
      map.set(item.symbol, {
        symbol: item.symbol,
        name: item.name,
        startWeight: item.weight || 0,
        endWeight: 0,
        diff: -(item.weight || 0),
        startShares: item.shares || 0,
        endShares: 0,
        sharesDiff: -(item.shares || 0)
      });
    });

    endData.forEach(item => {
      if (map.has(item.symbol)) {
        const existing = map.get(item.symbol);
        existing.endWeight = item.weight || 0;
        existing.diff = Math.round(((item.weight || 0) - existing.startWeight) * 100) / 100;
        existing.endShares = item.shares || 0;
        existing.sharesDiff = (item.shares || 0) - existing.startShares;
      } else {
        map.set(item.symbol, {
          symbol: item.symbol,
          name: item.name,
          startWeight: 0,
          endWeight: item.weight || 0,
          diff: item.weight || 0,
          startShares: 0,
          endShares: item.shares || 0,
          sharesDiff: item.shares || 0
        });
      }
    });

    let results = Array.from(map.values());

    results.sort((a, b) => {
      if (sortBy === 'weight-desc') return b.endWeight - a.endWeight;
      if (sortBy === 'diff-desc') return b.diff - a.diff;
      if (sortBy === 'diff-asc') return a.diff - b.diff;
      if (sortBy === 'shares-desc') return b.sharesDiff - a.sharesDiff;
      if (sortBy === 'shares-asc') return a.sharesDiff - b.sharesDiff;
      return 0;
    });

    return results;
  }, [historicalData, startDate, endDate, sortBy]);

  const displayedHoldings = useMemo(() => {
    if (!showOnlyChangedShares) return holdingsDiff;
    return holdingsDiff.filter(stock => stock.sharesDiff !== 0);
  }, [holdingsDiff, showOnlyChangedShares]);

  // 背景輪詢各成分股即時報價 (每 30 秒)
  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const fetchComponentQuotes = async () => {
      if (!displayedHoldings || displayedHoldings.length === 0) return;
      const symbols = displayedHoldings.map(h => h.symbol);

      for (const symbol of symbols) {
        if (!isMounted) break;
        try {
          const res = await fetch(`https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`, {
            headers: { 'X-API-KEY': fugleToken }
          });
          
          if (res.status === 429) {
            console.warn("Fugle API 限流 (429)，暫停本次更新");
            break; 
          }

          if (res.ok) {
            const data = await res.json();
            const price = data.lastTrade?.price || data.closePrice || data.referencePrice;
            const refPrice = data.referencePrice;
            if (price) {
              setStockQuotes(prev => ({
                ...prev,
                [symbol]: {
                  price,
                  change: price - refPrice,
                  changePercent: refPrice ? ((price - refPrice) / refPrice) * 100 : 0
                }
              }));
            }
          }
        } catch (e) {
          // 忽略單一股票的網路錯誤
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    };

    const timeoutId = setTimeout(() => {
      fetchComponentQuotes();
      intervalId = setInterval(fetchComponentQuotes, 30000); 
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [displayedHoldings]);

  // Fugle API 與 WebSocket 連線處理 (00981A 主標題)
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const fetchInitialQuote = async () => {
      try {
        const res = await fetch('https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/00981A', {
          headers: { 'X-API-KEY': fugleToken }
        });
        
        if (res.ok) {
          const data = await res.json();
          const price = data.lastTrade?.price || data.closePrice || data.referencePrice;
          const refPrice = data.referencePrice; 
          
          if (price) {
            const timestamp = data.lastTrade?.time ? (data.lastTrade.time > 1e14 ? data.lastTrade.time / 1000 : data.lastTrade.time) : Date.now();
            const dateObj = new Date(timestamp);
            const timeString = isNaN(dateObj) 
              ? new Date().toLocaleTimeString('zh-TW', { hour12: false }) 
              : dateObj.toLocaleTimeString('zh-TW', { hour12: false });

            setRealtimeQuote(prev => {
              const currentPrice = prev.price || price;
              const currentRefPrice = prev.referencePrice || refPrice;
              let change = prev.change;
              let changePercent = prev.changePercent;

              if (currentPrice !== null && currentRefPrice) {
                change = currentPrice - currentRefPrice;
                changePercent = (change / currentRefPrice) * 100;
              }

              return {
                ...prev,
                price: currentPrice,
                referencePrice: currentRefPrice,
                change: change,
                changePercent: changePercent,
                time: prev.time || (data.isClosed ? `${timeString} (已收盤)` : timeString)
              };
            });
          }
        }
      } catch (e) {
        console.error("[Fugle REST] 取得初始報價失敗", e);
      }
    };

    const connectWS = () => {
      ws = new WebSocket('wss://api.fugle.tw/marketdata/v1.0/stock/streaming');

      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: "auth",
          data: { apikey: fugleToken }
        }));

        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              event: "subscribe",
              data: {
                channel: "trades", 
                symbol: "00981A"
              }
            }));
            setRealtimeQuote(prev => ({ ...prev, connected: true }));
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.event === 'authenticated') {
            ws.send(JSON.stringify({
              event: "subscribe",
              data: {
                channel: "trades",
                symbol: "00981A"
              }
            }));
            setRealtimeQuote(prev => ({ ...prev, connected: true }));
          } 
          else if (msg.event === 'data' && msg.data) {
            if (msg.data.price !== undefined) {
              setRealtimeQuote(prev => {
                const newPrice = msg.data.price;
                let direction = prev.direction;
                
                if (prev.price !== null) {
                  if (newPrice > prev.price) direction = 'up';
                  else if (newPrice < prev.price) direction = 'down';
                }

                let change = prev.change;
                let changePercent = prev.changePercent;
                if (prev.referencePrice) {
                  change = newPrice - prev.referencePrice;
                  changePercent = (change / prev.referencePrice) * 100;
                }

                const timestamp = msg.data.time > 1e14 ? msg.data.time / 1000 : msg.data.time;
                const dateObj = new Date(timestamp);
                const timeString = isNaN(dateObj) 
                  ? new Date().toLocaleTimeString('zh-TW', { hour12: false }) 
                  : dateObj.toLocaleTimeString('zh-TW', { hour12: false });

                return {
                  ...prev,
                  price: newPrice,
                  change: change,
                  changePercent: changePercent,
                  volume: msg.data.volume || msg.data.size,
                  time: timeString,
                  connected: true,
                  direction: direction
                };
              });
            }
          }
        } catch(e) {
          console.error("[Fugle WS] Parse Error", e);
        }
      };

      ws.onclose = () => {
        setRealtimeQuote(prev => ({ ...prev, connected: false }));
        reconnectTimer = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error("[Fugle WS] Connection Error", err);
        ws.close();
      };
    };

    fetchInitialQuote().then(connectWS);

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []); 

  const stats = useMemo(() => {
    const increased = holdingsDiff.filter(d => d.sharesDiff > 0).length;
    const decreased = holdingsDiff.filter(d => d.sharesDiff < 0).length;
    return { increased, decreased };
  }, [holdingsDiff]);

  const trendData = useMemo(() => {
    if (!selectedStock || dates.length === 0) return null;
    const recentDates = dates.slice(0, 30).reverse();
    
    return recentDates.map(date => {
      const dayData = historicalData[date] || [];
      const stockInfo = dayData.find(s => s.symbol === selectedStock.symbol) || { weight: 0, shares: 0 };
      return {
        date: date.substring(5), 
        weight: stockInfo.weight || 0,
        shares: stockInfo.shares || 0
      };
    });
  }, [selectedStock, dates, historicalData]);

  const getCardStyle = (sharesDiff, weightDiff) => {
    if (sharesDiff === 0) return { bg: 'bg-slate-800', border: 'border-slate-700', style: {} };
    
    const intensity = Math.max(0.1, Math.min(Math.abs(weightDiff) / 2.0, 0.4)); 
    
    if (sharesDiff > 0) {
      return { bg: 'bg-red-900/40', border: 'border-red-900/60', style: { backgroundColor: `rgba(239, 68, 68, ${intensity})` } };
    } else {
      return { bg: 'bg-green-900/40', border: 'border-green-900/60', style: { backgroundColor: `rgba(34, 197, 94, ${intensity})` } };
    }
  };

  const isDateReversed = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(startDate) > new Date(endDate);
  }, [startDate, endDate]);

  // 格式化市值的輔助函式 (自動轉 億/萬)
  const formatMarketValue = (val) => {
    if (val >= 100000000) return (val / 100000000).toFixed(2) + ' 億';
    if (val >= 10000) return Math.round(val / 10000).toLocaleString() + ' 萬';
    return Math.round(val).toLocaleString() + ' 元';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="animate-pulse tracking-widest text-sm">正在載入戰情資料...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <header className="mb-6 border-b border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wider flex items-center gap-3">
              00981A <span className="text-blue-400">戰情面板</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">主動統一台股增長 ETF - 主要持股與張數變化監測</p>
          </div>
          
          <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
            <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/80 px-3 sm:px-4 py-2 rounded-lg border border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Calendar size={16} className="text-slate-500" />
                <select 
                  className="bg-transparent border-none text-sm font-mono focus:outline-none cursor-pointer"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="比較基準 (舊)"
                >
                  {dates.map(d => <option key={`start-${d}`} value={d} className="bg-slate-900">{d}</option>)}
                </select>
              </div>
              
              <ArrowRightLeft size={14} className="text-slate-600" />

              <div className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Calendar size={16} className="text-slate-500" />
                <select 
                  className="bg-transparent border-none text-sm font-mono focus:outline-none cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="比較目標 (新)"
                >
                  {dates.map(d => <option key={`end-${d}`} value={d} className="bg-slate-900">{d}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-end gap-2">
              {isDateReversed && (
                  <div className="flex items-center gap-1.5 text-yellow-500 text-[11px] bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                  <AlertCircle size={12} />
                  <span>基準日晚於目標日，數值反向</span>
                </div>
              )}
              {dates.length === 1 && (
                <div className="flex items-center gap-1.5 text-blue-400 text-[11px] bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                  <Info size={12} />
                  <span>僅一日資料暫無比較</span>
                </div>
              )}
              {isMockData && (
                <div className="flex items-center gap-1.5 text-purple-400 text-[11px] bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                  <Activity size={12} />
                  <span>展示模式 (虛擬資料)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-800/60 border border-slate-700/80 p-4 sm:px-6 rounded-2xl mb-8 shadow-lg relative overflow-hidden backdrop-blur-sm">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${realtimeQuote.connected ? 'bg-blue-500' : 'bg-slate-500'}`}></div>

        <div className="flex items-center gap-4 ml-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className={`relative flex items-center justify-center w-3 h-3 ${realtimeQuote.connected ? '' : 'grayscale'}`}>
                {realtimeQuote.connected && <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${realtimeQuote.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
              <span className="text-slate-400 font-medium text-sm">Fugle 即時報價</span>
            </div>
            
            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              <h2 className="text-2xl font-bold text-white mr-1">00981A</h2>
              {realtimeQuote.price ? (
                <>
                  <span className={`text-4xl tracking-tight font-bold transition-colors duration-300 ${realtimeQuote.direction === 'up' ? 'text-red-400' : realtimeQuote.direction === 'down' ? 'text-green-400' : 'text-white'}`}>
                    {realtimeQuote.price.toFixed(2)}
                  </span>
                  
                  {realtimeQuote.change !== null && (
                    <div className={`flex items-center ml-2 font-bold ${realtimeQuote.change > 0 ? 'text-red-400' : realtimeQuote.change < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                      <span className="text-xl flex items-center gap-0.5">
                        {realtimeQuote.change > 0 ? '▲' : realtimeQuote.change < 0 ? '▼' : '-'} 
                        {Math.abs(realtimeQuote.change).toFixed(2)}
                      </span>
                      <span className="text-sm bg-black/20 px-1.5 py-0.5 rounded ml-2">
                        {realtimeQuote.change > 0 ? '+' : ''}{realtimeQuote.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-lg text-slate-500 animate-pulse font-normal ml-3">
                  取得最新價格中...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex flex-col items-start sm:items-end text-xs text-slate-500 font-mono">
          <div className="flex gap-6 sm:gap-4">
            <span className="flex flex-col">
              <span className="text-slate-600 mb-0.5">WS 連線狀態</span>
              {realtimeQuote.connected ? (
                <span className="text-green-400 font-bold tracking-wider">● CONNECTED</span> 
              ) : (
                <span className="text-red-400 font-bold tracking-wider">○ DISCONNECTED</span>
              )}
            </span>
            {realtimeQuote.time && (
              <span className="flex flex-col items-start sm:items-end">
                <span className="text-slate-600 mb-0.5">最後更新時間</span>
                <span className="text-slate-300 tracking-wider">{realtimeQuote.time}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {selectedStock && trendData && (
        <div className="mb-8 bg-slate-800/40 border border-blue-900/50 rounded-2xl p-5 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          
          <div className="flex justify-between items-start mb-6 pl-2">
            <div className="w-full pr-8">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-blue-400" size={24} />
                  {selectedStock.name} <span className="text-slate-400 text-base font-mono">({selectedStock.symbol})</span>
                </h2>
              </div>
              
              <div className="bg-slate-900/60 border border-slate-700 p-3 rounded-lg flex items-start gap-3 mt-3 shadow-inner">
                <div className="bg-blue-500/20 p-1.5 rounded-full mt-0.5 shrink-0">
                  <Newspaper size={16} className="text-blue-400" />
                </div>
                <div className="w-full">
                  <h4 className="text-[11px] font-bold text-blue-400 mb-1.5 tracking-wider">近期焦點新聞 (FinMind)</h4>
                  {isNewsLoading ? (
                     <div className="text-sm text-slate-400 animate-pulse">正在為您搜尋最新市場新聞...</div>
                  ) : isNewsError ? (
                     <div className="flex flex-col gap-1.5">
                       <div className="text-sm text-slate-500 flex items-center gap-1">
                         <AlertCircle size={14} className="text-slate-500" />
                         <span>API 連線受限，無法自動載入新聞。</span>
                       </div>
                       <a 
                         href={`https://tw.stock.yahoo.com/quote/${selectedStock.symbol}/news`} 
                         target="_blank" 
                         rel="noreferrer" 
                         className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors w-fit"
                       >
                         👉 點擊前往 Yahoo 股市查看【{selectedStock.name}】最新新聞
                       </a>
                     </div>
                  ) : stockNews.length > 0 ? (
                     <ul className="space-y-1.5 list-none">
                       {stockNews.map((news, idx) => (
                         <li key={idx} className="text-sm text-slate-300 leading-snug line-clamp-1 truncate max-w-full hover:text-blue-300 transition-colors">
                           <a href={news.link} target="_blank" rel="noreferrer" className="hover:underline">
                             • {news.title}
                           </a>
                         </li>
                       ))}
                     </ul>
                  ) : (
                     <div className="text-sm text-slate-500">近期無相關新聞資料。</div>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedStock(null)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer shrink-0"
              title="關閉面板"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-52 md:h-48">
            <TrendChart 
              data={trendData} 
              dataKey="weight" 
              title="持股權重趨勢" 
              strokeColor="#ef4444" 
              formatFn={(v) => v.toFixed(2) + '%'} 
            />
            <TrendChart 
              data={trendData} 
              dataKey="shares" 
              title="持有張數趨勢" 
              strokeColor="#3b82f6" 
              formatFn={(v) => Math.round(v / 1000).toLocaleString() + ' 張'} 
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center shadow-sm">
            <span className="text-slate-400 mr-3">增持</span>
            <span className="text-red-400 font-bold text-lg">{stats.increased}</span> 
            <span className="text-slate-500 ml-1 text-xs">檔</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center shadow-sm">
            <span className="text-slate-400 mr-3">減持</span>
            <span className="text-green-400 font-bold text-lg">{stats.decreased}</span>
            <span className="text-slate-500 ml-1 text-xs">檔</span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 shadow-sm text-sm text-slate-300 hover:text-white transition-colors">
            <input 
              type="checkbox" 
              checked={showOnlyChangedShares}
              onChange={(e) => setShowOnlyChangedShares(e.target.checked)}
              className="w-4 h-4 accent-blue-500 cursor-pointer bg-slate-800 border-slate-700 rounded"
            />
            <span className="select-none pt-px">僅顯示張數異動</span>
          </label>

          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 shadow-sm">
            <Filter size={16} className="text-slate-400 ml-2" />
            <select 
              className="bg-transparent border-none text-sm text-slate-200 focus:outline-none px-2 py-1 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="weight-desc">按最新權重 (高至低)</option>
              <option value="diff-desc">按權重增持 (大至小)</option>
              <option value="diff-asc">按權重減持 (大至小)</option>
              <option value="shares-desc">按加碼張數 (多至少)</option>
              <option value="shares-asc">按倒貨張數 (多至少)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {displayedHoldings.map((stock) => {
          const style = getCardStyle(stock.sharesDiff, stock.diff);
          const isRemoved = stock.startWeight > 0 && stock.endWeight === 0;
          const isNew = stock.startWeight === 0 && stock.endWeight > 0;
          const isSelected = selectedStock?.symbol === stock.symbol;
          
          const quote = stockQuotes[stock.symbol];
          const marketValue = quote && stock.endShares ? quote.price * stock.endShares : null;
          
          return (
            <div 
              key={stock.symbol} 
              onClick={() => {
                setSelectedStock(isSelected ? null : { symbol: stock.symbol, name: stock.name });
                if (!isSelected) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`relative overflow-hidden rounded-xl border p-4 flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 ${style.bg} ${style.border} ${isRemoved ? 'opacity-75 grayscale-[30%]' : ''} ${isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:shadow-lg hover:shadow-black/50'}`}
              style={style.style}
            >
              {isNew && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-lg shadow-sm z-10">
                  新進榜
                </div>
              )}
              {isRemoved && (
                <div className="absolute top-0 left-0 w-full bg-slate-800/90 border-b border-slate-700 text-slate-300 text-[10px] font-bold text-center py-1 z-10 backdrop-blur-sm">
                  已剔除 / 跌出榜外
                </div>
              )}

              <div className={`flex justify-between items-start mb-2 ${isRemoved ? 'mt-4' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-wide">{stock.name}</h3>
                    {quote && (
                      <span className={`text-sm font-bold font-mono ${quote.change > 0 ? 'text-red-400' : quote.change < 0 ? 'text-green-400' : 'text-slate-300'}`}>
                        {quote.price.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400 block font-mono">{stock.symbol}</span>
                    {quote && (
                      <span className={`text-[10px] ${quote.change > 0 ? 'text-red-400' : quote.change < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                        {quote.change > 0 ? '▲' : quote.change < 0 ? '▼' : ''}{Math.abs(quote.changePercent).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-black/30 backdrop-blur-sm shrink-0">
                  {stock.sharesDiff > 0 ? (
                    <TrendingUp size={16} className="text-red-400" />
                  ) : stock.sharesDiff < 0 ? (
                    <TrendingDown size={16} className="text-green-400" />
                  ) : (
                    <Minus size={16} className="text-slate-500" />
                  )}
                </div>
              </div>

              <div className="mt-2 flex-grow flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white leading-none">{stock.endWeight > 0 ? stock.endWeight.toFixed(2) : '0.00'}</span>
                  <span className="text-sm text-slate-400 font-medium mb-0.5">%</span>
                </div>
                
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-slate-500">權重</span>
                  <span className={`text-sm font-bold tracking-tight ${stock.diff > 0 ? 'text-red-400' : stock.diff < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {stock.diff > 0 ? '+' : ''}{stock.diff.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 mb-0.5">最新張數</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {stock.endShares ? Math.round(stock.endShares / 1000).toLocaleString() : '--'} <span className="text-[10px] text-slate-500">張</span>
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 mb-0.5">張數異動</span>
                  <span className={`text-xs font-bold ${stock.sharesDiff > 0 ? 'text-red-400' : stock.sharesDiff < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {stock.sharesDiff > 0 ? '+' : ''}{stock.sharesDiff ? Math.round(stock.sharesDiff / 1000).toLocaleString() : '--'} <span className="text-[10px] opacity-70">張</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50 border-dashed">
                <span className="text-[10px] text-slate-400">持有市值 (估)</span>
                <span className="text-[11px] font-mono text-sky-200/90 font-medium tracking-wider">
                  {marketValue ? formatMarketValue(marketValue) : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {displayedHoldings.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p>這個區間沒有張數發生異動的成分股。</p>
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-slate-500 pb-8 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        數據由自動化腳本每日同步。資料基準日：<span className="font-mono">{endDate || '讀取中...'}</span>
      </footer>
    </div>
  );
}
