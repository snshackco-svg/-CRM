// Global Search Bar Component with Advanced Filters
// グローバル検索バー（高度フィルター対応）

let searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
let savedSearches = JSON.parse(localStorage.getItem('saved_searches') || '[]');
let currentSearchResults = [];
let searchDebounceTimer = null;

// レンダリング関数
function renderSearchBar() {
  return `
    <div class="w-full max-w-4xl mx-auto">
      <div class="relative">
        <!-- メイン検索入力 -->
        <div class="flex items-center gap-2 mb-2">
          <div class="relative flex-1">
            <input 
              type="text" 
              id="global-search-input"
              class="w-full px-4 py-3 pl-12 pr-32 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
              placeholder="会社名、担当者、業界、タグで検索... (例: IT企業, 佐藤, ホットリード)"
              onkeyup="handleGlobalSearch(event)"
            />
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            
            <!-- 検索ボタングループ -->
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button 
                onclick="toggleAdvancedFilters()"
                class="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition"
                title="高度なフィルター"
              >
                <i class="fas fa-filter"></i>
              </button>
              <button 
                onclick="clearSearch()"
                class="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg transition"
                title="クリア"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- エクスポートボタン -->
          <button 
            onclick="exportSearchResults()"
            id="export-btn"
            class="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition disabled:opacity-50"
            disabled
            title="検索結果をCSVでエクスポート"
          >
            <i class="fas fa-file-export mr-2"></i>エクスポート
          </button>
        </div>

        <!-- 検索サジェスト・履歴ドロップダウン -->
        <div 
          id="search-dropdown" 
          class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-50 hidden max-h-96 overflow-y-auto"
        >
          <!-- 検索結果・履歴がここに表示される -->
        </div>
      </div>

      <!-- アクティブフィルター表示 -->
      <div id="active-filters-display" class="flex flex-wrap gap-2 mt-2 hidden">
        <!-- アクティブなフィルターバッジがここに表示される -->
      </div>

      <!-- 保存済み検索クイックアクセス -->
      <div id="saved-searches-quick" class="flex flex-wrap gap-2 mt-3 hidden">
        <!-- 保存済み検索のクイックアクセスボタンがここに表示される -->
      </div>
    </div>

    <!-- 高度フィルターモーダル -->
    <div id="advanced-filters-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-sliders-h mr-2 text-indigo-600"></i>高度な検索フィルター
            </h2>
            <button onclick="toggleAdvancedFilters()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>

          <form id="advanced-filter-form" class="space-y-6">
            <!-- 基本検索 -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-search mr-2"></i>キーワード検索
              </label>
              <input 
                type="text" 
                id="filter-keyword"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="会社名、担当者名、メモなど"
              />
            </div>

            <!-- ステータスフィルター -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-flag mr-2"></i>ステータス
              </label>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="not_qualified" class="rounded"/>
                  <span class="text-sm">見込み外</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="qualified" class="rounded"/>
                  <span class="text-sm">見込み化</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="negotiating" class="rounded"/>
                  <span class="text-sm">商談中</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="contracted" class="rounded"/>
                  <span class="text-sm">契約済み</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="paid" class="rounded"/>
                  <span class="text-sm">入金済み</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="status" value="partnership" class="rounded"/>
                  <span class="text-sm">協業先</span>
                </label>
              </div>
            </div>

            <!-- 優先度フィルター -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-exclamation-circle mr-2"></i>優先度
              </label>
              <div class="flex gap-3">
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="priority" value="urgent" class="rounded"/>
                  <span class="text-sm text-red-600 font-semibold">緊急</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="priority" value="high" class="rounded"/>
                  <span class="text-sm text-orange-600 font-semibold">高</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="priority" value="medium" class="rounded"/>
                  <span class="text-sm text-yellow-600">中</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" name="priority" value="low" class="rounded"/>
                  <span class="text-sm text-green-600">低</span>
                </label>
              </div>
            </div>

            <!-- 金額範囲 -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-yen-sign mr-2"></i>予想金額範囲
              </label>
              <div class="grid grid-cols-2 gap-3">
                <input 
                  type="number" 
                  id="filter-amount-min"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="最小金額（円）"
                  min="0"
                  step="10000"
                />
                <input 
                  type="number" 
                  id="filter-amount-max"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="最大金額（円）"
                  min="0"
                  step="10000"
                />
              </div>
            </div>

            <!-- 日付範囲 -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-calendar-alt mr-2"></i>更新日範囲
              </label>
              <div class="grid grid-cols-2 gap-3">
                <input 
                  type="date" 
                  id="filter-date-start"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input 
                  type="date" 
                  id="filter-date-end"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <!-- タグフィルター -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-tags mr-2"></i>タグ
              </label>
              <input 
                type="text" 
                id="filter-tags"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="タグをカンマ区切りで入力 (例: ホットリード, IT企業)"
              />
            </div>

            <!-- アクションボタン -->
            <div class="flex gap-3 pt-4 border-t">
              <button 
                type="button"
                onclick="applyAdvancedFilters()"
                class="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
              >
                <i class="fas fa-search mr-2"></i>検索実行
              </button>
              <button 
                type="button"
                onclick="saveCurrentSearch()"
                class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
                title="この検索条件を保存"
              >
                <i class="fas fa-bookmark mr-2"></i>保存
              </button>
              <button 
                type="button"
                onclick="resetAdvancedFilters()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-xl transition"
              >
                <i class="fas fa-undo mr-2"></i>リセット
              </button>
            </div>
          </form>

          <!-- 保存済み検索一覧 -->
          <div class="mt-8 pt-6 border-t">
            <h3 class="text-lg font-bold text-gray-800 mb-4">
              <i class="fas fa-bookmark mr-2 text-green-600"></i>保存済み検索
            </h3>
            <div id="saved-searches-list" class="space-y-2">
              <!-- 保存済み検索がここに表示される -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// グローバル検索ハンドラー（デバウンス付き）
function handleGlobalSearch(event) {
  const keyword = event.target.value.trim();
  
  // Enterキーで即座に検索
  if (event.key === 'Enter') {
    clearTimeout(searchDebounceTimer);
    performGlobalSearch(keyword);
    return;
  }
  
  // 300msのデバウンス
  clearTimeout(searchDebounceTimer);
  
  if (keyword.length === 0) {
    hideSearchDropdown();
    return;
  }
  
  if (keyword.length < 2) {
    showSearchHistory();
    return;
  }
  
  searchDebounceTimer = setTimeout(() => {
    performGlobalSearch(keyword);
  }, 300);
}

// グローバル検索実行
async function performGlobalSearch(keyword, filters = {}) {
  if (!keyword && Object.keys(filters).length === 0) return;
  
  try {
    const params = new URLSearchParams();
    if (keyword) params.append('q', keyword);
    
    // フィルター条件を追加
    if (filters.statuses && filters.statuses.length > 0) {
      params.append('statuses', filters.statuses.join(','));
    }
    if (filters.priorities && filters.priorities.length > 0) {
      params.append('priorities', filters.priorities.join(','));
    }
    if (filters.amountMin) params.append('amount_min', filters.amountMin);
    if (filters.amountMax) params.append('amount_max', filters.amountMax);
    if (filters.dateStart) params.append('date_start', filters.dateStart);
    if (filters.dateEnd) params.append('date_end', filters.dateEnd);
    if (filters.tags) params.append('tags', filters.tags);
    
    const response = await axios.get(`/api/sales-crm/search?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    
    currentSearchResults = response.data.results || [];
    
    // 検索履歴に追加
    if (keyword) {
      addToSearchHistory(keyword, filters);
    }
    
    // 結果表示
    showSearchResults(currentSearchResults, keyword);
    
    // エクスポートボタン有効化
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.disabled = currentSearchResults.length === 0;
    }
    
  } catch (error) {
    console.error('検索エラー:', error);
    showNotification('検索に失敗しました', 'error');
  }
}

