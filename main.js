// main.js
const SUMMARY_URL    = 'data/summary.json';
const DETAIL_ALL_URL = 'data/detail/detail_all.json';
let summaryDataObj   = {};
const daysToShow     = 7;

// 啟動流程
document.addEventListener('DOMContentLoaded', async () => {
  await loadSummary();
  renderAll();
});

// 讀取 summary.json
async function loadSummary() {
  const res = await fetch(SUMMARY_URL);
  if (!res.ok) throw new Error('無法載入 summary.json');
  summaryDataObj = await res.json();
}

// 一次渲染所有區塊
function renderAll() {
  const allDates = Object.keys(summaryDataObj).sort();

  // 1. 今日摘要 + 清單 + 詳細
  const rangeData = allDates.slice(-daysToShow)
    .map(d => ({ date: d, ...summaryDataObj[d] }));
  renderTodaySummary(rangeData.at(-1));
  renderWeekList(rangeData);
  loadDetail(rangeData.at(-1).date);

  // 2. 過去 7 日 趨勢圖 + 總列表
  const last7 = allDates.slice(-7).map(d => ({ date: d, ...summaryDataObj[d] }));
  initTrendChart(0, 'trendChart7', last7);
  renderTotalList7Days(last7);

  // 3. 過去 30 日 趨勢圖
  const last30 = allDates.slice(-30).map(d => ({ date: d, ...summaryDataObj[d] }));
  initTrendChart(1, 'trendChart30', last30);
}

// ---------- 1. 今日摘要 ----------
function renderTodaySummary(today) {
  document.querySelector('.today-title').textContent     = '最新報告時間';
  document.querySelector('.report-interval').textContent = today['報告時間區間'];

  const total = today['共機數量']
              + today['共艦數量']
              + today['公務船數量']
              + today['氣球數量'];
  document.querySelector('.total-count').textContent     = '總架次 ' + total;

  const nums = [
    today['共機數量'],
    today['共艦數量'],
    today['公務船數量'],
    today['氣球數量']
  ];
  document.querySelectorAll('.detail-item p').forEach((p, i) => {
    p.textContent = nums[i];
  });

  let para = document.getElementById('dailyNarrative');
  if (!para) {
    para = document.createElement('p');
    para.id = 'dailyNarrative';
    para.style.cssText = 'margin-top:8px;font-size:14px;opacity:.8;';
    document.querySelector('.today-summary').appendChild(para);
  }
  para.textContent = today['軍機軍艦動態內文'];
}

// ---------- 2. 過去 N 日列表 ----------
function renderWeekList(rangeData) {
  const wrap = document.querySelector('.weekly-forecast');
  wrap.querySelectorAll('.day-row').forEach(r => r.remove());
  rangeData.slice().reverse().forEach((d, idx) => {
    const row = document.createElement('div');
    row.className = 'day-row';
    const name = idx === 0 ? '今天'
               : idx === 1 ? '昨日'
               : d.date.slice(5).replace('-', '/');
    const total = d['共機數量']
                + d['共艦數量']
                + d['公務船數量']
                + d['氣球數量'];
    row.innerHTML = `
      <div class="day-name">${name}</div>
      <div class="day-icon">⚠️</div>
      <div class="day-count">${total}</div>`;
    row.addEventListener('click', () => loadDetail(d.date));
    wrap.appendChild(row);
  });
}

// ---------- 3. 詳細動態載入（前一天 + 無資料顯示提示） ----------
async function loadDetail(dateStr) {
  const section = document.querySelector('.details-section');
  // 清掉舊內容
  section.querySelector('.details-interval').textContent = '';
  section.querySelectorAll('.detail-row, .detail-empty').forEach(r => r.remove());

  // 1) 顯示對應的報告時間區間
  const interval = summaryDataObj[dateStr]?.['報告時間區間'] || '';
  section.querySelector('.details-interval').textContent = interval;

  // 2) 計算「前一天」的日期字串
  const dt = new Date(dateStr);
  dt.setDate(dt.getDate() - 1);
  const detailDateStr = dt.toISOString().slice(0, 10);  // 'YYYY-MM-DD'

  try {
    const res = await fetch(DETAIL_ALL_URL);
    if (!res.ok) throw new Error('讀取 detail_all.json 失敗');
    const allDetail = await res.json();

    // 過濾出「報告日期」=== 前一天
    const detailArr = allDetail.filter(it => it['報告日期'] === detailDateStr);

    if (detailArr.length === 0) {
      // 無資料時，顯示提示文字
      const empty = document.createElement('div');
      empty.className = 'detail-empty';
      empty.textContent = '此日期時段無詳細動態';
      section.appendChild(empty);
    } else {
      // 有資料才逐項渲染
      detailArr.forEach(item => {
        const row = document.createElement('div');
        row.className = 'detail-row';
        row.innerHTML = `
          <div class="detail-time">項次：${item['項次']}　時間區段：${item['時間區段']}</div>
          <div class="detail-info">${item['內容']}</div>`;
        section.appendChild(row);
      });
    }
  } catch (err) {
    console.warn(err.message);
    // 發生錯誤也顯示提示
    const empty = document.createElement('div');
    empty.className = 'detail-empty';
    empty.textContent = '此日期時段無詳細動態';
    section.appendChild(empty);
  }
}

