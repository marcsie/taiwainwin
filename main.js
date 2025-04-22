/* main.js  ── ©2025 依你的需求撰寫 */
/* -------------------------------------------------- */
/* HTML 前置要求：
   1. index.html 已載入 Chart.js 3.x
   2. 〈今日摘要〉區塊 class / id 與原範例一致
   3. 在 header 或 today-summary 上方，手動加一段：
      <div class="range-control">
        <label>顯示天數：</label>
        <input id="daysInput" type="number" value="7" min="1" max="365" />
        <button id="applyBtn">套用</button>
      </div>
*/

const SUMMARY_URL      = 'data/summary.json';  // 全部摘要
const DETAIL_BASE_URL  = 'data/detail/';       // 詳細事件資料夾
let   summaryDataObj   = {};                   // {日期字串: 資料物件}
let   daysToShow       = 7;                    // 預設顯示 7 天
let   chartInstance    = null;

/* ---------- 初始化 ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadSummary();     // 讀 summary.json
  bindRangeControl();      // 綁定「顯示天數」輸入框
  renderAll();             // 首次渲染
});

/* ---------- 資料讀取 ---------- */
async function loadSummary () {
  const res = await fetch(SUMMARY_URL);
  if (!res.ok) throw new Error('無法載入 summary.json');
  summaryDataObj = await res.json();
}

/* ---------- UI 綁定 ---------- */
function bindRangeControl () {
  const inp  = document.getElementById('daysInput');
  const btn  = document.getElementById('applyBtn');
  if (!inp || !btn) return;
  btn.addEventListener('click', () => {
    daysToShow = Math.max(1, parseInt(inp.value, 10) || 7);
    renderAll();
  });
}

/* ---------- 主渲染 ---------- */
function renderAll () {
  const rangeData = getLatestRange(); // 取得最近 N 天資料陣列
  renderTodaySummary(rangeData.at(-1));  // 今日摘要
  renderWeekList(rangeData);             // 動態列表
  renderChart(rangeData);                // 趨勢圖
  loadDetail(rangeData.at(-1).date);     // 今日詳細事件
}

/* 取得最近 N 天資料（由舊到新排序） */
function getLatestRange () {
  const dates = Object.keys(summaryDataObj).sort();      // 升冪
  const slice = dates.slice(-daysToShow);
  return slice.map(date => ({ date, ...summaryDataObj[date] }));
}

/* ---------- 1. 今日摘要 ---------- */
function renderTodaySummary (today) {
  /* (a) 顯示日期 */
  const d        = new Date(today.date);
  const dateText = `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日 星期${'日一二三四五六'[d.getDay()]}`;
  document.querySelector('.date').textContent = dateText;

  /* (b) 總數 */
  const total = today['共機數量'] + today['共艦數量'] + today['公務船數量'] + today['氣球數量'];
  document.querySelector('.total-count').textContent = total;

  /* (c) 四大細項（艦 / 機 / 船 / 氣球） */
  const nums = [
    today['共艦數量'],
    today['共機數量'],
    today['公務船數量'],
    today['氣球數量']
  ];
  document.querySelectorAll('.detail-item p').forEach((p, i) => p.textContent = nums[i]);

  /* (d) 軍機軍艦動態內文文字段落 */
  let para = document.getElementById('dailyNarrative');
  if (!para) {
    para = document.createElement('p');
    para.id = 'dailyNarrative';
    para.style.cssText = 'margin-top:8px;font-size:14px;opacity:.8;';
    document.querySelector('.today-summary').appendChild(para);
  }
  para.textContent = today['軍機軍艦動態內文'];
}

/* ---------- 2. 過去 N 日列表 ---------- */
function renderWeekList (rangeData) {
  const wrap = document.querySelector('.weekly-forecast');
  /* 移除既有 .day-row */
  wrap.querySelectorAll('.day-row').forEach(row => row.remove());

  rangeData.slice().reverse().forEach((d, idx) => {
    const rowDate = new Date(d.date);
    const name = idx === 0 ? '今天' :
                 idx === 1 ? '昨日' :
                 `${rowDate.getMonth()+1}月${rowDate.getDate()}日`;

    const total = d['共機數量'] + d['共艦數量'] + d['公務船數量'] + d['氣球數量'];
    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `
      <div class="day-name">${name}</div>
      <div class="day-icon">⚠️</div>
      <div class="day-count">${total}</div>
    `;
    /* 點擊某日 → 讀取該日詳細事件 */
    row.addEventListener('click', () => loadDetail(d.date));
    wrap.appendChild(row);
  });
}

/* ---------- 3. 趨勢圖 (Chart.js) ---------- */
function renderChart (rangeData) {
  const labels = rangeData.map(d => d.date.slice(5).replace('-', '/'));
  const conf = [
    { lbl: '軍艦',  key: '共艦數量',   border: '#ff3b30', bg: 'rgba(255,59,48,.6)' },
    { lbl: '軍機',  key: '共機數量',   border: '#1e90ff', bg: 'rgba(30,144,255,.6)' },
    { lbl: '公務船',key: '公務船數量', bg: '#ffcc00',     bg2:'rgba(255,204,0,.6)' },
    { lbl: '氣球',  key: '氣球數量',   border: '#34c759', bg: 'rgba(52,199,89,.6)' }
  ].map(c => ({
    label: c.lbl,
    data:  rangeData.map(d => d[c.key]),
    borderColor: c.border,
    backgroundColor: c.bg || c.bg2,
    tension: 0.4,
    pointRadius: 3,
    borderWidth: 2,
    fill: true
  }));

  if (!chartInstance) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: conf },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, stacked: true } },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    /* 分類 Tab 互動（沿用原樣式） */
    document.querySelectorAll('.category-tab').forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (idx === 0) {              // 全部
          chartInstance.data.datasets.forEach(ds => ds.hidden = false);
          chartInstance.options.scales.y.stacked = true;
        } else {                      // 單一類別
          chartInstance.data.datasets.forEach((ds, i) => ds.hidden = i !== idx - 1);
          chartInstance.options.scales.y.stacked = false;
        }
        chartInstance.update();
      });
    });
  } else {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets.forEach((ds, i) => ds.data = conf[i].data);
    chartInstance.update();
  }
}

/* ---------- 4. 讀取並渲染詳細事件 ---------- */
async function loadDetail (dateStr) {
  const section = document.querySelector('.details-section');
  /* 清掉舊內容，只保留標題 */
  section.querySelectorAll('.detail-row').forEach(r => r.remove());

  try {
    const res = await fetch(`${DETAIL_BASE_URL}${dateStr}.json`);
    if (!res.ok) throw new Error('找不到詳細事件');
    const detailArr = await res.json();

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