// 検索結果表示
function showSearchResults(results, keyword) {
  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown) return;
  
  if (results.length === 0) {
    dropdown.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        <i class="fas fa-search text-3xl mb-2 text-gray-400"></i>
        <p>「${keyword}」に一致する結果が見つかりませんでした</p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }
  
  dropdown.innerHTML = `
    <div class="p-2">
      <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
        検索結果 (${results.length}件)
      </div>
      ${results.map(result => `
        <div 
          class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition"
          onclick="selectSearchResult(${result.id})"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="font-semibold text-gray-800">${escapeHtml(result.company_name)}</div>
              <div class="text-sm text-gray-600 mt-1">
                ${result.contact_person ? `<i class="fas fa-user mr-1"></i>${escapeHtml(result.contact_person)}` : ''}
                ${result.industry ? `<span class="mx-2">•</span><i class="fas fa-building mr-1"></i>${escapeHtml(result.industry)}` : ''}
              </div>
              ${result.tags ? `
                <div class="flex flex-wrap gap-1 mt-2">
                  ${result.tags.split(',').map(tag => `
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">${escapeHtml(tag.trim())}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div class="ml-4 text-right">
              <div class="text-sm font-semibold ${getStatusColor(result.status)}">${getStatusLabel(result.status)}</div>
              ${result.expected_value ? `<div class="text-xs text-gray-500 mt-1">¥${formatNumber(result.expected_value)}</div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  dropdown.classList.remove('hidden');
}

// 検索履歴表示
function showSearchHistory() {
  const dropdown = document.getElementById('search-dropdown');
  if (!dropdown || searchHistory.length === 0) return;
  
  dropdown.innerHTML = `
    <div class="p-2">
      <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b flex justify-between items-center">
        <span>最近の検索</span>
        <button onclick="clearSearchHistory()" class="text-red-500 hover:text-red-700 text-xs font-normal normal-case">
          <i class="fas fa-trash mr-1"></i>クリア
        </button>
      </div>
      ${searchHistory.slice(0, 10).map((item, index) => `
        <div 
          class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition flex items-center justify-between"
          onclick="applySearchHistory(${index})"
        >
          <div class="flex-1">
            <div class="text-sm text-gray-800">
              <i class="fas fa-history mr-2 text-gray-400"></i>${escapeHtml(item.keyword)}
            </div>
            ${item.filters && Object.keys(item.filters).length > 0 ? `
              <div class="text-xs text-gray-500 mt-1">
                フィルター: ${Object.keys(item.filters).length}件
              </div>
            ` : ''}
          </div>
          <div class="text-xs text-gray-400">${formatTimeAgo(item.timestamp)}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  dropdown.classList.remove('hidden');
}

// ドロップダウンを非表示
function hideSearchDropdown() {
  const dropdown = document.getElementById('search-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

// 検索結果選択
function selectSearchResult(prospectId) {
  hideSearchDropdown();
  currentProspect = prospects.find(p => p.id === prospectId);
  if (currentProspect) {
    switchView('prospect-detail');
  }
}

// 検索履歴適用
function applySearchHistory(index) {
  const item = searchHistory[index];
  if (!item) return;
  
  const input = document.getElementById('global-search-input');
  if (input) {
    input.value = item.keyword;
  }
  
  performGlobalSearch(item.keyword, item.filters || {});
}

// 検索履歴に追加
function addToSearchHistory(keyword, filters) {
  // 重複を削除
  searchHistory = searchHistory.filter(item => item.keyword !== keyword);
  
  // 先頭に追加
  searchHistory.unshift({
    keyword,
    filters,
    timestamp: new Date().toISOString()
  });
  
  // 最大20件まで保持
  if (searchHistory.length > 20) {
    searchHistory = searchHistory.slice(0, 20);
  }
  
  localStorage.setItem('search_history', JSON.stringify(searchHistory));
}

// 検索履歴クリア
function clearSearchHistory() {
  if (confirm('検索履歴をすべて削除しますか？')) {
    searchHistory = [];
    localStorage.removeItem('search_history');
    hideSearchDropdown();
    showNotification('検索履歴を削除しました', 'success');
  }
}

// 検索クリア
function clearSearch() {
  const input = document.getElementById('global-search-input');
  if (input) {
    input.value = '';
  }
  hideSearchDropdown();
  currentSearchResults = [];
  
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.disabled = true;
  }
  
  clearActiveFiltersDisplay();
}

// 高度フィルターモーダル切り替え
function toggleAdvancedFilters() {
  const modal = document.getElementById('advanced-filters-modal');
  if (!modal) return;
  
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    renderSavedSearchesList();
  } else {
    modal.classList.add('hidden');
  }
}

// 高度フィルター適用
function applyAdvancedFilters() {
  const keyword = document.getElementById('filter-keyword')?.value.trim() || '';
  
  const statuses = Array.from(document.querySelectorAll('input[name="status"]:checked'))
    .map(cb => cb.value);
  
  const priorities = Array.from(document.querySelectorAll('input[name="priority"]:checked'))
    .map(cb => cb.value);
  
  const amountMin = document.getElementById('filter-amount-min')?.value;
  const amountMax = document.getElementById('filter-amount-max')?.value;
  const dateStart = document.getElementById('filter-date-start')?.value;
  const dateEnd = document.getElementById('filter-date-end')?.value;
  const tags = document.getElementById('filter-tags')?.value.trim();
  
  const filters = {};
  if (statuses.length > 0) filters.statuses = statuses;
  if (priorities.length > 0) filters.priorities = priorities;
  if (amountMin) filters.amountMin = amountMin;
  if (amountMax) filters.amountMax = amountMax;
  if (dateStart) filters.dateStart = dateStart;
  if (dateEnd) filters.dateEnd = dateEnd;
  if (tags) filters.tags = tags;
  
  // メイン検索入力にキーワードをセット
  const mainInput = document.getElementById('global-search-input');
  if (mainInput) {
    mainInput.value = keyword;
  }
  
  // 検索実行
  performGlobalSearch(keyword, filters);
  
  // アクティブフィルター表示
  displayActiveFilters(filters);
  
  // モーダルを閉じる
  toggleAdvancedFilters();
}

// 高度フィルターリセット
function resetAdvancedFilters() {
  document.getElementById('filter-keyword').value = '';
  document.querySelectorAll('input[name="status"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="priority"]').forEach(cb => cb.checked = false);
  document.getElementById('filter-amount-min').value = '';
  document.getElementById('filter-amount-max').value = '';
  document.getElementById('filter-date-start').value = '';
  document.getElementById('filter-date-end').value = '';
  document.getElementById('filter-tags').value = '';
  
  clearActiveFiltersDisplay();
}

// アクティブフィルター表示
function displayActiveFilters(filters) {
  const container = document.getElementById('active-filters-display');
  if (!container) return;
  
  if (Object.keys(filters).length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  const badges = [];
  
  if (filters.statuses) {
    filters.statuses.forEach(status => {
      badges.push(`<span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">ステータス: ${getStatusLabel(status)}</span>`);
    });
  }
  
  if (filters.priorities) {
    filters.priorities.forEach(priority => {
      badges.push(`<span class="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">優先度: ${priority}</span>`);
    });
  }
  
  if (filters.amountMin || filters.amountMax) {
    const min = filters.amountMin ? `¥${formatNumber(filters.amountMin)}` : '下限なし';
    const max = filters.amountMax ? `¥${formatNumber(filters.amountMax)}` : '上限なし';
    badges.push(`<span class="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">金額: ${min} 〜 ${max}</span>`);
  }
  
  if (filters.dateStart || filters.dateEnd) {
    const start = filters.dateStart || '指定なし';
    const end = filters.dateEnd || '指定なし';
    badges.push(`<span class="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">期間: ${start} 〜 ${end}</span>`);
  }
  
  if (filters.tags) {
    badges.push(`<span class="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">タグ: ${filters.tags}</span>`);
  }
  
  container.innerHTML = `
    <span class="text-sm font-semibold text-gray-600">アクティブフィルター:</span>
    ${badges.join('')}
    <button onclick="clearActiveFilters()" class="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full hover:bg-red-200 transition">
      <i class="fas fa-times mr-1"></i>すべて解除
    </button>
  `;
  
  container.classList.remove('hidden');
}

