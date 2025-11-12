// Advanced Search Component for Sales CRM
// Provides search filters, saved searches, and search history

// Global state
let currentFilters = {
  keyword: '',
  statuses: [],
  priorities: [],
  amountMin: '',
  amountMax: '',
  dateStart: '',
  dateEnd: '',
  tags: ''
};

let savedSearches = [];
let searchHistory = [];

// Initialize advanced search
async function initAdvancedSearch() {
  await loadSavedSearches();
  loadSearchHistory();
  renderSearchUI();
}

// Load saved searches from API
async function loadSavedSearches() {
  try {
    const response = await axios.get('/api/search/saved', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    
    if (response.data.success) {
      savedSearches = response.data.saved_searches;
      renderSavedSearchesDropdown();
    }
  } catch (error) {
    console.error('Failed to load saved searches:', error);
  }
}

// Load search history from localStorage
function loadSearchHistory() {
  const stored = localStorage.getItem('search_history');
  if (stored) {
    try {
      searchHistory = JSON.parse(stored);
    } catch (e) {
      searchHistory = [];
    }
  }
}

// Save search to history
function saveToHistory(filters) {
  const historyItem = {
    filters: { ...filters },
    timestamp: new Date().toISOString(),
    label: generateSearchLabel(filters)
  };
  
  // Add to beginning and keep only 20 most recent
  searchHistory.unshift(historyItem);
  searchHistory = searchHistory.slice(0, 20);
  
  localStorage.setItem('search_history', JSON.stringify(searchHistory));
}

// Generate human-readable label for search
function generateSearchLabel(filters) {
  const parts = [];
  
  if (filters.keyword) parts.push(`"${filters.keyword}"`);
  if (filters.statuses?.length) parts.push(`ステータス: ${filters.statuses.join(', ')}`);
  if (filters.priorities?.length) parts.push(`優先度: ${filters.priorities.join(', ')}`);
  if (filters.amountMin || filters.amountMax) {
    const range = `${filters.amountMin || '0'}円 〜 ${filters.amountMax || '∞'}円`;
    parts.push(`金額: ${range}`);
  }
  if (filters.dateStart || filters.dateEnd) {
    const range = `${filters.dateStart || '開始'} 〜 ${filters.dateEnd || '今日'}`;
    parts.push(`期間: ${range}`);
  }
  if (filters.tags) parts.push(`タグ: ${filters.tags}`);
  
  return parts.length > 0 ? parts.join(' | ') : '全案件';
}

// Render search UI in dashboard
function renderSearchUI() {
  const container = document.getElementById('search-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-md p-6 mb-6">
      <div class="flex items-center gap-4">
        <!-- Search Input -->
        <div class="flex-1 relative">
          <input 
            type="text" 
            id="search-keyword" 
            placeholder="案件・企業・担当者名で検索..."
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value="${currentFilters.keyword}"
          />
          <i class="fas fa-search absolute right-4 top-4 text-gray-400"></i>
        </div>
        
        <!-- Advanced Filter Button -->
        <button 
          onclick="toggleFilterModal()"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <i class="fas fa-filter"></i>
          <span>詳細フィルター</span>
          ${getActiveFilterBadge()}
        </button>
        
        <!-- Saved Searches Dropdown -->
        <div class="relative">
          <button 
            onclick="toggleSavedSearchesMenu()"
            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <i class="fas fa-bookmark"></i>
            <span>保存済み検索</span>
          </button>
          <div id="saved-searches-menu" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
            <!-- Will be populated by renderSavedSearchesDropdown() -->
          </div>
        </div>
        
        <!-- Export Button -->
        <button 
          onclick="exportSearchResults()"
          class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <i class="fas fa-download"></i>
          <span>エクスポート</span>
        </button>
      </div>
      
      <!-- Active Filters Display -->
      <div id="active-filters" class="mt-4">
        ${renderActiveFilters()}
      </div>
      
      <!-- Search History Dropdown -->
      <div id="search-history-dropdown" class="hidden mt-4 bg-gray-50 rounded-lg p-4 border">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">
          <i class="fas fa-history mr-2"></i>最近の検索
        </h4>
        <div class="space-y-2">
          ${searchHistory.slice(0, 5).map((item, idx) => `
            <button 
              onclick="applyHistorySearch(${idx})"
              class="w-full text-left px-3 py-2 rounded hover:bg-white text-sm text-gray-700 flex items-center justify-between"
            >
              <span>${item.label}</span>
              <span class="text-xs text-gray-500">${formatRelativeTime(item.timestamp)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
    
    <!-- Filter Modal -->
    <div id="filter-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-filter mr-2 text-blue-600"></i>詳細フィルター
          </h3>
          <button onclick="toggleFilterModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Keywords -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">キーワード検索</label>
            <input 
              type="text" 
              id="filter-keyword" 
              placeholder="企業名、担当者名、業種、タグ、メモなど..."
              class="w-full px-4 py-2 border rounded-lg"
              value="${currentFilters.keyword}"
            />
            <p class="text-xs text-gray-500 mt-1">部分一致で検索します</p>
          </div>
          
          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">ステータス</label>
            <div class="grid grid-cols-3 gap-3">
              ${['lead', 'qualified', 'proposal', 'negotiation', 'won', 'paid', 'lost'].map(status => `
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    value="${status}"
                    ${currentFilters.statuses.includes(status) ? 'checked' : ''}
                    onchange="updateFilterStatus(this)"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm">${getStatusLabel(status)}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <!-- Priority Filter -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">優先度</label>
            <div class="grid grid-cols-4 gap-3">
              ${['high', 'medium', 'low'].map(priority => `
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    value="${priority}"
                    ${currentFilters.priorities.includes(priority) ? 'checked' : ''}
                    onchange="updateFilterPriority(this)"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm">${getPriorityLabel(priority)}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <!-- Amount Range -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">予想金額範囲</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-600 mb-1">最小金額</label>
                <input 
                  type="number" 
                  id="filter-amount-min" 
                  placeholder="0"
                  value="${currentFilters.amountMin}"
                  class="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">最大金額</label>
                <input 
                  type="number" 
                  id="filter-amount-max" 
                  placeholder="無制限"
                  value="${currentFilters.amountMax}"
                  class="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <!-- Date Range -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">更新日範囲</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-600 mb-1">開始日</label>
                <input 
                  type="date" 
                  id="filter-date-start" 
                  value="${currentFilters.dateStart}"
                  class="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">終了日</label>
                <input 
                  type="date" 
                  id="filter-date-end" 
                  value="${currentFilters.dateEnd}"
                  class="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <!-- Tags -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">タグ（カンマ区切り）</label>
            <input 
              type="text" 
              id="filter-tags" 
              placeholder="例: VIP,大手,緊急"
              value="${currentFilters.tags}"
              class="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <button 
            onclick="clearAllFilters()"
            class="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            <i class="fas fa-times-circle mr-2"></i>クリア
          </button>
          
          <div class="flex items-center gap-3">
            <button 
              onclick="saveCurrentSearch()"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <i class="fas fa-bookmark mr-2"></i>この検索を保存
            </button>
            <button 
              onclick="applyFilters()"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <i class="fas fa-search mr-2"></i>検索実行
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add debounced search on keyword input
  const keywordInput = document.getElementById('search-keyword');
  if (keywordInput) {
    let debounceTimer;
    keywordInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.keyword = e.target.value;
        performSearch();
      }, 300);
    });
    
    // Show history on focus
    keywordInput.addEventListener('focus', () => {
      if (searchHistory.length > 0) {
        document.getElementById('search-history-dropdown').classList.remove('hidden');
      }
    });
  }
}

// Get active filter badge
function getActiveFilterBadge() {
  const count = countActiveFilters();
  if (count === 0) return '';
  return `<span class="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold">${count}</span>`;
}

// Count active filters
function countActiveFilters() {
  let count = 0;
  if (currentFilters.statuses.length > 0) count++;
  if (currentFilters.priorities.length > 0) count++;
  if (currentFilters.amountMin) count++;
  if (currentFilters.amountMax) count++;
  if (currentFilters.dateStart) count++;
  if (currentFilters.dateEnd) count++;
  if (currentFilters.tags) count++;
  return count;
}

// Render active filters
function renderActiveFilters() {
  const count = countActiveFilters();
  if (count === 0 && !currentFilters.keyword) {
    return '<p class="text-sm text-gray-500">フィルターなし - 全案件を表示</p>';
  }
  
  const badges = [];
  
  if (currentFilters.keyword) {
    badges.push(`<span class="badge">キーワード: "${currentFilters.keyword}"</span>`);
  }
  if (currentFilters.statuses.length > 0) {
    badges.push(`<span class="badge">ステータス: ${currentFilters.statuses.map(s => getStatusLabel(s)).join(', ')}</span>`);
  }
  if (currentFilters.priorities.length > 0) {
    badges.push(`<span class="badge">優先度: ${currentFilters.priorities.map(p => getPriorityLabel(p)).join(', ')}</span>`);
  }
  if (currentFilters.amountMin || currentFilters.amountMax) {
    badges.push(`<span class="badge">金額: ${currentFilters.amountMin || '0'}円 〜 ${currentFilters.amountMax || '∞'}円</span>`);
  }
  if (currentFilters.dateStart || currentFilters.dateEnd) {
    badges.push(`<span class="badge">期間: ${currentFilters.dateStart || '開始'} 〜 ${currentFilters.dateEnd || '今日'}</span>`);
  }
  if (currentFilters.tags) {
    badges.push(`<span class="badge">タグ: ${currentFilters.tags}</span>`);
  }
  
  return `
    <div class="flex items-center flex-wrap gap-2">
      <span class="text-sm font-semibold text-gray-700">アクティブフィルター:</span>
      ${badges.join('')}
      <button onclick="clearAllFilters()" class="text-xs text-red-600 hover:text-red-700 ml-2">
        <i class="fas fa-times-circle mr-1"></i>すべてクリア
      </button>
    </div>
    <style>
      .badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
    </style>
  `;
}

// Toggle filter modal
function toggleFilterModal() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;
  
  if (modal.classList.contains('hidden')) {
    // Populate filter fields with current values
    document.getElementById('filter-keyword').value = currentFilters.keyword;
    document.getElementById('filter-amount-min').value = currentFilters.amountMin;
    document.getElementById('filter-amount-max').value = currentFilters.amountMax;
    document.getElementById('filter-date-start').value = currentFilters.dateStart;
    document.getElementById('filter-date-end').value = currentFilters.dateEnd;
    document.getElementById('filter-tags').value = currentFilters.tags;
    
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

// Update filter status checkboxes
function updateFilterStatus(checkbox) {
  if (checkbox.checked) {
    if (!currentFilters.statuses.includes(checkbox.value)) {
      currentFilters.statuses.push(checkbox.value);
    }
  } else {
    currentFilters.statuses = currentFilters.statuses.filter(s => s !== checkbox.value);
  }
}

// Update filter priority checkboxes
function updateFilterPriority(checkbox) {
  if (checkbox.checked) {
    if (!currentFilters.priorities.includes(checkbox.value)) {
      currentFilters.priorities.push(checkbox.value);
    }
  } else {
    currentFilters.priorities = currentFilters.priorities.filter(p => p !== checkbox.value);
  }
}

// Apply filters and perform search
function applyFilters() {
  // Collect all filter values
  currentFilters.keyword = document.getElementById('filter-keyword').value;
  currentFilters.amountMin = document.getElementById('filter-amount-min').value;
  currentFilters.amountMax = document.getElementById('filter-amount-max').value;
  currentFilters.dateStart = document.getElementById('filter-date-start').value;
  currentFilters.dateEnd = document.getElementById('filter-date-end').value;
  currentFilters.tags = document.getElementById('filter-tags').value;
  
  // Close modal
  toggleFilterModal();
  
  // Save to history
  saveToHistory(currentFilters);
  
  // Perform search
  performSearch();
  
  // Re-render UI to show active filters
  renderSearchUI();
}

// Clear all filters
function clearAllFilters() {
  currentFilters = {
    keyword: '',
    statuses: [],
    priorities: [],
    amountMin: '',
    amountMax: '',
    dateStart: '',
    dateEnd: '',
    tags: ''
  };
  
  // Re-render filter modal
  renderSearchUI();
  performSearch();
}

// Perform search with current filters
async function performSearch() {
  try {
    const params = new URLSearchParams();
    
    if (currentFilters.keyword) params.append('q', currentFilters.keyword);
    if (currentFilters.statuses.length > 0) params.append('statuses', currentFilters.statuses.join(','));
    if (currentFilters.priorities.length > 0) params.append('priorities', currentFilters.priorities.join(','));
    if (currentFilters.amountMin) params.append('amount_min', currentFilters.amountMin);
    if (currentFilters.amountMax) params.append('amount_max', currentFilters.amountMax);
    if (currentFilters.dateStart) params.append('date_start', currentFilters.dateStart);
    if (currentFilters.dateEnd) params.append('date_end', currentFilters.dateEnd);
    if (currentFilters.tags) params.append('tags', currentFilters.tags);
    
    const response = await axios.get(`/api/search/sales-crm?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    
    if (response.data.success) {
      // Update deals list with search results
      window.searchResults = response.data.results;
      if (typeof renderDealsFromSearch === 'function') {
        renderDealsFromSearch(response.data.results);
      }
    }
  } catch (error) {
    console.error('Search error:', error);
    alert('検索中にエラーが発生しました');
  }
}

// Render saved searches dropdown
function renderSavedSearchesDropdown() {
  const menu = document.getElementById('saved-searches-menu');
  if (!menu) return;
  
  if (savedSearches.length === 0) {
    menu.innerHTML = `
      <div class="p-4 text-center text-gray-500 text-sm">
        <i class="fas fa-bookmark mb-2 text-2xl"></i>
        <p>保存済み検索がありません</p>
      </div>
    `;
    return;
  }
  
  menu.innerHTML = `
    <div class="p-2 space-y-1">
      ${savedSearches.map(saved => `
        <button 
          onclick="applySavedSearch(${saved.id})"
          class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center justify-between group"
        >
          <div class="flex-1">
            <div class="font-semibold text-sm text-gray-800 flex items-center gap-2">
              ${saved.is_default ? '<i class="fas fa-star text-yellow-500"></i>' : ''}
              ${saved.name}
            </div>
            ${saved.description ? `<div class="text-xs text-gray-500 mt-1">${saved.description}</div>` : ''}
          </div>
          <button 
            onclick="event.stopPropagation(); deleteSavedSearch(${saved.id})"
            class="hidden group-hover:block text-red-500 hover:text-red-700 ml-2"
          >
            <i class="fas fa-trash text-xs"></i>
          </button>
        </button>
      `).join('')}
    </div>
    <div class="border-t p-2">
      <button 
        onclick="showSaveSearchDialog()"
        class="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
      >
        <i class="fas fa-plus mr-2"></i>新規保存
      </button>
    </div>
  `;
}

// Toggle saved searches menu
function toggleSavedSearchesMenu() {
  const menu = document.getElementById('saved-searches-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Apply saved search
async function applySavedSearch(id) {
  const saved = savedSearches.find(s => s.id === id);
  if (!saved) return;
  
  try {
    const params = JSON.parse(saved.search_params);
    currentFilters = { ...currentFilters, ...params };
    
    renderSearchUI();
    performSearch();
    toggleSavedSearchesMenu();
  } catch (error) {
    console.error('Failed to apply saved search:', error);
    alert('保存済み検索の適用に失敗しました');
  }
}

// Delete saved search
async function deleteSavedSearch(id) {
  if (!confirm('この検索を削除してもよろしいですか？')) return;
  
  try {
    await axios.delete(`/api/search/saved/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    
    await loadSavedSearches();
  } catch (error) {
    console.error('Failed to delete saved search:', error);
    alert('削除に失敗しました');
  }
}

// Show save search dialog
function showSaveSearchDialog() {
  const name = prompt('検索条件に名前を付けてください:');
  if (!name) return;
  
  const description = prompt('説明（任意）:');
  const isDefault = confirm('デフォルトの検索として設定しますか？');
  
  saveSearchAs(name, description, isDefault);
}

// Save current search
async function saveCurrentSearch() {
  const name = prompt('検索条件に名前を付けてください:');
  if (!name) return;
  
  const description = prompt('説明（任意）:');
  const isDefault = confirm('デフォルトの検索として設定しますか？');
  
  await saveSearchAs(name, description, isDefault);
  toggleFilterModal();
}

// Save search as
async function saveSearchAs(name, description, isDefault) {
  try {
    await axios.post('/api/search/saved', {
      name,
      description,
      search_params: currentFilters,
      is_default: isDefault
    }, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    
    await loadSavedSearches();
    alert('検索条件を保存しました！');
  } catch (error) {
    console.error('Failed to save search:', error);
    alert('保存に失敗しました');
  }
}

// Apply search from history
function applyHistorySearch(index) {
  const item = searchHistory[index];
  if (!item) return;
  
  currentFilters = { ...item.filters };
  renderSearchUI();
  performSearch();
}

// Export search results
async function exportSearchResults() {
  const format = confirm('CSV形式でエクスポートしますか？\n（キャンセルでJSON形式）') ? 'csv' : 'json';
  
  if (!window.searchResults || window.searchResults.length === 0) {
    alert('エクスポートする検索結果がありません');
    return;
  }
  
  if (format === 'csv') {
    exportToCSV(window.searchResults);
  } else {
    exportToJSON(window.searchResults);
  }
}

// Export to CSV
function exportToCSV(data) {
  const headers = ['ID', '企業名', '担当者', 'ステージ', '優先度', '予想金額', '成約確度', '更新日'];
  const rows = data.map(deal => [
    deal.id,
    deal.company_name || '',
    deal.contact_person || '',
    getStatusLabel(deal.stage),
    getPriorityLabel(deal.priority),
    deal.estimated_value || 0,
    deal.probability || 0,
    deal.updated_at || ''
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  downloadFile(csv, 'search_results.csv', 'text/csv');
}

// Export to JSON
function exportToJSON(data) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'search_results.json', 'application/json');
}

// Download file
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper: Get status label
function getStatusLabel(status) {
  const labels = {
    lead: 'リード',
    qualified: '見込み確定',
    proposal: '提案中',
    negotiation: '交渉中',
    won: '成約',
    paid: '入金済',
    lost: '失注'
  };
  return labels[status] || status;
}

// Helper: Get priority label
function getPriorityLabel(priority) {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return labels[priority] || priority;
}

// Helper: Format relative time
function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return then.toLocaleDateString('ja-JP');
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdvancedSearch);
} else {
  initAdvancedSearch();
}
