import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Filter, ArrowRightLeft, AlertCircle } from 'lucide-react';

export default function App() {
  const [historicalData, setHistoricalData] = useState({});
  const [dates, setDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('weight-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 使用簡單的相對路徑並加入時間戳記防止快取
    // 避免在某些環境下使用 new URL(..., window.location.href) 導致的 Invalid URL 錯誤
    const cacheBuster = `t=${Date.now()}`;
    const dataPath = `data.json?${cacheBuster}`;

    fetch(dataPath)
      .then(res => {
        if (!res.ok) {
          throw new Error(`無法讀取 data.json (HTTP ${res.status})。請確認 public/data.json 是否存在並已執行爬蟲腳本。`);
        }
        return res.json();
      })
      .then(data => {
        if (!data || Object.keys(data).length === 0) {
          throw new Error('data.json 內容為空，尚未包含任何持股紀錄。');
        }
        
        setHistoricalData(data);
        const availableDates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
        setDates(availableDates);
        
        if (availableDates.length > 0) {
          setEndDate(availableDates[0]);
          setStartDate(availableDates.length > 1 ? availableDates[1] : availableDates[0]);
        }
      })
      .catch(err => {
        console.error('[Data Fetch Error]:', err.message);
        // 確保錯誤訊息是字串
        setErrorMsg(String(err.message));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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
        existing.diff = Number(((item.weight || 0) - existing.startWeight).toFixed(2));
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

  const stats = useMemo(() => {
    const increased = holdingsDiff.filter(d => d.diff > 0).length;
    const decreased = holdingsDiff.filter(d => d.diff < 0).length;
    return { increased, decreased };
  }, [holdingsDiff]);

  const getCardStyle = (diff) => {
    if (diff === 0) return { bg: 'bg-slate-800', border: 'border-slate-700' };
    const intensity = Math.min(Math.abs(diff) / 2.0, 0.5); 
    if (diff > 0) {
      return { bg: 'bg-red-900/40', border: 'border-red-900/60', style: { backgroundColor: `rgba(239, 68, 68, ${intensity})` } };
    } else {
      return { bg: 'bg-green-900/40', border: 'border-green-900/60', style: { backgroundColor: `rgba(34, 197, 94, ${intensity})` } };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="animate-pulse">正在載入戰情資料...</p>
      </div>
    );
  }

  // 無資料時的空狀態顯示
  if (dates.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">未發現持股資料</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            系統無法讀取到有效的資料檔案。這可能是因為爬蟲尚未執行，或資料存檔路徑不正確。
          </p>
          <div className="bg-black/30 p-4 rounded-lg text-left mb-6 font-mono text-xs text-red-400 overflow-x-auto">
            錯誤詳情: {String(errorMsg || 'Unknown Error')}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            重新整理網頁
          </button>
        </div>
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
          
          <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <select 
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              >
                {dates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div className="flex items-center justify-center text-slate-500">
              <ArrowRightLeft size={16} />
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <select 
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              >
                {dates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400 mr-2">增持</span>
            <span className="text-red-400 font-bold text-lg">{stats.increased}</span> 檔
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400 mr-2">減持</span>
            <span className="text-green-400 font-bold text-lg">{stats.decreased}</span> 檔
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <Filter size={16} className="text-slate-400 ml-2" />
          <select 
            className="bg-transparent border-none text-sm text-slate-200 focus:outline-none px-2 py-1"
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {holdingsDiff.map((stock) => {
          const style = getCardStyle(stock.diff);
          
          return (
            <div 
              key={stock.symbol} 
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] ${style.bg} ${style.border}`}
              style={style.style}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{stock.name}</h3>
                  <span className="text-xs text-slate-400 block">{stock.symbol}</span>
                </div>
                <div className="p-1.5 rounded bg-black/20">
                  {stock.diff > 0 ? (
                    <TrendingUp size={18} className="text-red-400" />
                  ) : stock.diff < 0 ? (
                    <TrendingDown size={18} className="text-green-400" />
                  ) : (
                    <Minus size={18} className="text-slate-500" />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{stock.endWeight > 0 ? stock.endWeight.toFixed(2) : '0.00'}</span>
                  <span className="text-sm text-slate-400">%</span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">權重變化</span>
                  <span className={`text-sm font-bold ${stock.diff > 0 ? 'text-red-400' : stock.diff < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {stock.diff > 0 ? '+' : ''}{stock.diff.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">最新張數</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {stock.endShares ? Math.round(stock.endShares / 1000).toLocaleString() : '--'} 張
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-400">張數異動</span>
                  <span className={`text-xs font-bold ${stock.sharesDiff > 0 ? 'text-red-400' : stock.sharesDiff < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {stock.sharesDiff > 0 ? '+' : ''}{stock.sharesDiff ? Math.round(stock.sharesDiff / 1000).toLocaleString() : '--'} 張
                  </span>
                </div>
              </div>
              
              {stock.startWeight === 0 && stock.endWeight > 0 && (
                <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-lg">
                  新進榜
                </div>
              )}
              {stock.startWeight > 0 && stock.endWeight === 0 && (
                <div className="absolute top-0 right-0 bg-green-600/80 text-white text-[10px] font-bold w-full text-center py-0.5">
                  已剔除 / 跌出榜外
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <footer className="mt-12 text-center text-xs text-slate-600 pb-8">
        數據由自動化腳本每日同步。基準日：{endDate || '讀取中...'}
      </footer>
    </div>
  );
}