// アクティブフィルタークリア
function clearActiveFilters() {
  resetAdvancedFilters();
  clearSearch();
}

// アクティブフィルター表示クリア
function clearActiveFiltersDisplay() {
  const container = document.getElementById('active-filters-display');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }
}

// 現在の検索を保存
function saveCurrentSearch() {
  const name = prompt('検索条件に名前を付けてください:');
  if (!name) return;
  
  const keyword = document.getElementById('filter-keyword')?.value.trim() || '';
  
  const statuses = Array.from(document.querySelectorAll('input[name="status"]:checked'))
    .map(cb => cb.value);
  
  const priorities = Array.from(document.querySelectorAll('input[name="priority"]:checked'))
    .map(cb => cb.value);
  
  const amountMin = document.getElementById('filter-amount-min')?.value;
  const amountMax = document.getElementById('filter-amount-max')?.value;
  const dateStart = document.getElementById('filter-date-start')?.value;
  const dateEnd = document.getElementById('filter-date-end')?.value;
  const tags = document.getElementById('filter-tags')?.value.trim();
  
  const filters = {};
  if (statuses.length > 0) filters.statuses = statuses;
  if (priorities.length > 0) filters.priorities = priorities;
  if (amountMin) filters.amountMin = amountMin;
  if (amountMax) filters.amountMax = amountMax;
  if (dateStart) filters.dateStart = dateStart;
  if (dateEnd) filters.dateEnd = dateEnd;
  if (tags) filters.tags = tags;
  
  savedSearches.push({
    id: Date.now(),
    name,
    keyword,
    filters,
    created_at: new Date().toISOString()
  });
  
  localStorage.setItem('saved_searches', JSON.stringify(savedSearches));
  
  showNotification(`検索条件「${name}」を保存しました`, 'success');
  renderSavedSearchesList();
  renderSavedSearchesQuick();
}