// ---------- 4. 通用趨勢圖函式 ----------
function initTrendChart(index, canvasId, rangeData) {
  const block = document.querySelectorAll('.trend-chart')[index];
  if (!block) return;

  const labels = rangeData.map(d => {
    const dt = new Date(d.date);
    dt.setDate(dt.getDate() - 1);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  });

  // 調整順序：軍機 → 軍艦 → 公務船 → 氣球
  const confs = [
    { lbl:'軍機',  key:'共機數量',   border:'#1e90ff', bg:'rgba(30,144,255,0.6)' },
    { lbl:'軍艦',  key:'共艦數量',   border:'#ff3b30', bg:'rgba(255,59,48,0.6)' },
    { lbl:'公務船',key:'公務船數量', border:'#ffcc00', bg:'rgba(255,204,0,0.6)' },
    { lbl:'氣球',  key:'氣球數量',   border:'#34c759', bg:'rgba(52,199,89,0.6)' }
  ];

  const datasets = confs.map((c, i) => ({
    label: c.lbl,
    data:  rangeData.map(d => d[c.key]),
    borderColor: c.border,
    backgroundColor: c.bg,
    tension: 0.4,
    pointRadius: index === 1 ? 0 : 2,
    borderWidth: 2,
    fill: true
  }));

  const ctx = document.getElementById(canvasId).getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      plugins: { legend:{ display:false } },
      scales: {
        y: {
          beginAtZero: true,
          stacked: true,
          ticks: {
            stepSize: 1,
            callback: v => Number.isInteger(v) ? v : ''
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });

  block.querySelectorAll('.category-tab').forEach((tab, tabIdx) => {
    tab.addEventListener('click', () => {
      block.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (tabIdx === 0) {
        // 全部
        chart.data.datasets.forEach(ds => ds.hidden = false);
        chart.options.scales.y.stacked = true;
      } else {
        // 個別
        chart.data.datasets.forEach((ds, dsIdx) => {
          ds.hidden = dsIdx !== tabIdx;
        });
        chart.options.scales.y.stacked = false;
      }

      chart.update();
    });
  });

  const tabs = block.querySelectorAll('.category-tab');
  if (tabs[0]) tabs[0].click();
}

// ---------- 5. 近 7 日總架次數量列表 ----------
function renderTotalList7Days(rangeData) {
  const wrap = document.getElementById('totalList7');
  if (!wrap) return;

  wrap.querySelectorAll('.day-row').forEach(r => r.remove());

  const totals = rangeData.map(d =>
    d['共機數量'] + d['共艦數量'] + d['公務船數量'] + d['氣球數量']
  );
  const deltas = totals.map((t, i) =>
    i === 0 ? null : t - totals[i - 1]
  );

  rangeData.slice().reverse().forEach((d, ridx) => {
    const ascIdx = totals.length - 1 - ridx;
    const total = totals[ascIdx];
    const delta = deltas[ascIdx];

    const dt = new Date(d.date);
    dt.setDate(dt.getDate() - 1);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const name = `${mm}/${dd}`;

    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `
      <div class="day-name">${name}</div>
      <div class="day-count">${total}</div>
      <div class="day-delta">${
        delta === null
          ? '-'
          : delta > 0
            ? `<span class="delta-up">+${delta}</span>`
            : delta < 0
              ? `<span class="delta-down">${delta}</span>`
              : '0'
      }</div>`;
    wrap.appendChild(row);
  });
}
