import pandas as pd, json, pathlib

RAW_DIR      = pathlib.Path('raw')
OUT_SUMMARY  = pathlib.Path('data/summary.json')
OUT_DETAIL   = pathlib.Path('data/detail')

# ---------- 1. 讀每日總表 ----------
df_sum = pd.read_csv(RAW_DIR / 'taiwaiwin-data.csv')

# ▲▲▲ 新增這兩行：把數值欄 NaN → 0，再轉 int ▲▲▲
num_cols = ['共機數量', '共艦數量', '公務船數量', '氣球數量', '逾越中線數量']
df_sum[num_cols] = df_sum[num_cols].fillna(0).astype(int)

summary = {}
for _, r in df_sum.iterrows():
    d = str(r['公告日期西元'])
    summary[d] = {
        '報告時間區間':      r['報告時間區間'],
        '軍機軍艦動態內文':  r['軍機軍艦動態內文'],
        '共機數量':   int(r['共機數量']),
        '共艦數量':   int(r['共艦數量']),
        '公務船數量': int(r['公務船數量']),
        '氣球數量':   int(r['氣球數量']),
        '逾越中線數量': int(r['逾越中線數量'])
    }

OUT_SUMMARY.parent.mkdir(parents=True, exist_ok=True)
json.dump(dict(sorted(summary.items())),
          OUT_SUMMARY.open('w', encoding='utf-8'),
          ensure_ascii=False, indent=2)

# ---------- 2. 讀當日細節（保持不變） ----------
df_det = pd.read_csv(RAW_DIR / 'taiwanwin-daily-detail-events.csv')
if not df_det.empty:
    day = str(df_det.iloc[0]['報告日期'])
    OUT_DETAIL.mkdir(parents=True, exist_ok=True)
    df_det.to_json(OUT_DETAIL / f'{day}.json',
                   orient='records', force_ascii=False, indent=2)
