// main.js
const SUMMARY_URL    = 'data/summary.json';
const DETAIL_ALL_URL = 'data/detail/detail_all.json';
let summaryDataObj   = {};
const daysToShow       = 7;

// 啟動流程
document.addEventListener('DOMContentLoaded', async () => {
  await loadSummary();
  // bindRangeControl();  // 暫時關閉
  renderAll();
});

// 讀取 summary.json
async function loadSummary() {
  const res = await fetch(SUMMARY_URL);
  if (!res.ok) throw new Error('無法載入 summary.json');
  summaryDataObj = await res.json();
}

/*
// 綁定「顯示天數」控制器
function bindRangeControl() {
  const inp = document.getElementById('daysInput');
  const btn = document.getElementById('applyBtn');
  if (!inp || !btn) return;
  btn.addEventListener('click', () => {
    daysToShow = Math.max(1, parseInt(inp.value, 10) || 7);
    renderAll();
  });
}
*/

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
    today['共艦數量'],
    today['共機數量'],
    today['公務船數量'],
    today['氣球數量']
  ];
  document.querySelectorAll('.detail-item p').forEach((p, i) => {
    p.textContent = nums[i];
  });

  // 段落：軍機軍艦動態內文
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

// ---------- 3. 詳細動態載入 ----------
async function loadDetail(dateStr) {
  const section = document.querySelector('.details-section');
  section.querySelectorAll('.detail-row').forEach(r => r.remove());

  try {
    const res = await fetch(DETAIL_ALL_URL);
    if (!res.ok) throw new Error('讀取 detail_all.json 失敗');
    const allDetail = await res.json();
    const detailArr = allDetail.filter(it => it['報告日期'] === dateStr);

    detailArr.forEach(item => {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.innerHTML = `
        <div class="detail-time">${item['時間區段']}</div>
        <div class="detail-info">
          <span class="notification-dot"></span>${item['內容']}
        </div>`;
      section.appendChild(row);
    });
    section.querySelector('.details-title').textContent = `詳細動態 (${dateStr})`;
  } catch (err) {
    section.querySelector('.details-title').textContent = `詳細動態 (${dateStr})`;
    console.warn(err.message);
  }
}

// ---------- 4. 通用趨勢圖函式 ----------
function initTrendChart(index, canvasId, rangeData) {
  const block = document.querySelectorAll('.trend-chart')[index];
  if (!block) return;

  // ◀── 這裡替換 labels 的計算 ──▶
  const labels = rangeData.map(d => {
    const dt = new Date(d.date);
    dt.setDate(dt.getDate() - 1);  // 公告日前一天
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  });

  const confs = [
    { lbl:'軍艦',  key:'共艦數量',   border:'#ff3b30', bg:'rgba(255,59,48,0.6)' },
    { lbl:'軍機',  key:'共機數量',   border:'#1e90ff', bg:'rgba(30,144,255,0.6)' },
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
            callback: v => Number.isInteger(v)? v : ''
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
  // 綁定分類 Tab
  block.querySelectorAll('.category-tab').forEach((tab, tabIdx) => {
    tab.addEventListener('click', () => {
      block.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tabIdx === 0) {
        chart.data.datasets.forEach(ds => ds.hidden = false);
        chart.options.scales.y.stacked = true;
      } else {
        chart.data.datasets.forEach((ds, dsIdx) => ds.hidden = dsIdx !== (tabIdx - 1));
        chart.options.scales.y.stacked = false;
      }
      chart.update();
    });
  });

  // 初始觸發「全部」
  const tabs = block.querySelectorAll('.category-tab');
  if (tabs[0]) tabs[0].click();
}

  // ---------- 5. 近 7 日總架次數量列表（公告前一天日期） ----------
  function renderTotalList7Days(rangeData) {
    const wrap = document.getElementById('totalList7');
    if (!wrap) return;
  
    // 清除舊內容
    wrap.querySelectorAll('.day-row').forEach(r => r.remove());
  
    // 倒序：最新公告在最上面
    rangeData.slice().reverse().forEach(d => {
      // 先把公告日期字串轉 Date，再減一天
      const dt = new Date(d.date);
      dt.setDate(dt.getDate() - 1);
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const name = `${mm}/${dd}`;
  
      // 計算總架次
      const total = d['共機數量']
                  + d['共艦數量']
                  + d['公務船數量']
                  + d['氣球數量'];
  
      // 建立一行
      const row = document.createElement('div');
      row.className = 'day-row';
      row.innerHTML = `
        <div class="day-name">${name}</div>
        <div class="day-icon">⚠️</div>
        <div class="day-count">${total}</div>`;
      wrap.appendChild(row);
    });
}
