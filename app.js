// -----------------------------
// データ保持用
// -----------------------------
// 【変更】初期値から "全表示" を削除
let categories = ["パン類", "牛乳類", "包材"];
let items = []; 
// 【変更】初期選択はカテゴリの先頭にする
let currentCategory = categories[0] || "";

// 表示する日付範囲（前後15日）
const DAYS_RANGE = 15;

// -----------------------------
// 保存・読み込み
// -----------------------------
function saveData() {
  localStorage.setItem('orderData', JSON.stringify({categories, items}));
}

function loadData() {
  const data = localStorage.getItem('orderData');
  if (data) {
    const obj = JSON.parse(data);
    
    // 【変更】読み込んだデータに「全表示」が含まれていたら除外する
    let loadedCats = obj.categories || categories;
    categories = loadedCats.filter(c => c !== "全表示");
    
    items = obj.items || items;

    // 現在のカテゴリが存在しないものになっていたら、先頭にリセット
    if (!categories.includes(currentCategory) && categories.length > 0) {
      currentCategory = categories[0];
    }
  }
}

// -----------------------------
// 初期化
// -----------------------------
window.onload = () => {
  loadData(); 
  renderTabs();
  renderCategorySelect();
  renderTable();
};

// -----------------------------
// カテゴリ機能
// -----------------------------
function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  categories.forEach(cat => {
    const tab = document.createElement("div");
    tab.textContent = cat;
    tab.className = "tab" + (cat === currentCategory ? " active" : "");
    tab.onclick = () => {
      currentCategory = cat;
      renderTable();
      renderTabs();
    };
    tabs.appendChild(tab);
  });
}

