import json
import os
import io
import re
from datetime import datetime
import requests
import pandas as pd

# 設定 JSON 存檔路徑
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data.json')
# 統一投信 00981A 網頁 (Excel 直連下載端點)
URL = 'https://www.ezmoney.com.tw/ETF/Fund/AssetExcelNPOI?fundCode=49YTW'

def fetch_holdings_from_excel():
    """
    下載 00981A 投資組合 Excel 並解析資料
    """
    print(f"🔄 開始下載並解析 00981A 最新持股 Excel...")
    print(f"🌐 目標網址: {URL}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        excel_data = io.BytesIO(response.content)
        df = pd.read_excel(excel_data, header=None)
        
        data_date_str = datetime.now().strftime('%Y-%m-%d')
        header_idx = -1
        
        for idx, row in df.iterrows():
            cell_val = str(row[0]).strip()
            
            if '資料日期' in cell_val:
                match = re.search(r'(\d{3})/(\d{2})/(\d{2})', cell_val)
                if match:
                    yy, mm, dd = match.groups()
                    data_date_str = f"{int(yy) + 1911}-{mm}-{dd}"
                    print(f"📅 成功解析檔案內的真實資料日期: {data_date_str}")
            
            if '股票代號' in cell_val:
                header_idx = idx
                break
                
        if header_idx == -1:
            print(f"⚠️ 警告：無法在 Excel 檔案中找到「股票代號」欄位。")
            return None, []

        print("✅ 成功定位表格欄位，開始讀取持股數據 (包含股數)...")
        today_data = []
        
        for idx in range(header_idx + 1, len(df)):
            row = df.iloc[idx]
            symbol = str(row[0]).strip()
            name = str(row[1]).strip()
            shares_str = str(row[2]).strip()  # <--- 新增：讀取第三欄的股數
            weight_str = str(row[3]).strip()
            
            if pd.isna(symbol) or symbol == 'nan' or not any(c.isdigit() for c in symbol):
                continue
                
            try:
                # 處理股數 (如 "5,428,000" 去除逗號並轉為整數)
                shares_clean = re.sub(r'[^\d]', '', shares_str)
                shares = int(shares_clean) if shares_clean else 0
                
                # 處理權重
                weight_clean = re.sub(r'[^\d.]', '', weight_str)
                weight = float(weight_clean)
                
                today_data.append({
                    "symbol": symbol,
                    "name": name,
                    "shares": shares,  # <--- 新增：將股數寫入字典
                    "weight": weight
                })
            except ValueError:
                continue
                
        today_data.sort(key=lambda x: x['weight'], reverse=True)
        return data_date_str, today_data

    except Exception as e:
        print(f"❌ 抓取或解析過程發生錯誤: {e}")
        return None, []

def update_json_data(data_date_str, today_data):
    """
    將最新資料寫入 JSON 並按提取到的日期歸檔
    """
    historical_data = {}
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                historical_data = json.load(f)
            except json.JSONDecodeError:
                pass

    historical_data[data_date_str] = today_data
    print(f"✅ 成功獲取 {len(today_data)} 檔成分股資料")

    sorted_dates = sorted(historical_data.keys(), reverse=True)
    if len(sorted_dates) > 60:
        for old_date in sorted_dates[60:]:
            del historical_data[old_date]

    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(historical_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 資料已成功儲存至 {DATA_FILE} (歸檔日期: {data_date_str})")

def main():
    data_date_str, holdings = fetch_holdings_from_excel()
    if holdings:
        update_json_data(data_date_str, holdings)
    else:
        print("🛑 資料更新中止。")

if __name__ == "__main__":
    main()