// 保存済み検索一覧表示
function renderSavedSearchesList() {
  const container = document.getElementById('saved-searches-list');
  if (!container) return;
  
  if (savedSearches.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-4">
        <i class="fas fa-bookmark text-3xl mb-2 text-gray-400"></i>
        <p class="text-sm">保存済み検索がありません</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = savedSearches.map(search => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div class="flex-1">
        <div class="font-semibold text-gray-800">${escapeHtml(search.name)}</div>
        <div class="text-xs text-gray-500 mt-1">
          ${search.keyword ? `キーワード: ${escapeHtml(search.keyword)}` : ''}
          ${Object.keys(search.filters).length > 0 ? ` • フィルター: ${Object.keys(search.filters).length}件` : ''}
          <span class="mx-1">•</span>
          ${formatTimeAgo(search.created_at)}
        </div>
      </div>
      <div class="flex gap-2 ml-4">
        <button 
          onclick="applySavedSearch(${search.id})"
          class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded transition"
        >
          <i class="fas fa-play mr-1"></i>実行
        </button>
        <button 
          onclick="deleteSavedSearch(${search.id})"
          class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// 保存済み検索クイックアクセス表示
function renderSavedSearchesQuick() {
  const container = document.getElementById('saved-searches-quick');
  if (!container) return;
  
  if (savedSearches.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.innerHTML = `
    <span class="text-sm font-semibold text-gray-600">クイック検索:</span>
    ${savedSearches.slice(0, 5).map(search => `
      <button 
        onclick="applySavedSearch(${search.id})"
        class="px-3 py-1.5 bg-white border-2 border-indigo-300 text-indigo-700 text-sm rounded-lg hover:bg-indigo-50 transition"
      >
        <i class="fas fa-bookmark mr-1"></i>${escapeHtml(search.name)}
      </button>
    `).join('')}
  `;
  
  container.classList.remove('hidden');
}

// 保存済み検索適用
function applySavedSearch(searchId) {
  const search = savedSearches.find(s => s.id === searchId);
  if (!search) return;
  
  // フォームに値をセット
  if (search.keyword) {
    const keywordInput = document.getElementById('filter-keyword');
    if (keywordInput) keywordInput.value = search.keyword;
    
    const mainInput = document.getElementById('global-search-input');
    if (mainInput) mainInput.value = search.keyword;
  }
  
  if (search.filters.statuses) {
    search.filters.statuses.forEach(status => {
      const checkbox = document.querySelector(`input[name="status"][value="${status}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  if (search.filters.priorities) {
    search.filters.priorities.forEach(priority => {
      const checkbox = document.querySelector(`input[name="priority"][value="${priority}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  
  if (search.filters.amountMin) {
    const input = document.getElementById('filter-amount-min');
    if (input) input.value = search.filters.amountMin;
  }
  
  if (search.filters.amountMax) {
    const input = document.getElementById('filter-amount-max');
    if (input) input.value = search.filters.amountMax;
  }
  
  if (search.filters.dateStart) {
    const input = document.getElementById('filter-date-start');
    if (input) input.value = search.filters.dateStart;
  }
  
  if (search.filters.dateEnd) {
    const input = document.getElementById('filter-date-end');
    if (input) input.value = search.filters.dateEnd;
  }
  
  if (search.filters.tags) {
    const input = document.getElementById('filter-tags');
    if (input) input.value = search.filters.tags;
  }
  
  // 検索実行
  performGlobalSearch(search.keyword, search.filters);
  displayActiveFilters(search.filters);
  
  // モーダルを閉じる
  const modal = document.getElementById('advanced-filters-modal');
  if (modal) modal.classList.add('hidden');
}

// 保存済み検索削除
function deleteSavedSearch(searchId) {
  if (!confirm('この検索条件を削除しますか？')) return;
  
  savedSearches = savedSearches.filter(s => s.id !== searchId);
  localStorage.setItem('saved_searches', JSON.stringify(savedSearches));
  
  showNotification('検索条件を削除しました', 'success');
  renderSavedSearchesList();
  renderSavedSearchesQuick();
}

// 検索結果エクスポート
function exportSearchResults() {
  if (currentSearchResults.length === 0) {
    showNotification('エクスポートする検索結果がありません', 'warning');
    return;
  }
  
  // CSVヘッダー
  const headers = ['会社名', '担当者', '業界', 'ステータス', '優先度', '予想金額', '更新日', 'タグ', 'メモ'];
  
  // CSVデータ
  const rows = currentSearchResults.map(result => [
    result.company_name || '',
    result.contact_person || '',
    result.industry || '',
    getStatusLabel(result.status),
    result.priority || '',
    result.expected_value || '',
    result.updated_at ? new Date(result.updated_at).toLocaleDateString('ja-JP') : '',
    result.tags || '',
    result.notes ? result.notes.replace(/\n/g, ' ') : ''
  ]);
  
  // CSV文字列生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // BOMを追加（Excel対応）
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロード
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `検索結果_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification('検索結果をエクスポートしました', 'success');
}

// ユーティリティ関数
function getStatusLabel(status) {
  const labels = {
    not_qualified: '見込み外',
    qualified: '見込み化',
    negotiating: '商談中',
    contracted: '契約済み',
    paid: '入金済み',
    partnership_candidate: '協業候補',
    partnership: '協業先'
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    not_qualified: 'text-gray-600',
    qualified: 'text-blue-600',
    negotiating: 'text-yellow-600',
    contracted: 'text-green-600',
    paid: 'text-emerald-600',
    partnership_candidate: 'text-purple-600',
    partnership: 'text-indigo-600'
  };
  return colors[status] || 'text-gray-600';
}

function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(num);
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return past.toLocaleDateString('ja-JP');
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
  // 既存のshowNotification関数を使用
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
  } else {
    alert(message);
  }
}

// 初期化時に保存済み検索クイックアクセスを表示
setTimeout(() => {
  renderSavedSearchesQuick();
}, 500);