function renderCategorySelect() {
  const sel = document.getElementById("categorySelect");
  sel.innerHTML = "";
  categories.forEach(cat => {
    // 【変更】"全表示"を除外する判定を削除（そもそもデータに入れないため）
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function addCategory() {
  const name = document.getElementById("newCategoryInput").value.trim();
  // 【変更】"全表示"禁止のチェックは不要になったので削除
  if (name && !categories.includes(name)) {
    categories.push(name);
    // 新規追加したカテゴリをすぐに選択状態にする
    currentCategory = name;
    
    renderTabs();
    renderCategorySelect();
    renderTable(); // テーブルも更新
    saveData();
  }
  document.getElementById("newCategoryInput").value = "";
}

function removeCategory() {
  const name = document.getElementById("newCategoryInput").value.trim();
  // 【変更】"全表示"削除禁止のチェックを削除
  if (name && categories.includes(name)) {
    categories = categories.filter(c => c !== name);
    items = items.filter(i => i.category !== name);
    
    // 削除後、カテゴリが残っていれば先頭を選択、なければ空に
    if (currentCategory === name) {
        currentCategory = categories.length > 0 ? categories[0] : "";
    }
    
    renderTabs();
    renderCategorySelect();
    renderTable();
    saveData();
  }
  document.getElementById("newCategoryInput").value = "";
}

// -----------------------------
// 品目機能（修正版：入力クリアバグ対策済み）
// -----------------------------
function addItem() {
  const nameInput = document.getElementById("newItemInput");
  const name = nameInput.value.trim();
  const catSelect = document.getElementById("categorySelect");
  const cat = catSelect.value;

  if (!name) return;

  // カテゴリがない場合のエラー処理
  if (!cat) {
    alert("エラー: カテゴリが存在しません。\n先にカテゴリを追加してください。");
    return;
  }

  items.push({ name, category: cat, records: {} });
  renderTable();
  saveData();
  
  // 成功時のみクリア
  nameInput.value = "";
}

// -----------------------------
// テーブル生成
// -----------------------------
function renderTable() {
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");
  head.innerHTML = "";
  body.innerHTML = "";

  // カテゴリがない、または選択されていない場合は何も表示しない
  if (!currentCategory) return;

  // 日付範囲
  const today = new Date();
  let dates = [];
  for (let d = -DAYS_RANGE; d <= DAYS_RANGE; d++) {
    let dt = new Date(today);
    dt.setDate(today.getDate() + d);
    dates.push(dt.toISOString().split("T")[0]);
  }

  // ヘッダー
  const trHead = document.createElement("tr");
  let thItem = document.createElement("th");
  thItem.textContent = "品目";
  thItem.className = "item-col";
  trHead.appendChild(thItem);
  dates.forEach(date => {
    let th = document.createElement("th");
    th.textContent = date.slice(5);
    trHead.appendChild(th);
  });
  head.appendChild(trHead);

  // ボディ
  items
    // 【変更】"全表示"判定を削除。単純にカテゴリ一致のみを見る
    .filter(i => i.category === currentCategory)
    .forEach(item => {
      const tr = document.createElement("tr");
      let tdItem = document.createElement("td");
      tdItem.className = "item-col";
      tdItem.innerHTML = `
        ${item.name}
        <br>
        <button onclick="removeItem('${item.name}')">削除</button>
      `;
      tr.appendChild(tdItem);

      dates.forEach(date => {
        const record = item.records[date] || { stock: "", order: "", days: 3, safety: 0 };
        const td = document.createElement("td");
            td.innerHTML = `
              在庫:
              <div class="number-control">
                <button onclick="changeValue('${item.name}','${date}','stock',-1)">-</button>
                <input type="number" value="${record.stock}" 
                  oninput="updateRecord('${item.name}','${date}','stock',this.value)">
                <button onclick="changeValue('${item.name}','${date}','stock',1)">+</button>
              </div>
              発注:
              <div class="number-control">
                <button onclick="changeValue('${item.name}','${date}','order',-1)">-</button>
                <input type="number" value="${record.order}" 
                  oninput="updateRecord('${item.name}','${date}','order',this.value)">
                <button onclick="changeValue('${item.name}','${date}','order',1)">+</button>
              </div>
              <br>
              日数:
              <div class="number-control">
                <button onclick="changeValue('${item.name}','${date}','days',-1)">-</button>
                <input type="number" value="${record.days}" 
                  oninput="updateRecord('${item.name}','${date}','days',this.value)">
                <button onclick="changeValue('${item.name}','${date}','days',1)">+</button>
              </div>
              安全:
              <div class="number-control">
                <button onclick="changeValue('${item.name}','${date}','safety',-1)">-</button>
                <input type="number" value="${record.safety}" 
                  oninput="updateRecord('${item.name}','${date}','safety',this.value)">
                <button onclick="changeValue('${item.name}','${date}','safety',1)">+</button>
              </div>
              <button class="calc-btn" onclick="calculateOrder('${item.name}','${date}')">計算</button>
            `;

        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
}

// -----------------------------
// レコード更新
// -----------------------------
function updateRecord(itemName, date, field, value) {
  let item = items.find(i => i.name === itemName);
  if (!item.records[date]) item.records[date] = { stock: "", order: "", days: 3, safety: 0 };
  item.records[date][field] = value ? Number(value) : "";
  saveData();
}

// -----------------------------
// 計算機能（修正済み）
// -----------------------------
function calculateOrder(itemName, date) {
  let item = items.find(i => i.name === itemName);
  const record = item.records[date];
  if (!record) return;

  const dates = Object.keys(item.records).sort();
  const idx = dates.indexOf(date);
  if (idx <= 0) return;
  const prevDate = dates[idx - 1];
  const prev = item.records[prevDate];

  if (prev && prev.stock !== "" && prev.order !== "" && record.stock !== "") {
    
    // 計算式: (前回在庫 + 前回発注) - 今回在庫
    const prevTotal = Number(prev.stock) + Number(prev.order);
    const used = prevTotal - Number(record.stock);

    const daysPassed = (new Date(date) - new Date(prevDate)) / (1000 * 60 * 60 * 24);
    
    if (daysPassed <= 0) return;

    const daily = used / daysPassed;
    const need = daily * record.days + record.safety;
    record.order = Math.max(Math.round(need), 0);
    
    renderTable();
    saveData();
  }
}

// -----------------------------
// 一括変更（日数）
// -----------------------------
function applyBulkDays() {
  const bulkDate = document.getElementById("bulkDateInput").value;
  const bulkDays = Number(document.getElementById("bulkDaysInput").value);
  if (!bulkDate || !bulkDays) return;

  items.forEach(item => {
    if (!item.records[bulkDate]) item.records[bulkDate] = { stock: "", order: "", days: 3, safety: 0 };
    item.records[bulkDate].days = bulkDays;
  });

  renderTable();
  saveData();
}


// -----------------------------
// + / - ボタンで増減
// -----------------------------
function changeValue(itemName, date, field, delta) {
  let item = items.find(i => i.name === itemName);
  if (!item.records[date]) item.records[date] = { stock: "", order: "", days: 3, safety: 0 };
  item.records[date][field] = (Number(item.records[date][field]) || 0) + delta;
  renderTable();
  saveData();
}

function removeItem(name) {
  if (!name) return;
  items = items.filter(i => i.name !== name);
  renderTable();
  saveData();
}
