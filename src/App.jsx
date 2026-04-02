import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Filter, ArrowRightLeft, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [historicalData, setHistoricalData] = useState({});
  const [dates, setDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('weight-desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const cacheBuster = `t=${Date.now()}`;
        const dataPath = `data.json?${cacheBuster}`;
        
        const res = await fetch(dataPath);
        if (!res.ok) {
          throw new Error(`無法讀取 data.json (HTTP ${res.status})。請確認檔案是否存在。`);
        }
        
        const data = await res.json();
        
        if (!data || Object.keys(data).length === 0) {
          throw new Error('data.json 內容為空，尚未包含任何持股紀錄。');
        }
        
        setHistoricalData(data);
        // 確保日期排序為最新到最舊
        const availableDates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
        setDates(availableDates);
        
        if (availableDates.length > 0) {
          setEndDate(availableDates[0]); // 最新日期作為比較目標
          setStartDate(availableDates.length > 1 ? availableDates[1] : availableDates[0]); // 次新日期作為基準
        }
      } catch (err) {
        console.error('[Data Fetch Error]:', err);
        setErrorMsg(err.message || '發生未知錯誤');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoldings();
  }, []);

  const holdingsDiff = useMemo(() => {
    if (!startDate || !endDate || !historicalData || Object.keys(historicalData).length === 0) return [];

    const startData = historicalData[startDate] || [];
    const endData = historicalData[endDate] || [];
    const map = new Map();

    // 處理基準日資料
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

    // 處理目標日資料比對
    endData.forEach(item => {
      if (map.has(item.symbol)) {
        const existing = map.get(item.symbol);
        existing.endWeight = item.weight || 0;
        // 避免浮點數精準度問題，先乘 100 取整再除 100
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

    // 排序邏輯
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

  // 判斷日期是否反轉 (基準日比目標日晚)
  const isDateReversed = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(startDate) > new Date(endDate);
  }, [startDate, endDate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="animate-pulse tracking-widest text-sm">正在載入戰情資料...</p>
      </div>
    );
  }

  if (dates.length === 0 || errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">讀取資料異常</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            系統無法讀取到有效的資料檔案。請確認資料是否存在或網路連線正常。
          </p>
          <div className="bg-black/30 p-4 rounded-lg text-left mb-6 font-mono text-xs text-red-400 overflow-x-auto">
            錯誤詳情: {errorMsg || 'No Data Found'}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            重新整理
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <header className="mb-6 border-b border-slate-800 pb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wider flex items-center gap-3">
              00981A <span className="text-blue-400">戰情面板</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">主動統一台股增長 ETF - 主要持股與張數變化監測</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              {/* 基準日選擇 */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium ml-1">比較基準 (舊)</span>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400" />
                  <select 
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  >
                    {dates.map(d => <option key={`start-${d}`} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-center text-slate-600 pt-5 hidden sm:flex">
                <ArrowRightLeft size={16} />
              </div>

              {/* 目標日選擇 */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-blue-400/70 font-medium ml-1">比較目標 (新)</span>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-slate-400" />
                  <select 
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  >
                    {dates.map(d => <option key={`end-${d}`} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            {/* 警告提示區塊 */}
            {isDateReversed && (
              <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                <AlertCircle size={14} />
                <span>注意：基準日晚於目標日，增減數值為反向顯示。</span>
              </div>
            )}
            {dates.length === 1 && (
              <div className="flex items-center gap-2 text-blue-400 text-xs bg-blue-500/10 p-2 rounded border border-blue-500/20">
                <Info size={14} />
                <span>目前僅有一日資料，暫無增減變化可供比較。</span>
              </div>
            )}
          </div>
        </div>
      </header>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {holdingsDiff.map((stock) => {
          const style = getCardStyle(stock.diff);
          const isRemoved = stock.startWeight > 0 && stock.endWeight === 0;
          const isNew = stock.startWeight === 0 && stock.endWeight > 0;
          
          return (
            <div 
              key={stock.symbol} 
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-1 ${style.bg} ${style.border} ${isRemoved ? 'opacity-75 grayscale-[30%]' : ''}`}
              style={style.style}
            >
              {/* 狀態標籤 (新進 / 剔除) */}
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

              <div className={`flex justify-between items-start mb-3 ${isRemoved ? 'mt-4' : ''}`}>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">{stock.name}</h3>
                  <span className="text-xs text-slate-400 block font-mono mt-0.5">{stock.symbol}</span>
                </div>
                <div className="p-1.5 rounded bg-black/30 backdrop-blur-sm">
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
            </div>
          );
        })}
      </div>
      
      <footer className="mt-12 text-center text-xs text-slate-500 pb-8 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        數據由自動化腳本每日同步。資料基準日：<span className="font-mono">{endDate || '讀取中...'}</span>
      </footer>
    </div>
  );
}