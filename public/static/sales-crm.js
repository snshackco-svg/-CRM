// Sales CRM Frontend JavaScript

let sessionToken = localStorage.getItem('session_token');
let currentView = 'prospects'; // prospects, prospect-detail, connections, settings
let currentProspect = null;
let prospects = [];
let connections = [];
let meetings = [];

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('session_token');
  if (!token) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// Initialize Sales CRM
async function initSalesCRM() {
  if (!checkAuth()) return;
  
  renderLayout();
  await loadProspects();
  await loadConnections();
  await loadBusinessCards();
  switchView('dashboard');
}

// Render main layout
function renderLayout() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">
            <i class="fas fa-handshake mr-3 text-indigo-600"></i>営業CRM
          </h1>
          <p class="text-gray-600 mt-1">見込み客管理・商談サポートシステム</p>
        </div>
        <div class="flex gap-3">
          <button onclick="window.location.href='/clients'" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-video mr-2"></i>SNS分析CRM
          </button>
          <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="grid grid-cols-6 gap-2 mb-4">
        <button onclick="switchView('dashboard')" id="nav-dashboard" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-tachometer-alt mr-2"></i>ダッシュボード
        </button>
        <button onclick="switchView('prospects')" id="nav-prospects" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-building mr-2"></i>見込み客一覧
        </button>
        <button onclick="switchView('appointments')" id="nav-appointments" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-calendar-check mr-2"></i>アポイント履歴
        </button>
        <button onclick="switchView('kanban')" id="nav-kanban" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-th mr-2"></i>カンバン
        </button>
        <button onclick="switchView('connections')" id="nav-connections" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-users mr-2"></i>人脈管理
        </button>
        <button onclick="switchView('appointment-prep')" id="nav-appointment-prep" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-clipboard-check mr-2"></i>アポイント準備
        </button>
      </div>
      <div class="grid grid-cols-6 gap-2 mb-4">
        <button onclick="switchView('referrals')" id="nav-referrals" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-user-friends mr-2"></i>紹介者ランキング
        </button>
        <button onclick="switchView('new-appointment')" id="nav-new-appointment" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-user-plus mr-2"></i>新規アポイント
        </button>
        <button onclick="switchView('weekly-report')" id="nav-weekly-report" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-file-alt mr-2"></i>週報
        </button>
        <button onclick="switchView('kpi')" id="nav-kpi" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-chart-line mr-2"></i>KPI
        </button>
        <button onclick="switchView('analytics')" id="nav-analytics" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-chart-pie mr-2"></i>営業分析
        </button>
        <button onclick="switchView('matching')" id="nav-matching" class="nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md">
          <i class="fas fa-network-wired mr-2"></i>人脈マッチング
        </button>
      </div>

    </div>

    <!-- Content Area -->
    <div id="content-area"></div>
  `;
}

// Switch view
function switchView(view) {
  currentView = view;
  
  // Update tab styles
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.className = 'nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md bg-white text-gray-600 hover:bg-gray-50';
  });
  document.getElementById(`nav-${view}`).className = 'nav-tab px-4 py-3 rounded-xl font-bold text-sm transition shadow-md bg-indigo-600 text-white';
  
  // Render view
  switch(view) {
    case 'dashboard':
      renderDashboardView();
      break;
    case 'prospects':
      renderProspectsView();
      break;
    case 'appointments':
      renderAppointmentsView();
      break;
    case 'kanban':
      renderKanbanView();
      break;
    case 'connections':
      renderConnectionsView();
      break;
    case 'appointment-prep':
      renderAppointmentPrepView();
      break;
    case 'referrals':
      renderReferralsView();
      break;
    case 'new-appointment':
      renderNewAppointmentView();
      break;
    case 'weekly-report':
      renderWeeklyReportView();
      break;
    case 'kpi':
      renderKPIView();
      break;
    case 'analytics':
      renderAnalyticsView();
      break;
    case 'matching':
      renderMatchingView();
      break;
    case 'prospect-detail':
      renderProspectDetail();
      break;
  }
}

// ==================== PROSPECTS VIEW ====================

async function loadProspects(sortBy = 'updated_at', status = 'all', month = null) {
  try {
    let url = `/api/prospects?sort_by=${sortBy}&sort_order=DESC`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
    if (month) {
      url += `&month=${month}`;
    }
    
    const response = await axios.get(url, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      prospects = response.data.prospects;
    }
  } catch (error) {
    console.error('Failed to load prospects:', error);
    showToast('見込み客の読み込みに失敗しました', 'error');
  }
}

async function loadMeetings(month = null) {
  try {
    let url = `/api/meetings`;
    if (month) {
      url += `?month=${month}`;
    }
    
    const response = await axios.get(url, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      meetings = response.data.meetings;
    }
  } catch (error) {
    console.error('Failed to load meetings:', error);
    showToast('商談履歴の読み込みに失敗しました', 'error');
  }
}

// Generate month options for the last 12 months
function generateMonthOptions() {
  const options = [];
  const currentMonth = dayjs();
  
  for (let i = 0; i < 12; i++) {
    const month = currentMonth.subtract(i, 'month');
    const value = month.format('YYYY-MM');
    const label = month.format('YYYY年MM月');
    const selected = i === 0 ? 'selected' : '';
    options.push(`<option value="${value}" ${selected}>${label}</option>`);
  }
  
  return options.join('');
}

function filterProspects() {
  const combined = document.getElementById('filter-sort-combined')?.value || 'all|updated_at';
  const [status, sortBy] = combined.split('|');
  const month = document.getElementById('prospects-month-filter')?.value || null;
  
  loadProspects(sortBy, status, month).then(() => {
    const tbody = document.getElementById('prospects-tbody');
    if (tbody) {
      tbody.innerHTML = renderProspectsRows();
    }
  });
}

async function renderProspectsView() {
  const contentArea = document.getElementById('content-area');
  
  // Load prospects first
  await loadProspects();
  
  const statusCounts = {
    new: prospects.filter(p => p.status === 'new').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    negotiating: prospects.filter(p => p.status === 'negotiating').length,
    won: prospects.filter(p => p.status === 'won').length
  };
  
  contentArea.innerHTML = `
    <!-- Actions -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex gap-2">
        <select id="prospects-month-filter" onchange="filterProspects()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="">全期間</option>
          ${generateMonthOptions()}
        </select>
        <select id="filter-sort-combined" onchange="filterProspects()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <optgroup label="ステータス">
            <option value="all|updated_at">すべてのステータス（更新日順）</option>
            <option value="not_qualified|updated_at">見込み外（更新日順）</option>
            <option value="qualified|updated_at">見込み化（更新日順）</option>
            <option value="negotiating|updated_at">商談（更新日順）</option>
            <option value="contracted|updated_at">契約（更新日順）</option>
            <option value="paid|updated_at">入金済み（更新日順）</option>
            <option value="partnership_candidate|updated_at">協業候補（更新日順）</option>
            <option value="partnership|updated_at">協業先（更新日順）</option>
          </optgroup>
          <optgroup label="並び替え">
            <option value="all|next_meeting_date">すべて（アポ日付順）</option>
            <option value="all|contact_count">すべて（接触回数順）</option>
            <option value="all|last_contact_date">すべて（最終接触日順）</option>
          </optgroup>
        </select>
      </div>
      <!-- 新規見込み客追加ボタンは削除されました -->
    </div>

    <!-- Prospects Table -->
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">会社名</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">担当者</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">業界</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ステータス</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">優先度</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">商談回数</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">タスク</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">更新日</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">アクション</th>
          </tr>
        </thead>
        <tbody id="prospects-tbody">
          ${renderProspectsRows()}
        </tbody>
      </table>
    </div>
  `;
}

function renderProspectsRows() {
  if (prospects.length === 0) {
    return `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2 text-gray-400"></i>
          <p>見込み客がまだ登録されていません</p>
          <!-- 新規登録ボタンは削除されました -->
        </td>
      </tr>
    `;
  }
  
  return prospects.map(p => {
    const statusColors = {
      new: 'bg-blue-100 text-blue-800',
      researching: 'bg-purple-100 text-purple-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      meeting_scheduled: 'bg-orange-100 text-orange-800',
      negotiating: 'bg-indigo-100 text-indigo-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-gray-100 text-gray-800'
    };
    
    const priorityColors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    const statusLabels = {
      new: '新規',
      researching: 'リサーチ中',
      contacted: 'コンタクト済',
      meeting_scheduled: '商談予定',
      negotiating: '商談中',
      won: '成約',
      lost: '失注'
    };
    
    const priorityLabels = {
      urgent: '緊急',
      high: '高',
      medium: '中',
      low: '低'
    };
    
    return `
      <tr class="border-b hover:bg-gray-50 transition cursor-pointer" onclick="viewProspect(${p.id})">
        <td class="px-4 py-3">
          <div class="font-semibold text-gray-800">${p.company_name}</div>
          ${p.company_url ? `<a href="${p.company_url}" target="_blank" class="text-xs text-indigo-600 hover:underline" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt mr-1"></i>Webサイト</a>` : ''}
        </td>
        <td class="px-4 py-3">
          <div class="text-gray-800">${p.contact_name || '-'}</div>
          <div class="text-xs text-gray-500">${p.contact_position || ''}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${p.industry || '-'}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}">
            ${statusLabels[p.status] || p.status}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[p.priority] || 'bg-gray-100 text-gray-800'}">
            ${priorityLabels[p.priority] || p.priority}
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
            ${p.meeting_count || 0}
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          ${p.todo_count > 0 ? `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 font-semibold">${p.todo_count}</span>` : '<span class="text-gray-400">-</span>'}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${dayjs(p.updated_at).format('YYYY/MM/DD')}</td>
        <td class="px-4 py-3 text-center">
          <button onclick="event.stopPropagation(); viewProspect(${p.id})" class="text-indigo-600 hover:text-indigo-800 mr-2">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="event.stopPropagation(); editProspect(${p.id})" class="text-blue-600 hover:text-blue-800 mr-2">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteProspect(${p.id})" class="text-red-600 hover:text-red-800">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterProspects() {
  const statusFilter = document.getElementById('status-filter').value;
  const priorityFilter = document.getElementById('priority-filter').value;
  
  // This would filter the prospects array and re-render
  // For now, just re-render all
  renderProspectsView();
}

// ==================== PROSPECT DETAIL VIEW ====================

async function viewProspect(prospectId) {
  try {
    const response = await axios.get(`/api/prospects/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      currentProspect = response.data;
      currentView = 'prospect-detail';
      renderProspectDetail();
    }
  } catch (error) {
    console.error('Failed to load prospect:', error);
    showToast('見込み客の詳細読み込みに失敗しました', 'error');
  }
}

function renderProspectDetail() {
  const contentArea = document.getElementById('content-area');
  const p = currentProspect.prospect;
  const research = currentProspect.research;
  const meetings = currentProspect.meetings;
  const todos = currentProspect.todos;
  const matches = currentProspect.matches;
  
  contentArea.innerHTML = `
    <!-- Back Button -->
    <button onclick="switchView('prospects')" class="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center">
      <i class="fas fa-arrow-left mr-2"></i>見込み客一覧に戻る
    </button>

    <!-- Prospect Header -->
    <div class="bg-white rounded-xl shadow-md p-6 mb-6">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">${p.company_name}</h2>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">担当者：</span>
              <span class="font-semibold">${p.contact_name || '-'} ${p.contact_position ? `(${p.contact_position})` : ''}</span>
            </div>
            <div>
              <span class="text-gray-600">業界：</span>
              <span class="font-semibold">${p.industry || '-'}</span>
            </div>
            <div>
              <span class="text-gray-600">Email：</span>
              <span class="font-semibold">${p.contact_email || '-'}</span>
            </div>
            <div>
              <span class="text-gray-600">電話：</span>
              <span class="font-semibold">${p.contact_phone || '-'}</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <button onclick="editProspect(${p.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition mr-2">
            <i class="fas fa-edit mr-2"></i>編集
          </button>
          <button onclick="generateResearch(${p.id})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-robot mr-2"></i>AI事前リサーチ
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs for Detail Views -->
    <div class="grid grid-cols-3 gap-2 mb-6">
      <button onclick="switchProspectTab('overview')" id="prospect-tab-overview" class="prospect-tab px-4 py-3 rounded-xl font-semibold text-sm transition shadow-md bg-indigo-600 text-white">
        <i class="fas fa-info-circle mr-2"></i>概要
      </button>
      <button onclick="switchProspectTab('meetings')" id="prospect-tab-meetings" class="prospect-tab px-4 py-3 rounded-xl font-semibold text-sm transition shadow-md bg-white text-gray-600">
        <i class="fas fa-calendar-alt mr-2"></i>商談履歴
      </button>
      <button onclick="switchProspectTab('todos')" id="prospect-tab-todos" class="prospect-tab px-4 py-3 rounded-xl font-semibold text-sm transition shadow-md bg-white text-gray-600">
        <i class="fas fa-tasks mr-2"></i>ToDo
      </button>
    </div>

    <!-- Tab Content -->
    <div id="prospect-tab-content"></div>
  `;
  
  switchProspectTab('overview');
}

function switchProspectTab(tab) {
  // Update tab styles
  document.querySelectorAll('.prospect-tab').forEach(t => {
    t.className = 'prospect-tab px-4 py-3 rounded-xl font-semibold text-sm transition shadow-md bg-white text-gray-600 hover:bg-gray-50';
  });
  document.getElementById(`prospect-tab-${tab}`).className = 'prospect-tab px-4 py-3 rounded-xl font-semibold text-sm transition shadow-md bg-indigo-600 text-white';
  
  const contentDiv = document.getElementById('prospect-tab-content');
  
  switch(tab) {
    case 'overview':
      contentDiv.innerHTML = renderOverviewTab();
      break;
    case 'meetings':
      contentDiv.innerHTML = renderMeetingsTab();
      break;
    case 'todos':
      contentDiv.innerHTML = renderTodosTab();
      break;
  }
}

function renderOverviewTab() {
  const p = currentProspect.prospect;
  
  return `
    <div class="grid grid-cols-2 gap-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-building mr-2 text-indigo-600"></i>基本情報
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">ステータス:</span>
            <span class="font-semibold">${p.status}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">優先度:</span>
            <span class="font-semibold">${p.priority}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">企業規模:</span>
            <span class="font-semibold">${p.company_size || '-'}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">予想成約額:</span>
            <span class="font-semibold">${p.estimated_value ? `¥${p.estimated_value.toLocaleString()}` : '-'}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">成約予定日:</span>
            <span class="font-semibold">${p.expected_close_date ? dayjs(p.expected_close_date).format('YYYY/MM/DD') : '-'}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">情報源:</span>
            <span class="font-semibold">${p.source || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-bolt mr-2 text-yellow-500"></i>クイックアクション
        </h3>
        <div class="space-y-3">
          <button onclick="showNewMeetingModal(${p.id})" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition text-left">
            <i class="fas fa-calendar-plus mr-2"></i>新規商談登録
          </button>
        </div>
      </div>
    </div>

    <!-- Notes -->
    ${p.notes ? `
      <div class="bg-white rounded-xl shadow-md p-6 mt-6">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-sticky-note mr-2 text-yellow-500"></i>メモ
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">${p.notes}</p>
      </div>
    ` : ''}
  `;
}

function renderResearchTab() {
  const research = currentProspect.research;
  const p = currentProspect.prospect;
  
  if (!research) {
    return `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">事前リサーチがまだ作成されていません</h3>
        <p class="text-gray-600 mb-4">AIが自動的に企業情報を調査し、商談に役立つ情報を提供します</p>
        <button onclick="generateResearch(${p.id})" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition">
          <i class="fas fa-robot mr-2"></i>AI事前リサーチを生成
        </button>
      </div>
    `;
  }
  
  return `
    <div class="space-y-4">
      <!-- Business Overview -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-briefcase mr-2 text-indigo-600"></i>事業概要
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">${research.business_overview}</p>
      </div>

      <!-- Key Personnel -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-user-tie mr-2 text-blue-600"></i>キーパーソン
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">${research.key_personnel}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Recent News -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-newspaper mr-2 text-green-600"></i>最近のニュース
          </h3>
          <p class="text-gray-700 whitespace-pre-wrap">${research.recent_news}</p>
        </div>

        <!-- Pain Points -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-exclamation-triangle mr-2 text-orange-600"></i>課題・ペインポイント
          </h3>
          <p class="text-gray-700 whitespace-pre-wrap">${research.pain_points}</p>
        </div>
      </div>

      <!-- Opportunities -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-lightbulb mr-2 text-yellow-600"></i>商機・アプローチ案
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">${research.opportunities}</p>
      </div>

      <!-- Suggested Approach -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <i class="fas fa-route mr-2 text-purple-600"></i>推奨アプローチ
        </h3>
        <p class="text-gray-700 whitespace-pre-wrap">${research.suggested_approach}</p>
      </div>
    </div>
  `;
}

function renderMeetingsTab() {
  const meetings = currentProspect.meetings || [];
  const p = currentProspect.prospect;
  
  return `
    <div class="mb-4 flex justify-end">
      <button onclick="showNewMeetingModal(${p.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
        <i class="fas fa-calendar-plus mr-2"></i>新規商談登録
      </button>
    </div>

    ${meetings.length === 0 ? `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-calendar-times text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">商談履歴がまだありません</h3>
        <p class="text-gray-600 mb-4">最初の商談を登録しましょう</p>
        <button onclick="showNewMeetingModal(${p.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition">
          <i class="fas fa-calendar-plus mr-2"></i>商談を登録
        </button>
      </div>
    ` : `
      <div class="space-y-4">
        ${meetings.map(m => `
          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${dayjs(m.meeting_date).format('YYYY年MM月DD日 HH:mm')}</h3>
                <p class="text-sm text-gray-600">${m.meeting_type} / ${m.duration_minutes ? `${m.duration_minutes}分` : ''}</p>
              </div>
              <button onclick="viewMeetingDetail(${m.id})" class="text-indigo-600 hover:text-indigo-800">
                <i class="fas fa-eye mr-1"></i>詳細
              </button>
            </div>
            
            ${m.attendees ? `
              <div class="mb-3">
                <span class="text-sm font-semibold text-gray-600">参加者:</span>
                <span class="text-sm text-gray-700">${m.attendees}</span>
              </div>
            ` : ''}
            
            ${m.minutes ? `
              <div class="mb-3">
                <span class="text-sm font-semibold text-gray-600">議事録:</span>
                <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${m.minutes.substring(0, 200)}${m.minutes.length > 200 ? '...' : ''}</p>
              </div>
            ` : ''}
            
            <div class="flex gap-2 mt-4">
              <button onclick="generateThankYouEmails(${m.id})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition">
                <i class="fas fa-envelope mr-1"></i>お礼メール生成
              </button>
              <button onclick="generatePMReport(${m.id})" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition">
                <i class="fas fa-file-alt mr-1"></i>PM報告書生成
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderTodosTab() {
  const todos = currentProspect.todos || [];
  const p = currentProspect.prospect;
  
  return `
    <div class="mb-4 flex justify-end">
      <button onclick="showNewTodoModal(${p.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
        <i class="fas fa-plus mr-2"></i>新規ToDo追加
      </button>
    </div>

    ${todos.length === 0 ? `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-tasks text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">ToDoがまだありません</h3>
        <p class="text-gray-600 mb-4">商談後のネクストアクションを登録しましょう</p>
      </div>
    ` : `
      <div class="space-y-3">
        ${todos.map(t => {
          const priorityColors = {
            urgent: 'border-red-500 bg-red-50',
            high: 'border-orange-500 bg-orange-50',
            medium: 'border-yellow-500 bg-yellow-50',
            low: 'border-green-500 bg-green-50'
          };
          
          const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
          
          return `
            <div class="bg-white rounded-lg shadow-md p-4 border-l-4 ${priorityColors[t.priority] || 'border-gray-500 bg-gray-50'}">
              <div class="flex items-start justify-between">
                <div class="flex items-start flex-1">
                  <input type="checkbox" 
                    ${t.status === 'completed' ? 'checked' : ''} 
                    onchange="toggleTodoStatus(${t.id}, this.checked)"
                    class="mt-1 mr-3 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-800 ${t.status === 'completed' ? 'line-through text-gray-500' : ''}">${t.title}</h4>
                    ${t.description ? `<p class="text-sm text-gray-600 mt-1">${t.description}</p>` : ''}
                    <div class="flex gap-4 mt-2 text-xs text-gray-500">
                      ${t.due_date ? `
                        <span class="${isOverdue ? 'text-red-600 font-semibold' : ''}">
                          <i class="fas fa-calendar mr-1"></i>${dayjs(t.due_date).format('YYYY/MM/DD')}
                          ${isOverdue ? ' (期限切れ)' : ''}
                        </span>
                      ` : ''}
                      <span><i class="fas fa-flag mr-1"></i>${t.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function renderMatchingTab() {
  const matches = currentProspect.matches || [];
  const p = currentProspect.prospect;
  
  return `
    <div class="mb-4 flex justify-end">
      <button onclick="findMatches(${p.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
        <i class="fas fa-sync mr-2"></i>人脈マッチング実行
      </button>
    </div>

    ${matches.length === 0 ? `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-user-friends text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">人脈マッチングがまだ実行されていません</h3>
        <p class="text-gray-600 mb-4">AIが自動的に有望な人脈をピックアップします</p>
        <button onclick="findMatches(${p.id})" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition">
          <i class="fas fa-sync mr-2"></i>マッチング実行
        </button>
      </div>
    ` : `
      <div class="space-y-4">
        ${matches.map(m => `
          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${m.person_name}</h3>
                <p class="text-sm text-gray-600">${m.company || ''} ${m.position || ''}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  マッチ度: ${Math.round(m.match_score * 100)}%
                </span>
                <span class="px-3 py-1 ${
                  m.status === 'suggested' ? 'bg-blue-100 text-blue-800' :
                  m.status === 'approved' ? 'bg-green-100 text-green-800' :
                  m.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                } rounded-full text-sm font-semibold">
                  ${m.status}
                </span>
              </div>
            </div>
            
            <div class="mb-4">
              <span class="text-sm font-semibold text-gray-600">マッチング理由:</span>
              <p class="text-sm text-gray-700 mt-1">${m.match_reason}</p>
            </div>
            
            ${m.status === 'suggested' ? `
              <div class="flex gap-2">
                <button onclick="approveMatch(${m.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                  <i class="fas fa-check mr-2"></i>承認
                </button>
                <button onclick="rejectMatch(${m.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition">
                  <i class="fas fa-times mr-2"></i>却下
                </button>
              </div>
            ` : m.status === 'approved' ? `
              <button onclick="generateIntroductionEmail(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
                <i class="fas fa-envelope mr-2"></i>紹介メール作成
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ==================== CONNECTIONS VIEW ====================

async function loadConnections() {
  try {
    const response = await axios.get('/api/networking/connections', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      connections = response.data.connections;
    }
  } catch (error) {
    console.error('Failed to load connections:', error);
  }
}

function renderConnectionsView() {
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800">人脈管理</h2>
      <button onclick="showNewConnectionModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
        <i class="fas fa-plus mr-2"></i>新規人脈追加
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${connections.length === 0 ? `
        <div class="col-span-3 bg-white rounded-xl shadow-md p-8 text-center">
          <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
          <h3 class="text-xl font-bold text-gray-800 mb-2">人脈がまだ登録されていません</h3>
          <p class="text-gray-600 mb-4">ビジネス人脈を登録して、マッチング機能を活用しましょう</p>
          <button onclick="showNewConnectionModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition">
            <i class="fas fa-plus mr-2"></i>人脈を登録
          </button>
        </div>
      ` : connections.map(c => `
        <div class="bg-white rounded-xl shadow-md p-6">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-gray-800">${c.person_name}</h3>
              <p class="text-sm text-gray-600">${c.company || ''} ${c.position || ''}</p>
            </div>
            <span class="px-2 py-1 ${
              c.relationship_strength === 'strong' ? 'bg-green-100 text-green-800' :
              c.relationship_strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            } rounded-full text-xs font-semibold">
              ${c.relationship_strength}
            </span>
          </div>
          
          ${c.industry ? `<p class="text-sm text-gray-600 mb-2"><i class="fas fa-industry mr-1"></i>${c.industry}</p>` : ''}
          ${c.expertise ? `<p class="text-sm text-gray-600 mb-2"><i class="fas fa-lightbulb mr-1"></i>${c.expertise}</p>` : ''}
          ${c.email ? `<p class="text-sm text-gray-600 mb-2"><i class="fas fa-envelope mr-1"></i>${c.email}</p>` : ''}
          
          ${c.last_contact_date ? `
            <p class="text-xs text-gray-500 mt-3">
              最終接触: ${dayjs(c.last_contact_date).format('YYYY/MM/DD')}
            </p>
          ` : ''}
          
          <div class="flex gap-2 mt-4">
            <button onclick="editConnection(${c.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteConnection(${c.id})" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== ANALYTICS VIEW ====================

// ==================== APPOINTMENTS VIEW ====================

async function loadAppointments(month = null) {
  try {
    // Load both meetings and new_appointments
    let meetingsUrl = '/api/meetings';
    let appointmentsUrl = '/api/new-appointments';
    
    if (month) {
      meetingsUrl += `?month=${month}`;
      appointmentsUrl += `?month=${month}`;
    }
    
    const [meetingsResponse, appointmentsResponse] = await Promise.all([
      axios.get(meetingsUrl, {
        headers: { 'X-Session-Token': sessionToken }
      }),
      axios.get(appointmentsUrl, {
        headers: { 'X-Session-Token': sessionToken }
      })
    ]);
    
    const meetings = meetingsResponse.data.success ? (meetingsResponse.data.meetings || []) : [];
    const newAppointments = appointmentsResponse.data.success ? (appointmentsResponse.data.appointments || []) : [];
    
    // Convert new_appointments to meeting format for display
    const convertedAppointments = newAppointments.map(apt => ({
      id: `apt_${apt.id}`,
      prospect_id: null, // Will try to find matching prospect
      meeting_date: apt.appointment_datetime,
      meeting_type: getAppointmentType(apt.method),
      location: getAppointmentLocation(apt.method),
      duration: 60, // Default duration
      status: getMeetingStatus(apt.status),
      notes: apt.notes || `[新規アポイント]\n会社: ${apt.company_name}\n担当者: ${apt.contact_name}\n方法: ${apt.method}`,
      created_at: apt.created_at,
      // Include original appointment data for display
      _source: 'new_appointment',
      _company_name: apt.company_name,
      _contact_name: apt.contact_name,
      _method: apt.method,
      _appointment_status: apt.status
    }));
    
    // Combine and sort by date (newest first)
    const allAppointments = [...meetings, ...convertedAppointments].sort((a, b) => 
      new Date(b.meeting_date) - new Date(a.meeting_date)
    );
    
    return allAppointments;
  } catch (error) {
    console.error('Failed to load appointments:', error);
    showToast('アポイント履歴の読み込みに失敗しました', 'error');
    return [];
  }
}

// Helper functions to convert appointment data to meeting format
function getAppointmentType(method) {
  const typeMap = {
    'phone': 'initial',
    'email': 'initial',
    'dm': 'initial',
    'referral': 'initial',
    'event': 'initial',
    'website': 'initial',
    'other': 'follow_up'
  };
  return typeMap[method] || 'initial';
}

function getAppointmentLocation(method) {
  const locationMap = {
    'phone': '電話',
    'email': 'メール',
    'dm': 'DM',
    'referral': '紹介経由',
    'event': 'イベント',
    'website': 'オンライン',
    'other': 'その他'
  };
  return locationMap[method] || 'オンライン';
}

function getMeetingStatus(appointmentStatus) {
  const statusMap = {
    '見込み外': 'cancelled',
    '見込み化': 'completed',
    '商談': 'completed',
    '契約': 'completed',
    '入金済み': 'completed',
    '協業候補': 'completed',
    '協業先': 'completed'
  };
  return statusMap[appointmentStatus] || 'scheduled';
}

function filterAppointmentsByMonth() {
  renderAppointmentsView();
}

async function renderAppointmentsView() {
  const contentArea = document.getElementById('content-area');
  
  // Show loading state
  contentArea.innerHTML = `
    <div class="text-center py-8">
      <i class="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      <p class="mt-4 text-gray-600">アポイント履歴を読み込み中...</p>
    </div>
  `;
  
  const month = document.getElementById('appointments-month-filter')?.value || null;
  const appointments = await loadAppointments(month);
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            <i class="fas fa-calendar-check mr-2 text-indigo-600"></i>アポイント履歴
          </h2>
          <p class="text-gray-600 text-sm">過去のアポイント・商談履歴をスプレッドシート形式で確認</p>
        </div>
        <select id="appointments-month-filter" onchange="filterAppointmentsByMonth()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="">全期間</option>
          ${generateMonthOptions()}
        </select>
      </div>
    </div>

    <!-- Appointments Table (Spreadsheet Style) -->
    <div class="bg-white rounded-xl shadow-md overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">日付</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">時刻</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">会社名</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">担当者</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">タイプ</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">場所</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">時間</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ステータス</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap" style="min-width: 200px;">メモ</th>
            <th class="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">アクション</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${appointments.length === 0 ? `
            <tr>
              <td colspan="10" class="px-4 py-8 text-center text-gray-500">
                <i class="fas fa-calendar-times text-4xl mb-2 text-gray-400"></i>
                <p>アポイント履歴がまだ登録されていません</p>
              </td>
            </tr>
          ` : appointments.map(apt => {
            const prospect = prospects.find(p => p.id === apt.prospect_id);
            const typeColors = {
              'initial': 'bg-blue-100 text-blue-800',
              'follow_up': 'bg-yellow-100 text-yellow-800',
              'proposal': 'bg-purple-100 text-purple-800',
              'closing': 'bg-green-100 text-green-800',
              'other': 'bg-gray-100 text-gray-800'
            };
            const typeLabels = {
              'initial': '初回',
              'follow_up': 'フォロー',
              'proposal': '提案',
              'closing': 'クロージング',
              'other': 'その他'
            };
            const statusColors = {
              'scheduled': 'bg-blue-100 text-blue-800',
              'completed': 'bg-green-100 text-green-800',
              'cancelled': 'bg-red-100 text-red-800',
              'rescheduled': 'bg-yellow-100 text-yellow-800'
            };
            const statusLabels = {
              'scheduled': '予定',
              'completed': '完了',
              'cancelled': 'キャンセル',
              'rescheduled': '再調整'
            };
            
            return `
              <tr class="hover:bg-gray-50 transition">
                <td class="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">${dayjs(apt.meeting_date).format('YYYY/MM/DD')}</td>
                <td class="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">${dayjs(apt.meeting_date).format('HH:mm')}</td>
                <td class="px-3 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                  ${apt._source === 'new_appointment' ? apt._company_name : (prospect ? prospect.company_name : '-')}
                  ${apt._source === 'new_appointment' ? '<span class="ml-1 text-xs text-blue-600">[新規]</span>' : ''}
                </td>
                <td class="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                  ${apt._source === 'new_appointment' ? apt._contact_name : (prospect ? (prospect.contact_name || '-') : '-')}
                </td>
                <td class="px-3 py-3 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${typeColors[apt.meeting_type] || 'bg-gray-100 text-gray-800'}">
                    ${typeLabels[apt.meeting_type] || apt.meeting_type}
                  </span>
                </td>
                <td class="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">${apt.location || '-'}</td>
                <td class="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">${apt.duration || '-'}分</td>
                <td class="px-3 py-3 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[apt.status] || 'bg-gray-100 text-gray-800'}">
                    ${statusLabels[apt.status] || apt.status}
                  </span>
                </td>
                <td class="px-3 py-3 text-sm text-gray-600" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${apt.notes || '-'}
                </td>
                <td class="px-3 py-3 text-center whitespace-nowrap">
                  <button onclick="viewProspect(${apt.prospect_id})" class="text-indigo-600 hover:text-indigo-800 mr-2" title="見込み客詳細">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button onclick="editAppointment(${apt.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="編集">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteAppointment(${apt.id})" class="text-red-600 hover:text-red-800" title="削除">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function editAppointment(appointmentId) {
  try {
    const response = await axios.get(`/api/meetings/${appointmentId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (!response.data.success) {
      showToast('アポイント情報の取得に失敗しました', 'error');
      return;
    }
    
    const meeting = response.data.meeting;
    
    const modal = document.createElement('div');
    modal.id = 'edit-appointment-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    `;
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-edit mr-2 text-blue-600"></i>アポイントを編集
          </h2>
          <button onclick="document.getElementById('edit-appointment-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitEditAppointment(event, ${appointmentId})" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">商談日 <span class="text-red-500">*</span></label>
              <input type="date" id="edit_meeting_date" value="${meeting.meeting_date || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">商談種別</label>
              <input type="text" id="edit_meeting_type" value="${meeting.meeting_type || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">参加者</label>
            <input type="text" id="edit_attendees" value="${meeting.attendees || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">場所</label>
              <input type="text" id="edit_location" value="${meeting.location || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">時間（分）</label>
              <input type="number" id="edit_duration_minutes" value="${meeting.duration_minutes || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">議題</label>
            <textarea id="edit_agenda" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${meeting.agenda || ''}</textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">議事録</label>
            <textarea id="edit_minutes" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${meeting.minutes || ''}</textarea>
          </div>
          
          <div class="flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('edit-appointment-modal').remove()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load appointment:', error);
    showToast('アポイント情報の取得に失敗しました', 'error');
  }
}

async function submitEditAppointment(event, appointmentId) {
  event.preventDefault();
  
  const formData = {
    meeting_date: document.getElementById('edit_meeting_date').value,
    meeting_type: document.getElementById('edit_meeting_type').value || null,
    attendees: document.getElementById('edit_attendees').value || null,
    location: document.getElementById('edit_location').value || null,
    duration_minutes: parseInt(document.getElementById('edit_duration_minutes').value) || null,
    agenda: document.getElementById('edit_agenda').value || null,
    minutes: document.getElementById('edit_minutes').value || null
  };
  
  try {
    const response = await axios.put(`/api/meetings/${appointmentId}`, formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('アポイントを更新しました', 'success');
      document.getElementById('edit-appointment-modal').remove();
      renderAppointmentsView();
    }
  } catch (error) {
    console.error('Failed to update appointment:', error);
    showToast('アポイントの更新に失敗しました', 'error');
  }
}

async function deleteAppointment(appointmentId) {
  if (!confirm('このアポイントを削除してもよろしいですか？')) return;
  
  try {
    await axios.delete(`/api/meetings/${appointmentId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    showToast('アポイントを削除しました', 'success');
    renderAppointmentsView();
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    showToast('アポイントの削除に失敗しました', 'error');
  }
}

// ==================== KANBAN VIEW ====================

function filterKanbanByMonth() {
  const month = document.getElementById('kanban-month-filter')?.value || null;
  loadProspects('updated_at', 'all', month).then(() => {
    renderKanbanView();
  });
}

async function renderKanbanView() {
  const contentArea = document.getElementById('content-area');
  
  // Load latest prospects data
  await loadProspects();
  
  // Separate prospects into customer list and partnership list
  // Exclude "not_qualified" from pipeline
  const customerProspects = prospects.filter(p => 
    p.is_partnership === 0 && p.status !== 'not_qualified'
  );
  const partnershipProspects = prospects.filter(p => 
    p.is_partnership === 1 && p.status !== 'not_qualified'
  );
  
  // Get prospects with next_meeting_date (日程調整中)
  const scheduledProspects = prospects.filter(p => 
    p.next_meeting_date && p.status !== 'not_qualified'
  );
  
  // Customer pipeline columns: 日程調整中 → 見込み化 → 商談 → 契約 → 入金済み
  const customerColumns = {
    scheduled: { title: '日程調整中', color: 'purple', prospects: scheduledProspects.filter(p => p.is_partnership === 0) },
    qualified: { title: '見込み化', color: 'blue', prospects: [] },
    negotiating: { title: '商談', color: 'yellow', prospects: [] },
    contracted: { title: '契約', color: 'orange', prospects: [] },
    paid: { title: '入金済み', color: 'green', prospects: [] }
  };
  
  // Partnership pipeline columns: 日程調整中 → 協業候補 → 協業先
  const partnershipColumns = {
    scheduled: { title: '日程調整中', color: 'purple', prospects: scheduledProspects.filter(p => p.is_partnership === 1) },
    partnership_candidate: { title: '協業候補', color: 'indigo', prospects: [] },
    partnership: { title: '協業先', color: 'teal', prospects: [] }
  };
  
  // Group customer prospects by status
  customerProspects.forEach(p => {
    if (customerColumns[p.status]) {
      customerColumns[p.status].prospects.push(p);
    }
  });
  
  // Group partnership prospects by status
  partnershipProspects.forEach(p => {
    if (partnershipColumns[p.status]) {
      partnershipColumns[p.status].prospects.push(p);
    }
  });
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            <i class="fas fa-th mr-2 text-indigo-600"></i>営業カンバンボード
          </h2>
          <p class="text-gray-600 text-sm">顧客と協業で分けて管理。見込み外は表示されません</p>
        </div>
        <select id="kanban-month-filter" onchange="filterKanbanByMonth()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="">全期間</option>
          ${generateMonthOptions()}
        </select>
      </div>
    </div>

    <!-- Customer Pipeline (顧客リスト) -->
    <div class="mb-8">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-users mr-2 text-blue-600"></i>顧客リスト
      </h3>
      <div class="flex gap-4 overflow-x-auto pb-4">
        ${Object.keys(customerColumns).map(status => {
          const col = customerColumns[status];
          return renderKanbanColumn(status, col, 0);
        }).join('')}
      </div>
    </div>

    <!-- Partnership Pipeline (協業リスト) -->
    <div class="mb-8">
      <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-handshake mr-2 text-purple-600"></i>協業リスト
      </h3>
      <div class="flex gap-4 overflow-x-auto pb-4">
        ${Object.keys(partnershipColumns).map(status => {
          const col = partnershipColumns[status];
          return renderKanbanColumn(status, col, 1);
        }).join('')}
      </div>
    </div>

  `;
}

// Render a single kanban column
function renderKanbanColumn(status, col, isPartnership) {
  return `
    <div class="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4" data-status="${status}" data-partnership="${isPartnership}">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-800 flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-${col.color}-500"></span>
          ${col.title}
          <span class="ml-2 px-2 py-1 bg-${col.color}-100 text-${col.color}-800 rounded-full text-xs font-semibold">
            ${col.prospects.length}
          </span>
        </h3>
      </div>
      
      <div class="space-y-3 kanban-drop-zone min-h-[200px]" ondrop="handleDrop(event, '${status}', ${isPartnership})" ondragover="handleDragOver(event)">
        ${col.prospects.map(p => `
          <div 
            class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition cursor-move"
            draggable="true"
            ondragstart="handleDragStart(event, ${p.id})"
            onclick="event.stopPropagation(); viewProspect(${p.id})"
          >
            <h4 class="font-semibold text-gray-800 mb-2">${p.company_name}</h4>
            ${p.contact_name ? `<p class="text-sm text-gray-600 mb-2">${p.contact_name}</p>` : ''}
            
            ${p.next_meeting_date && status === 'scheduled' ? 
              `<div class="mb-2 text-xs text-purple-600 font-semibold">
                <i class="fas fa-calendar mr-1"></i>${dayjs(p.next_meeting_date).format('MM/DD HH:mm')}
              </div>` : ''}
            
            <div class="flex items-center justify-between text-xs text-gray-500">
              <div class="flex items-center gap-2">
                ${p.priority === 'urgent' || p.priority === 'high' ? 
                  `<span class="px-2 py-1 bg-red-100 text-red-600 rounded-full font-semibold">
                    <i class="fas fa-fire"></i>
                  </span>` : ''}
                ${p.meeting_count > 0 ? 
                  `<span class="flex items-center gap-1">
                    <i class="fas fa-handshake"></i> ${p.meeting_count}
                  </span>` : ''}
                ${p.contact_count > 0 ? 
                  `<span class="flex items-center gap-1 text-blue-600">
                    <i class="fas fa-phone"></i> ${p.contact_count}
                  </span>` : ''}
              </div>
              <span>${dayjs(p.updated_at).format('MM/DD')}</span>
            </div>
            
            ${p.estimated_value ? 
              `<div class="mt-2 pt-2 border-t border-gray-100">
                <span class="text-sm font-semibold text-green-600">¥${(p.estimated_value / 10000).toFixed(0)}万</span>
              </div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Drag and Drop handlers for Kanban
let draggedProspectId = null;

function handleDragStart(event, prospectId) {
  draggedProspectId = prospectId;
  event.dataTransfer.effectAllowed = 'move';
  event.target.style.opacity = '0.5';
}

function handleDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  event.dataTransfer.dropEffect = 'move';
  return false;
}

async function handleDrop(event, newStatus, isPartnership) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }
  
  if (!draggedProspectId) return false;
  
  try {
    // Update prospect status and partnership flag
    await axios.put(`/api/prospects/${draggedProspectId}`, {
      status: newStatus === 'scheduled' ? 'qualified' : newStatus, // scheduled is special
      is_partnership: isPartnership
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    // Reload prospects and refresh view
    await loadProspects();
    renderKanbanView();
    showToast('ステータスを更新しました', 'success');
  } catch (error) {
    console.error('Failed to update status:', error);
    showToast('ステータス更新に失敗しました', 'error');
  }
  
  draggedProspectId = null;
  return false;
}

// ==================== KPI VIEW ====================

function renderKPIView() {
  const contentArea = document.getElementById('content-area');
  
  // Calculate KPIs
  const totalProspects = prospects.length;
  const wonDeals = prospects.filter(p => p.status === 'won').length;
  const lostDeals = prospects.filter(p => p.status === 'lost').length;
  const activeDeals = prospects.filter(p => !['won', 'lost'].includes(p.status)).length;
  
  const conversionRate = totalProspects > 0 ? ((wonDeals / totalProspects) * 100).toFixed(1) : 0;
  const winRate = (wonDeals + lostDeals) > 0 ? ((wonDeals / (wonDeals + lostDeals)) * 100).toFixed(1) : 0;
  
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const wonValue = prospects.filter(p => p.status === 'won').reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const pipelineValue = prospects.filter(p => !['won', 'lost'].includes(p.status)).reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  
  const avgDealSize = wonDeals > 0 ? (wonValue / wonDeals) : 0;
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        <i class="fas fa-chart-line mr-2 text-indigo-600"></i>KPIダッシュボード
      </h2>
      <p class="text-gray-600 text-sm">営業活動の主要指標を一目で確認</p>
    </div>

    <!-- Secondary Metrics -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-6 shadow-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800">平均単価</h3>
          <i class="fas fa-yen-sign text-2xl text-green-500"></i>
        </div>
        <div class="text-3xl font-bold text-gray-800">¥${(avgDealSize / 10000).toFixed(1)}<span class="text-lg">万</span></div>
        <div class="text-sm text-gray-500 mt-2">成約案件平均</div>
      </div>
      
      <div class="bg-white rounded-xl p-6 shadow-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800">成約件数</h3>
          <i class="fas fa-trophy text-2xl text-yellow-500"></i>
        </div>
        <div class="text-3xl font-bold text-gray-800">${wonDeals} <span class="text-lg">件</span></div>
        <div class="text-sm text-gray-500 mt-2">累計成約数</div>
      </div>
      
      <div class="bg-white rounded-xl p-6 shadow-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800">失注件数</h3>
          <i class="fas fa-times-circle text-2xl text-red-500"></i>
        </div>
        <div class="text-3xl font-bold text-gray-800">${lostDeals} <span class="text-lg">件</span></div>
        <div class="text-sm text-gray-500 mt-2">累計失注数</div>
      </div>
    </div>

    <!-- Stage Breakdown -->
    <div class="bg-white rounded-xl shadow-md p-6 mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4">
        <i class="fas fa-funnel-dollar mr-2 text-indigo-600"></i>営業ファネル
      </h3>
      <div class="space-y-3">
        ${renderFunnelStage('新規', 'new', 'blue')}
        ${renderFunnelStage('リサーチ中', 'researching', 'purple')}
        ${renderFunnelStage('コンタクト済', 'contacted', 'yellow')}
        ${renderFunnelStage('商談予定', 'meeting_scheduled', 'orange')}
        ${renderFunnelStage('商談中', 'negotiating', 'indigo')}
        ${renderFunnelStage('成約', 'won', 'green')}
      </div>
    </div>

    <!-- Charts Placeholder -->
    <div class="grid grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">月別成約推移</h3>
        <div class="text-center text-gray-400 py-8">
          <i class="fas fa-chart-line text-4xl mb-2"></i>
          <p class="text-sm">Chart.js統合予定</p>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">業界別分布</h3>
        <div class="text-center text-gray-400 py-8">
          <i class="fas fa-chart-pie text-4xl mb-2"></i>
          <p class="text-sm">Chart.js統合予定</p>
        </div>
      </div>
    </div>
  `;
}

function renderFunnelStage(label, status, color) {
  const count = prospects.filter(p => p.status === status).length;
  const total = prospects.length;
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  
  return `
    <div class="flex items-center gap-4">
      <div class="w-32 text-sm font-medium text-gray-700">${label}</div>
      <div class="flex-1">
        <div class="bg-gray-100 rounded-full h-8 relative overflow-hidden">
          <div class="bg-${color}-500 h-full rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
          <div class="absolute inset-0 flex items-center justify-between px-4">
            <span class="text-sm font-semibold ${percentage > 30 ? 'text-white' : 'text-gray-700'}">${count} 件</span>
            <span class="text-sm font-semibold text-gray-700">${percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==================== ANALYTICS VIEW ====================

async function renderAnalyticsView() {
  const contentArea = document.getElementById('content-area');
  
  // Show loading
  contentArea.innerHTML = `
    <div class="text-center py-8">
      <i class="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      <p class="mt-4 text-gray-600">データを読み込み中...</p>
    </div>
  `;
  
  // Calculate analytics
  const totalProspects = prospects.length;
  const activeProspects = prospects.filter(p => ['new', 'contacted', 'negotiating'].includes(p.status)).length;
  const wonDeals = prospects.filter(p => p.status === 'won').length;
  const lostDeals = prospects.filter(p => p.status === 'lost').length;
  const conversionRate = totalProspects > 0 ? ((wonDeals / totalProspects) * 100).toFixed(1) : 0;
  
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const wonValue = prospects.filter(p => p.status === 'won').reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  
  // Load Notta analyses
  const nottaAnalyses = await loadNottaAnalyses();
  
  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold text-gray-800 mb-6">
      <i class="fas fa-chart-pie mr-2 text-indigo-600"></i>営業分析ダッシュボード
    </h2>

    <!-- Notta Analyses Section -->
    <div class="mb-6">
      <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-microphone-alt mr-2 text-orange-600"></i>Notta議事録分析
        </h3>
        
        ${nottaAnalyses.length === 0 ? `
          <div class="text-center py-8">
            <i class="fas fa-inbox text-4xl mb-3 text-gray-400"></i>
            <p class="text-gray-600">Notta議事録がまだ登録されていません</p>
            <p class="text-sm text-gray-500 mt-2">見込み客作成時にNottaリンクを入力すると、AIが自動で議事録を分析します</p>
          </div>
        ` : `
          <div class="space-y-4">
            ${nottaAnalyses.map(analysis => {
              const prospect = prospects.find(p => p.id === analysis.prospect_id);
              let analysisData = null;
              try {
                analysisData = JSON.parse(analysis.analysis_result || '{}');
              } catch (e) {
                analysisData = {};
              }
              
              return `
                <div class="bg-white rounded-lg p-5 shadow border border-orange-200">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h4 class="font-bold text-gray-800 text-lg">
                        ${prospect ? prospect.company_name : '不明な会社'}
                      </h4>
                      <p class="text-sm text-gray-600">
                        ${prospect && prospect.contact_name ? `担当: ${prospect.contact_name}` : ''}
                        ${analysis.analyzed_at ? ` | 分析日: ${dayjs(analysis.analyzed_at).format('YYYY/MM/DD HH:mm')}` : ''}
                      </p>
                    </div>
                    <a href="${analysis.notta_link}" target="_blank" class="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-sm">
                      <i class="fas fa-external-link-alt mr-1"></i>Nottaで開く
                    </a>
                  </div>
                  
                  ${analysisData.summary ? `
                    <div class="mb-3">
                      <h5 class="font-semibold text-gray-700 mb-2 flex items-center">
                        <i class="fas fa-file-alt text-blue-600 mr-2"></i>要約
                      </h5>
                      <p class="text-gray-700 text-sm bg-blue-50 p-3 rounded-lg">${analysisData.summary}</p>
                    </div>
                  ` : ''}
                  
                  ${analysisData.key_points && analysisData.key_points.length > 0 ? `
                    <div class="mb-3">
                      <h5 class="font-semibold text-gray-700 mb-2 flex items-center">
                        <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>重要ポイント
                      </h5>
                      <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                        ${analysisData.key_points.map(point => `<li>${point}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                  
                  ${analysisData.action_items && analysisData.action_items.length > 0 ? `
                    <div class="mb-3">
                      <h5 class="font-semibold text-gray-700 mb-2 flex items-center">
                        <i class="fas fa-tasks text-green-600 mr-2"></i>アクションアイテム
                      </h5>
                      <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                        ${analysisData.action_items.map(item => `<li>${item}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                  
                  ${analysisData.sentiment ? `
                    <div>
                      <h5 class="font-semibold text-gray-700 mb-2 flex items-center">
                        <i class="fas fa-smile text-purple-600 mr-2"></i>商談の雰囲気
                      </h5>
                      <div class="inline-flex items-center px-3 py-1 rounded-full ${
                        analysisData.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        analysisData.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }">
                        <i class="fas fa-${
                          analysisData.sentiment === 'positive' ? 'smile-beam' :
                          analysisData.sentiment === 'negative' ? 'frown' :
                          'meh'
                        } mr-2"></i>
                        ${
                          analysisData.sentiment === 'positive' ? 'ポジティブ' :
                          analysisData.sentiment === 'negative' ? 'ネガティブ' :
                          '中立'
                        }
                      </div>
                    </div>
                  ` : ''}
                  
                  ${!analysisData.summary && !analysisData.key_points ? `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p class="text-sm text-yellow-800 flex items-center">
                        <i class="fas fa-hourglass-half mr-2"></i>
                        分析処理中です...しばらくお待ちください
                      </p>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">ステータス別分布</h3>
        <canvas id="status-chart"></canvas>
      </div>
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">優先度別分布</h3>
        <canvas id="priority-chart"></canvas>
      </div>
    </div>
  `;
  
  // Render charts (would need Chart.js implementation)
}

async function loadNottaAnalyses() {
  try {
    const response = await axios.get('/api/notta-analyses', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      return response.data.analyses || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to load Notta analyses:', error);
    return [];
  }
}

// ==================== UTILITY FUNCTIONS ====================

async function generateResearch(prospectId) {
  showToast('AI事前リサーチを生成中...', 'info');
  
  try {
    const response = await axios.post(`/api/prospects/${prospectId}/research`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('事前リサーチを生成しました', 'success');
      await viewProspect(prospectId);
      switchProspectTab('research');
    }
  } catch (error) {
    console.error('Failed to generate research:', error);
    showToast('事前リサーチの生成に失敗しました', 'error');
  }
}

async function findMatches(prospectId) {
  showToast('人脈マッチングを実行中...', 'info');
  
  try {
    const response = await axios.post(`/api/networking/matches/${prospectId}/generate`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast(`${response.data.matches.length}件のマッチングが見つかりました`, 'success');
      await viewProspect(prospectId);
      switchProspectTab('matching');
    }
  } catch (error) {
    console.error('Failed to find matches:', error);
    showToast('人脈マッチングに失敗しました', 'error');
  }
}

async function generateThankYouEmails(meetingId) {
  showToast('お礼メールを生成中...', 'info');
  
  try {
    const response = await axios.post(`/api/meetings/${meetingId}/generate-thank-you-emails`, {
      referrer_name: '', // Would prompt user
      referrer_email: ''
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('お礼メールを生成しました', 'success');
      // Show emails in modal
    }
  } catch (error) {
    console.error('Failed to generate emails:', error);
    showToast('メール生成に失敗しました', 'error');
  }
}

async function generatePMReport(meetingId) {
  showToast('PM報告書を生成中...', 'info');
  
  try {
    const response = await axios.post(`/api/meetings/${meetingId}/generate-pm-report`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('PM報告書を生成しました', 'success');
      // Show report in modal
    }
  } catch (error) {
    console.error('Failed to generate PM report:', error);
    showToast('報告書生成に失敗しました', 'error');
  }
}

async function toggleTodoStatus(todoId, isCompleted) {
  try {
    await axios.put(`/api/meetings/todos/${todoId}`, {
      status: isCompleted ? 'completed' : 'pending'
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    showToast('ToDoステータスを更新しました', 'success');
  } catch (error) {
    console.error('Failed to update todo:', error);
    showToast('更新に失敗しました', 'error');
  }
}

async function approveMatch(matchId) {
  try {
    await axios.put(`/api/networking/matches/${matchId}/status`, {
      status: 'approved'
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    showToast('マッチングを承認しました', 'success');
    await viewProspect(currentProspect.prospect.id);
    switchProspectTab('matching');
  } catch (error) {
    console.error('Failed to approve match:', error);
    showToast('承認に失敗しました', 'error');
  }
}

async function rejectMatch(matchId) {
  try {
    await axios.put(`/api/networking/matches/${matchId}/status`, {
      status: 'rejected'
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    showToast('マッチングを却下しました', 'success');
    await viewProspect(currentProspect.prospect.id);
    switchProspectTab('matching');
  } catch (error) {
    console.error('Failed to reject match:', error);
    showToast('却下に失敗しました', 'error');
  }
}

async function generateIntroductionEmail(matchId) {
  showToast('紹介メールを生成中...', 'info');
  
  try {
    const response = await axios.post(`/api/networking/matches/${matchId}/generate-introduction`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('紹介メールを生成しました', 'success');
      // Show introduction in modal
    }
  } catch (error) {
    console.error('Failed to generate introduction:', error);
    showToast('紹介メール生成に失敗しました', 'error');
  }
}

// Modal functions
function showNewProspectModal() {
  const modal = document.createElement('div');
  modal.id = 'prospect-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    overflow-y: auto;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-building mr-2 text-indigo-600"></i>新規見込み客追加
        </h2>
        <button onclick="closeProspectModal()" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="p-6">
        <form id="new-prospect-form" onsubmit="submitNewProspect(event)">
          <!-- Company Information -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-building text-indigo-600 mr-2"></i>企業情報
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">会社名 <span class="text-red-500">*</span></label>
                <input type="text" id="company_name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">会社URL</label>
                <input type="url" id="company_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">業界</label>
                <input type="text" id="industry" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">企業規模</label>
                <select id="company_size" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">選択してください</option>
                  <option value="1-10">1-10名</option>
                  <option value="11-50">11-50名</option>
                  <option value="51-200">51-200名</option>
                  <option value="201-500">201-500名</option>
                  <option value="501+">501名以上</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Contact Information -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-user text-green-600 mr-2"></i>担当者情報
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">担当者名</label>
                <input type="text" id="contact_name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">役職</label>
                <input type="text" id="contact_position" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                <input type="email" id="contact_email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
                <input type="tel" id="contact_phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
            </div>
          </div>

          <!-- Sales Information -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-chart-line text-blue-600 mr-2"></i>営業情報
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                <select id="status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="qualified">見込み化</option>
                  <option value="not_qualified">見込み外</option>
                  <option value="negotiating">商談</option>
                  <option value="contracted">契約</option>
                  <option value="paid">入金済み</option>
                  <option value="partnership_candidate">協業候補</option>
                  <option value="partnership">協業先</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">優先度</label>
                <select id="priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="medium">中</option>
                  <option value="low">低</option>
                  <option value="high">高</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">リードソース</label>
                <select id="source" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">選択してください</option>
                  <option value="website">Webサイト</option>
                  <option value="referral">紹介</option>
                  <option value="event">イベント</option>
                  <option value="cold_call">テレアポ</option>
                  <option value="social_media">SNS</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">案件種別</label>
                <div class="flex items-center gap-4 pt-2">
                  <label class="flex items-center cursor-pointer">
                    <input type="radio" name="is_partnership" value="0" checked class="mr-2">
                    <span class="text-gray-700">顧客</span>
                  </label>
                  <label class="flex items-center cursor-pointer">
                    <input type="radio" name="is_partnership" value="1" class="mr-2">
                    <span class="text-gray-700">協業</span>
                  </label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">想定案件金額（円）</label>
                <input type="number" id="estimated_value" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1000000">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">成約予定日</label>
                <input type="date" id="expected_close_date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              </div>
            </div>
          </div>

          <!-- Referrer Information -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-user-friends text-pink-600 mr-2"></i>紹介者情報
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-user mr-1 text-pink-600"></i>紹介者名
                </label>
                <input type="text" id="referrer_name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" placeholder="例: 山田太郎">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">紹介者所属</label>
                <input type="text" id="referrer_company" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" placeholder="例: 株式会社ABCD">
              </div>
              <div class="col-span-2">
                <p class="text-xs text-gray-500">紹介者を入力すると、この見込み客の進捗に応じて紹介者ランキングのポイントが自動計算されます</p>
              </div>
            </div>
          </div>

          <!-- Scheduling & Notta -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <i class="fas fa-calendar-alt text-purple-600 mr-2"></i>アポイント・議事録
            </h3>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-calendar-check mr-1 text-purple-600"></i>次回アポイント日時
                </label>
                <input type="datetime-local" id="next_meeting_date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
                <p class="text-xs text-gray-500 mt-1">設定すると「日程調整中」カラムに表示されます</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-microphone-alt mr-1 text-orange-600"></i>Nottaリンク
                </label>
                <input type="url" id="notta_link" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="https://notta.ai/...">
                <p class="text-xs text-gray-500 mt-1">Nottaの議事録URLを入力すると自動で分析されます</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">メモ</label>
            <textarea id="notes" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="特記事項やメモを入力"></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeProspectModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeProspectModal();
    }
  };
  
  document.body.appendChild(modal);
}

function closeProspectModal() {
  const modal = document.getElementById('prospect-modal');
  if (modal) {
    modal.remove();
  }
}

async function submitNewProspect(event) {
  event.preventDefault();
  
  const formData = {
    company_name: document.getElementById('company_name').value,
    company_url: document.getElementById('company_url').value || '',
    industry: document.getElementById('industry').value || '',
    company_size: document.getElementById('company_size').value || '',
    contact_name: document.getElementById('contact_name').value || '',
    contact_position: document.getElementById('contact_position').value || '',
    contact_email: document.getElementById('contact_email').value || '',
    contact_phone: document.getElementById('contact_phone').value || '',
    status: document.getElementById('status').value,
    priority: document.getElementById('priority').value,
    source: document.getElementById('source').value || '',
    is_partnership: parseInt(document.querySelector('input[name="is_partnership"]:checked').value),
    estimated_value: parseInt(document.getElementById('estimated_value').value) || null,
    expected_close_date: document.getElementById('expected_close_date').value || null,
    next_meeting_date: document.getElementById('next_meeting_date').value || null,
    notta_link: document.getElementById('notta_link').value || '',
    notes: document.getElementById('notes').value || '',
    contact_count: 0,
    last_contact_date: new Date().toISOString().split('T')[0]
  };
  
  try {
    const response = await axios.post('/api/prospects', formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      const prospectId = response.data.prospect_id;
      
      // If referrer is provided, create referral entry
      const referrerName = document.getElementById('referrer_name').value;
      const referrerCompany = document.getElementById('referrer_company').value;
      
      if (referrerName) {
        await axios.post('/api/referrals', {
          referrer_name: referrerName,
          referrer_company: referrerCompany || '',
          prospect_id: prospectId,
          referral_date: new Date().toISOString().split('T')[0],
          status: 'active'
        }, {
          headers: { 'X-Session-Token': sessionToken }
        });
      }
      
      showToast('見込み客を登録しました', 'success');
      closeProspectModal();
      await loadProspects();
      renderProspectsView();
    }
  } catch (error) {
    console.error('Failed to create prospect:', error);
    console.error('Error details:', error.response?.data);
    showToast('見込み客の登録に失敗しました: ' + (error.response?.data?.error || error.message), 'error');
  }
}

function showNewConnectionModal() {
  const modal = document.createElement('div');
  modal.id = 'connection-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    overflow-y: auto;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-user-plus mr-2 text-green-600"></i>新規人脈追加
        </h2>
        <button onclick="closeConnectionModal()" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="p-6">
        <form id="new-connection-form" onsubmit="submitNewConnection(event)">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">氏名 <span class="text-red-500">*</span></label>
              <input type="text" id="person_name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">会社名</label>
              <input type="text" id="conn_company" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">役職</label>
              <input type="text" id="conn_position" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">業界</label>
              <input type="text" id="conn_industry" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
              <input type="email" id="conn_email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input type="tel" id="conn_phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
              <input type="url" id="linkedin_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://linkedin.com/in/...">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
              <input type="url" id="instagram_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://instagram.com/...">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
              <input type="url" id="facebook_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://facebook.com/...">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">TikTok URL</label>
              <input type="url" id="tiktok_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://tiktok.com/@...">
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">会社HP URL</label>
              <input type="url" id="company_website_url" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://example.com">
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">メモ</label>
              <textarea id="conn_notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeConnectionModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeConnectionModal();
    }
  };
  
  document.body.appendChild(modal);
}

function closeConnectionModal() {
  const modal = document.getElementById('connection-modal');
  if (modal) {
    modal.remove();
  }
}

async function submitNewConnection(event) {
  event.preventDefault();
  
  const formData = {
    person_name: document.getElementById('person_name').value,
    company: document.getElementById('conn_company').value || '',
    position: document.getElementById('conn_position').value || '',
    industry: document.getElementById('conn_industry').value || '',
    email: document.getElementById('conn_email').value || '',
    phone: document.getElementById('conn_phone').value || '',
    linkedin_url: document.getElementById('linkedin_url').value || '',
    instagram_url: document.getElementById('instagram_url').value || '',
    facebook_url: document.getElementById('facebook_url').value || '',
    tiktok_url: document.getElementById('tiktok_url').value || '',
    company_website_url: document.getElementById('company_website_url').value || '',
    notes: document.getElementById('conn_notes').value || '',
    relationship_strength: 'weak'
  };
  
  try {
    const response = await axios.post('/api/networking', formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('人脈を登録しました', 'success');
      closeConnectionModal();
      await loadConnections();
      if (currentView === 'connections') {
        renderConnectionsView();
      }
    }
  } catch (error) {
    console.error('Failed to create connection:', error);
    showToast('人脈の登録に失敗しました', 'error');
  }
}

function showNewMeetingModal(prospectId) {
  const modal = document.createElement('div');
  modal.id = 'new-meeting-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-calendar-plus mr-2 text-indigo-600"></i>新規商談登録
        </h2>
        <button onclick="document.getElementById('new-meeting-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <form onsubmit="submitNewMeeting(event, ${prospectId})" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">商談日 <span class="text-red-500">*</span></label>
            <input type="date" id="meeting_date" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">商談種別 <span class="text-red-500">*</span></label>
            <select id="meeting_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
              <option value="初回商談">初回商談</option>
              <option value="フォロー商談">フォロー商談</option>
              <option value="提案商談">提案商談</option>
              <option value="成約商談">成約商談</option>
              <option value="その他">その他</option>
            </select>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">参加者 <span class="text-red-500">*</span></label>
          <input type="text" id="attendees" placeholder="例: 山田太郎、田中花子" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">場所</label>
            <input type="text" id="location" placeholder="例: Zoom、東京オフィス" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">時間（分）</label>
            <input type="number" id="duration_minutes" placeholder="60" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">議題</label>
          <textarea id="agenda" rows="2" placeholder="商談の議題を入力" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Notta URL
            <span class="text-xs text-gray-500 ml-2">（Nottaで録音した場合はURLを貼り付けてください）</span>
          </label>
          <input type="url" id="notta_url" placeholder="https://www.notta.ai/..." class="w-full px-3 py-2 border border-gray-300 rounded-lg">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">議事録</label>
          <textarea id="minutes" rows="4" placeholder="商談内容を記録" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">次のアクション</label>
          <textarea id="next_actions" rows="2" placeholder="次にやるべきこと" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
        </div>
        
        <div class="flex justify-end gap-3">
          <button type="button" onclick="document.getElementById('new-meeting-modal').remove()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            キャンセル
          </button>
          <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <i class="fas fa-save mr-2"></i>登録
          </button>
        </div>
      </form>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  // Set today's date as default
  setTimeout(() => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('meeting_date').value = today;
  }, 10);
  
  document.body.appendChild(modal);
}

async function submitNewMeeting(event, prospectId) {
  event.preventDefault();
  
  const formData = {
    prospect_id: prospectId,
    meeting_date: document.getElementById('meeting_date').value,
    meeting_type: document.getElementById('meeting_type').value,
    attendees: document.getElementById('attendees').value,
    location: document.getElementById('location').value || null,
    duration_minutes: parseInt(document.getElementById('duration_minutes').value) || null,
    agenda: document.getElementById('agenda').value || null,
    notta_url: document.getElementById('notta_url').value || null,
    minutes: document.getElementById('minutes').value || null,
    next_actions: document.getElementById('next_actions').value || null
  };
  
  try {
    const response = await axios.post('/api/meetings', formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('商談を登録しました', 'success');
      document.getElementById('new-meeting-modal').remove();
      if (currentProspect && currentProspect.id === prospectId) {
        await viewProspect(prospectId);
      }
    }
  } catch (error) {
    console.error('Failed to create meeting:', error);
    showToast('商談の登録に失敗しました', 'error');
  }
}

function showNewTodoModal(prospectId) {
  const modal = document.createElement('div');
  modal.id = 'new-todo-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-tasks mr-2 text-purple-600"></i>新規ToDo追加
        </h2>
        <button onclick="document.getElementById('new-todo-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <form onsubmit="submitNewTodo(event, ${prospectId})" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">ToDoタイトル <span class="text-red-500">*</span></label>
          <input type="text" id="todo_title" placeholder="例: 提案資料を送付" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">詳細</label>
          <textarea id="todo_description" rows="3" placeholder="ToDoの詳細を入力" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">期限</label>
            <input type="date" id="todo_due_date" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">優先度</label>
            <select id="todo_priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="low">低</option>
              <option value="medium" selected>中</option>
              <option value="high">高</option>
              <option value="urgent">緊急</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end gap-3">
          <button type="button" onclick="document.getElementById('new-todo-modal').remove()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            キャンセル
          </button>
          <button type="submit" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <i class="fas fa-save mr-2"></i>追加
          </button>
        </div>
      </form>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  document.body.appendChild(modal);
}

async function submitNewTodo(event, prospectId) {
  event.preventDefault();
  
  const formData = {
    prospect_id: prospectId,
    title: document.getElementById('todo_title').value,
    description: document.getElementById('todo_description').value || null,
    due_date: document.getElementById('todo_due_date').value || null,
    priority: document.getElementById('todo_priority').value,
    status: 'pending'
  };
  
  try {
    const response = await axios.post('/api/meetings/0/todos', formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('ToDoを追加しました', 'success');
      document.getElementById('new-todo-modal').remove();
      if (currentProspect && currentProspect.id === prospectId) {
        await viewProspect(prospectId);
      }
    }
  } catch (error) {
    console.error('Failed to create todo:', error);
    showToast('ToDoの追加に失敗しました', 'error');
  }
}

async function editProspect(prospectId) {
  try {
    const response = await axios.get(`/api/prospects/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (!response.data.success) {
      showToast('見込み客情報の取得に失敗しました', 'error');
      return;
    }
    
    const prospect = response.data.prospect;
    
    const modal = document.createElement('div');
    modal.id = 'edit-prospect-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    `;
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-edit mr-2 text-indigo-600"></i>見込み客を編集
          </h2>
          <button onclick="document.getElementById('edit-prospect-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitEditProspect(event, ${prospectId})" class="p-6 space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">企業名 <span class="text-red-500">*</span></label>
              <input type="text" id="edit_company_name" value="${prospect.company_name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Webサイト</label>
              <input type="url" id="edit_company_url" value="${prospect.company_url || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">業界</label>
              <input type="text" id="edit_industry" value="${prospect.industry || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">企業規模</label>
              <select id="edit_company_size" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">選択してください</option>
                <option value="1-10" ${prospect.company_size === '1-10' ? 'selected' : ''}>1-10名</option>
                <option value="11-50" ${prospect.company_size === '11-50' ? 'selected' : ''}>11-50名</option>
                <option value="51-200" ${prospect.company_size === '51-200' ? 'selected' : ''}>51-200名</option>
                <option value="201-500" ${prospect.company_size === '201-500' ? 'selected' : ''}>201-500名</option>
                <option value="501+" ${prospect.company_size === '501+' ? 'selected' : ''}>501名以上</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">担当者名</label>
              <input type="text" id="edit_contact_name" value="${prospect.contact_name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">役職</label>
              <input type="text" id="edit_contact_position" value="${prospect.contact_position || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">メール</label>
              <input type="email" id="edit_contact_email" value="${prospect.contact_email || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input type="tel" id="edit_contact_phone" value="${prospect.contact_phone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
              <select id="edit_status" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="new" ${prospect.status === 'new' ? 'selected' : ''}>新規</option>
                <option value="contacted" ${prospect.status === 'contacted' ? 'selected' : ''}>接触済</option>
                <option value="qualified" ${prospect.status === 'qualified' ? 'selected' : ''}>見込みあり</option>
                <option value="negotiating" ${prospect.status === 'negotiating' ? 'selected' : ''}>商談中</option>
                <option value="contracted" ${prospect.status === 'contracted' ? 'selected' : ''}>契約済</option>
                <option value="not_qualified" ${prospect.status === 'not_qualified' ? 'selected' : ''}>見込みなし</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">優先度</label>
              <select id="edit_priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="low" ${prospect.priority === 'low' ? 'selected' : ''}>低</option>
                <option value="medium" ${prospect.priority === 'medium' ? 'selected' : ''}>中</option>
                <option value="high" ${prospect.priority === 'high' ? 'selected' : ''}>高</option>
                <option value="urgent" ${prospect.priority === 'urgent' ? 'selected' : ''}>緊急</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">見込み金額</label>
              <input type="number" id="edit_estimated_value" value="${prospect.estimated_value || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">メモ</label>
            <textarea id="edit_notes" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${prospect.notes || ''}</textarea>
          </div>
          
          <div class="flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('edit-prospect-modal').remove()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load prospect:', error);
    showToast('見込み客情報の取得に失敗しました', 'error');
  }
}

async function submitEditProspect(event, prospectId) {
  event.preventDefault();
  
  const formData = {
    company_name: document.getElementById('edit_company_name').value,
    company_url: document.getElementById('edit_company_url').value || null,
    industry: document.getElementById('edit_industry').value || null,
    company_size: document.getElementById('edit_company_size').value || null,
    contact_name: document.getElementById('edit_contact_name').value || null,
    contact_position: document.getElementById('edit_contact_position').value || null,
    contact_email: document.getElementById('edit_contact_email').value || null,
    contact_phone: document.getElementById('edit_contact_phone').value || null,
    status: document.getElementById('edit_status').value,
    priority: document.getElementById('edit_priority').value,
    estimated_value: parseInt(document.getElementById('edit_estimated_value').value) || null,
    notes: document.getElementById('edit_notes').value || null
  };
  
  try {
    const response = await axios.put(`/api/prospects/${prospectId}`, formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('見込み客を更新しました', 'success');
      document.getElementById('edit-prospect-modal').remove();
      await loadProspects();
      renderProspectsView();
    }
  } catch (error) {
    console.error('Failed to update prospect:', error);
    showToast('見込み客の更新に失敗しました', 'error');
  }
}

async function deleteProspect(prospectId) {
  if (!confirm('この見込み客を削除してもよろしいですか？\n関連する商談・ToDoも削除されます。')) return;
  
  try {
    await axios.delete(`/api/prospects/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    showToast('見込み客を削除しました', 'success');
    await loadProspects();
    renderProspectsView();
  } catch (error) {
    console.error('Failed to delete prospect:', error);
    showToast('見込み客の削除に失敗しました', 'error');
  }
}

async function editConnection(connectionId) {
  try {
    const response = await axios.get(`/api/networking-connections/connections`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (!response.data.success) {
      showToast('人脈情報の取得に失敗しました', 'error');
      return;
    }
    
    const connection = response.data.connections.find(c => c.id === connectionId);
    if (!connection) {
      showToast('人脈が見つかりません', 'error');
      return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'edit-connection-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    `;
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-edit mr-2 text-green-600"></i>人脈を編集
          </h2>
          <button onclick="document.getElementById('edit-connection-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitEditConnection(event, ${connectionId})" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">名前 <span class="text-red-500">*</span></label>
              <input type="text" id="edit_person_name" value="${connection.person_name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">会社名</label>
              <input type="text" id="edit_connection_company" value="${connection.company || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">役職</label>
              <input type="text" id="edit_connection_position" value="${connection.position || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">業界</label>
              <input type="text" id="edit_connection_industry" value="${connection.industry || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">メール</label>
              <input type="email" id="edit_connection_email" value="${connection.email || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">電話</label>
              <input type="tel" id="edit_connection_phone" value="${connection.phone || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">関係強度</label>
            <select id="edit_relationship_strength" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="weak" ${connection.relationship_strength === 'weak' ? 'selected' : ''}>弱い</option>
              <option value="moderate" ${connection.relationship_strength === 'moderate' ? 'selected' : ''}>普通</option>
              <option value="strong" ${connection.relationship_strength === 'strong' ? 'selected' : ''}>強い</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">メモ</label>
            <textarea id="edit_connection_notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${connection.notes || ''}</textarea>
          </div>
          
          <div class="flex justify-end gap-3">
            <button type="button" onclick="document.getElementById('edit-connection-modal').remove()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              キャンセル
            </button>
            <button type="submit" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load connection:', error);
    showToast('人脈情報の取得に失敗しました', 'error');
  }
}

async function submitEditConnection(event, connectionId) {
  event.preventDefault();
  
  const formData = {
    person_name: document.getElementById('edit_person_name').value,
    company: document.getElementById('edit_connection_company').value || null,
    position: document.getElementById('edit_connection_position').value || null,
    industry: document.getElementById('edit_connection_industry').value || null,
    email: document.getElementById('edit_connection_email').value || null,
    phone: document.getElementById('edit_connection_phone').value || null,
    relationship_strength: document.getElementById('edit_relationship_strength').value,
    notes: document.getElementById('edit_connection_notes').value || null
  };
  
  try {
    const response = await axios.put(`/api/networking-connections/connections/${connectionId}`, formData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('人脈を更新しました', 'success');
      document.getElementById('edit-connection-modal').remove();
      await loadConnections();
      renderConnectionsView();
    }
  } catch (error) {
    console.error('Failed to update connection:', error);
    showToast('人脈の更新に失敗しました', 'error');
  }
}

async function deleteConnection(connectionId) {
  if (!confirm('この人脈を削除してもよろしいですか？')) return;
  
  try {
    await axios.delete(`/api/networking-connections/connections/${connectionId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    showToast('人脈を削除しました', 'success');
    await loadConnections();
    renderConnectionsView();
  } catch (error) {
    console.error('Failed to delete connection:', error);
    showToast('人脈の削除に失敗しました', 'error');
  }
}

async function viewMeetingDetail(meetingId) {
  try {
    const response = await axios.get(`/api/meetings/${meetingId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (!response.data.success) {
      showToast('商談情報の取得に失敗しました', 'error');
      return;
    }
    
    const meeting = response.data.meeting;
    const todos = response.data.todos || [];
    
    const modal = document.createElement('div');
    modal.id = 'meeting-detail-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 20px;
    `;
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-calendar-check mr-2 text-indigo-600"></i>商談詳細
          </h2>
          <button onclick="document.getElementById('meeting-detail-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <h3 class="text-sm font-semibold text-gray-600 mb-2">企業名</h3>
              <p class="text-lg">${meeting.company_name || '-'}</p>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-600 mb-2">担当者</h3>
              <p class="text-lg">${meeting.contact_name || '-'}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-6">
            <div>
              <h3 class="text-sm font-semibold text-gray-600 mb-2">商談日</h3>
              <p class="text-lg">${meeting.meeting_date || '-'}</p>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-600 mb-2">種別</h3>
              <p class="text-lg">${meeting.meeting_type || '-'}</p>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-600 mb-2">時間</h3>
              <p class="text-lg">${meeting.duration_minutes ? meeting.duration_minutes + '分' : '-'}</p>
            </div>
          </div>
          
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-2">参加者</h3>
            <p class="text-lg">${meeting.attendees || '-'}</p>
          </div>
          
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-2">場所</h3>
            <p class="text-lg">${meeting.location || '-'}</p>
          </div>
          
          ${meeting.agenda ? `
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-2">議題</h3>
            <p class="text-gray-800 whitespace-pre-wrap">${meeting.agenda}</p>
          </div>
          ` : ''}
          
          ${meeting.minutes ? `
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-2">議事録</h3>
            <p class="text-gray-800 whitespace-pre-wrap">${meeting.minutes}</p>
          </div>
          ` : ''}
          
          ${meeting.next_actions ? `
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-2">次のアクション</h3>
            <p class="text-gray-800 whitespace-pre-wrap">${meeting.next_actions}</p>
          </div>
          ` : ''}
          
          ${todos.length > 0 ? `
          <div>
            <h3 class="text-sm font-semibold text-gray-600 mb-3">ToDo一覧</h3>
            <div class="space-y-2">
              ${todos.map(todo => `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input type="checkbox" ${todo.status === 'completed' ? 'checked' : ''} 
                         onchange="toggleTodoStatus(${todo.id}, this.checked)" 
                         class="w-5 h-5">
                  <div class="flex-1">
                    <div class="font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}">
                      ${todo.title}
                    </div>
                    ${todo.due_date ? `<div class="text-sm text-gray-500 mt-1">期限: ${todo.due_date}</div>` : ''}
                  </div>
                  <span class="px-2 py-1 text-xs rounded-full ${
                    todo.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    todo.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    todo.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }">
                    ${todo.priority === 'urgent' ? '緊急' : todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="flex justify-end gap-3">
            <button onclick="document.getElementById('meeting-detail-modal').remove()" class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to load meeting detail:', error);
    showToast('商談詳細の取得に失敗しました', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: sans-serif;
    font-size: 14px;
    max-width: 400px;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==================== BUSINESS CARDS VIEW ====================

let businessCards = [];

async function loadBusinessCards() {
  try {
    const response = await axios.get('/api/business-cards', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      businessCards = response.data.data;
    }
  } catch (error) {
    console.error('Load business cards error:', error);
    showToast('名刺データの読み込みに失敗しました', 'error');
  }
}

function renderBusinessCardsView() {
  const content = document.getElementById('content-area');
  
  content.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-address-card mr-2 text-indigo-600"></i>名刺スキャン
        </h2>
        <button onclick="showUploadCardModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition">
          <i class="fas fa-camera mr-2"></i>名刺をスキャン
        </button>
      </div>

      <div class="mb-6">
        <p class="text-gray-600 mb-4">
          <i class="fas fa-info-circle mr-2"></i>
          名刺の写真をアップロードすると、AIが自動的に情報を抽出して人脈データベースに登録できます。
        </p>
      </div>

      ${businessCards.length === 0 ? `
        <div class="text-center py-12">
          <i class="fas fa-address-card text-6xl text-gray-300 mb-4"></i>
          <p class="text-gray-500 text-lg">スキャンされた名刺がありません</p>
          <button onclick="showUploadCardModal()" class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition">
            <i class="fas fa-camera mr-2"></i>最初の名刺をスキャン
          </button>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${businessCards.map(card => `
            <div class="border rounded-lg p-4 hover:shadow-md transition cursor-pointer" onclick="viewBusinessCard(${card.id})">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-800">${card.name || '名前未抽出'}</h3>
                  <p class="text-sm text-gray-600">${card.company_name || '会社名未抽出'}</p>
                  <p class="text-xs text-gray-500 mt-1">${card.title || ''}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded ${
                  card.status === 'imported' ? 'bg-green-100 text-green-800' :
                  card.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                  card.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }">
                  ${card.status === 'imported' ? 'インポート済' :
                    card.status === 'reviewed' ? '確認済' :
                    card.status === 'rejected' ? '却下' : '処理待ち'}
                </span>
              </div>

              ${card.email ? `<p class="text-xs text-gray-600 mb-1"><i class="fas fa-envelope mr-1"></i>${card.email}</p>` : ''}
              ${card.mobile || card.phone ? `<p class="text-xs text-gray-600 mb-1"><i class="fas fa-phone mr-1"></i>${card.mobile || card.phone}</p>` : ''}

              <div class="mt-3 pt-3 border-t text-xs text-gray-500">
                <i class="fas fa-clock mr-1"></i>${dayjs(card.created_at).format('YYYY/MM/DD HH:mm')}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Upload Modal -->
    <div id="upload-card-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl">
        <h3 class="text-xl font-bold mb-4">名刺をスキャン（両面対応）</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <!-- Front Side -->
          <div>
            <h4 class="text-sm font-semibold text-gray-700 mb-2">表面 <span class="text-red-500">*</span></h4>
            <div id="upload-area-front" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition">
              <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
              <p class="text-sm text-gray-600">画像をアップロード</p>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG (最大10MB)</p>
              <input type="file" id="card-image-input-front" accept="image/*" class="hidden">
            </div>
            <div id="preview-area-front" class="hidden mt-2">
              <img id="preview-image-front" class="w-full rounded-lg mb-2">
              <button onclick="clearCardImage('front')" class="text-sm text-red-600 hover:text-red-700">
                <i class="fas fa-times mr-1"></i>クリア
              </button>
            </div>
          </div>

          <!-- Back Side -->
          <div>
            <h4 class="text-sm font-semibold text-gray-700 mb-2">裏面 <span class="text-gray-400">(任意)</span></h4>
            <div id="upload-area-back" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition">
              <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
              <p class="text-sm text-gray-600">画像をアップロード</p>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG (最大10MB)</p>
              <input type="file" id="card-image-input-back" accept="image/*" class="hidden">
            </div>
            <div id="preview-area-back" class="hidden mt-2">
              <img id="preview-image-back" class="w-full rounded-lg mb-2">
              <button onclick="clearCardImage('back')" class="text-sm text-red-600 hover:text-red-700">
                <i class="fas fa-times mr-1"></i>クリア
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="hideUploadCardModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            キャンセル
          </button>
          <button onclick="uploadBusinessCard()" id="upload-btn" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition" disabled>
            アップロード
          </button>
        </div>
      </div>
    </div>

    <!-- Card Detail Modal -->
    <div id="card-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div id="card-detail-content"></div>
      </div>
    </div>
  `;

  // Setup upload areas for front and back
  setupCardUploadArea('front', true);
  setupCardUploadArea('back', false);
}

let selectedCardImageFront = null;
let selectedCardImageBack = null;

function setupCardUploadArea(side, required) {
  const uploadArea = document.getElementById(`upload-area-${side}`);
  const fileInput = document.getElementById(`card-image-input-${side}`);
  
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleCardImageSelect(side));
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-indigo-500');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-indigo-500');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-indigo-500');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleCardImageSelect(side);
    }
  });
}

function handleCardImageSelect(side) {
  const fileInput = document.getElementById(`card-image-input-${side}`);
  const file = fileInput.files[0];
  
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('ファイルサイズが大きすぎます（最大10MB）', 'error');
    return;
  }
  
  if (side === 'front') {
    selectedCardImageFront = file;
  } else {
    selectedCardImageBack = file;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById(`preview-image-${side}`).src = e.target.result;
    document.getElementById(`preview-area-${side}`).classList.remove('hidden');
    document.getElementById(`upload-area-${side}`).classList.add('hidden');
    
    // Enable upload button if front image is selected
    document.getElementById('upload-btn').disabled = !selectedCardImageFront;
  };
  reader.readAsDataURL(file);
}

function clearCardImage(side) {
  if (side === 'front') {
    selectedCardImageFront = null;
    document.getElementById('card-image-input-front').value = '';
    document.getElementById('preview-area-front').classList.add('hidden');
    document.getElementById('upload-area-front').classList.remove('hidden');
    document.getElementById('upload-btn').disabled = true;
  } else if (side === 'back') {
    selectedCardImageBack = null;
    document.getElementById('card-image-input-back').value = '';
    document.getElementById('preview-area-back').classList.add('hidden');
    document.getElementById('upload-area-back').classList.remove('hidden');
  } else {
    // Clear both
    clearCardImage('front');
    clearCardImage('back');
  }
}

function showUploadCardModal() {
  document.getElementById('upload-card-modal').classList.remove('hidden');
}

function hideUploadCardModal() {
  document.getElementById('upload-card-modal').classList.add('hidden');
  clearCardImage();
}

async function uploadBusinessCard() {
  if (!selectedCardImageFront) return;
  
  try {
    document.getElementById('upload-btn').disabled = true;
    document.getElementById('upload-btn').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>アップロード中...';
    
    const formData = new FormData();
    formData.append('image_front', selectedCardImageFront);
    if (selectedCardImageBack) {
      formData.append('image_back', selectedCardImageBack);
    }
    
    const response = await axios.post('/api/business-cards/upload', formData, {
      headers: { 
        'X-Session-Token': sessionToken,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data.success) {
      showToast('名刺をアップロードしました', 'success');
      hideUploadCardModal();
      
      // Process OCR
      await processBusinessCardOCR(response.data.data.id);
      
      // Reload cards
      await loadBusinessCards();
      renderBusinessCardsView();
    }
  } catch (error) {
    console.error('Upload business card error:', error);
    showToast('アップロードに失敗しました', 'error');
    document.getElementById('upload-btn').disabled = false;
    document.getElementById('upload-btn').innerHTML = 'アップロード';
  }
}

async function processBusinessCardOCR(cardId) {
  try {
    showToast('AI OCR処理中...', 'info');
    
    const response = await axios.post(`/api/business-cards/${cardId}/process-ocr`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('情報を抽出しました', 'success');
    }
  } catch (error) {
    console.error('Process OCR error:', error);
    showToast('OCR処理に失敗しました', 'error');
  }
}

async function viewBusinessCard(cardId) {
  try {
    const response = await axios.get(`/api/business-cards/${cardId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      const card = response.data.data;
      showBusinessCardDetail(card);
    }
  } catch (error) {
    console.error('View business card error:', error);
    showToast('名刺の読み込みに失敗しました', 'error');
  }
}

function showBusinessCardDetail(card) {
  const modal = document.getElementById('card-detail-modal');
  const content = document.getElementById('card-detail-content');
  
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-2xl font-bold">名刺詳細</h3>
      <button onclick="hideCardDetailModal()" class="text-gray-500 hover:text-gray-700">
        <i class="fas fa-times text-xl"></i>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-6 mb-6">
      <div>
        <h4 class="font-bold text-gray-700 mb-4">抽出された情報</h4>
        
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500">名前</label>
            <input type="text" id="edit-name" value="${card.name || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">会社名</label>
            <input type="text" id="edit-company" value="${card.company_name || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">役職</label>
            <input type="text" id="edit-title" value="${card.title || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">部署</label>
            <input type="text" id="edit-department" value="${card.department || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">電話番号</label>
            <input type="text" id="edit-phone" value="${card.phone || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">携帯電話</label>
            <input type="text" id="edit-mobile" value="${card.mobile || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">メールアドレス</label>
            <input type="text" id="edit-email" value="${card.email || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">ウェブサイト</label>
            <input type="text" id="edit-website" value="${card.website || ''}" class="w-full mt-1 px-3 py-2 border rounded-lg">
          </div>
          
          <div>
            <label class="text-xs text-gray-500">住所</label>
            <textarea id="edit-address" class="w-full mt-1 px-3 py-2 border rounded-lg" rows="2">${card.address || ''}</textarea>
          </div>
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-gray-700 mb-4">名刺画像</h4>
        
        <div class="mb-3">
          <p class="text-xs text-gray-600 mb-1">表面</p>
          <img src="${card.image_url}" class="w-full rounded-lg border">
        </div>
        
        ${card.image_url_back ? `
          <div class="mb-3">
            <p class="text-xs text-gray-600 mb-1">裏面</p>
            <img src="${card.image_url_back}" class="w-full rounded-lg border">
          </div>
        ` : ''}
        
        ${card.raw_ocr_text ? `
          <div class="mt-4">
            <h4 class="font-bold text-gray-700 mb-2">OCR生テキスト</h4>
            <pre class="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-48">${card.raw_ocr_text}</pre>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="flex gap-2 pt-4 border-t">
      ${card.status !== 'imported' ? `
        <button onclick="saveBusinessCardEdit(${card.id})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <i class="fas fa-save mr-2"></i>情報を保存
        </button>
        <button onclick="importBusinessCard(${card.id})" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          <i class="fas fa-user-plus mr-2"></i>人脈に登録
        </button>
      ` : `
        <span class="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
          <i class="fas fa-check mr-2"></i>すでに人脈に登録済み
        </span>
      `}
      
      <button onclick="deleteBusinessCard(${card.id})" class="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
        <i class="fas fa-trash mr-2"></i>削除
      </button>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

function hideCardDetailModal() {
  document.getElementById('card-detail-modal').classList.add('hidden');
}

async function saveBusinessCardEdit(cardId) {
  try {
    const data = {
      name: document.getElementById('edit-name').value,
      company_name: document.getElementById('edit-company').value,
      title: document.getElementById('edit-title').value,
      department: document.getElementById('edit-department').value,
      phone: document.getElementById('edit-phone').value,
      mobile: document.getElementById('edit-mobile').value,
      email: document.getElementById('edit-email').value,
      website: document.getElementById('edit-website').value,
      address: document.getElementById('edit-address').value
    };
    
    const response = await axios.put(`/api/business-cards/${cardId}`, data, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('情報を保存しました', 'success');
      await loadBusinessCards();
      renderBusinessCardsView();
      hideCardDetailModal();
    }
  } catch (error) {
    console.error('Save business card error:', error);
    showToast('保存に失敗しました', 'error');
  }
}

async function importBusinessCard(cardId) {
  try {
    const response = await axios.post(`/api/business-cards/${cardId}/import`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('人脈に登録しました', 'success');
      await loadBusinessCards();
      await loadConnections();
      renderBusinessCardsView();
      hideCardDetailModal();
    }
  } catch (error) {
    console.error('Import business card error:', error);
    showToast(error.response?.data?.error || 'インポートに失敗しました', 'error');
  }
}

async function deleteBusinessCard(cardId) {
  if (!confirm('この名刺を削除してもよろしいですか？')) return;
  
  try {
    const response = await axios.delete(`/api/business-cards/${cardId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('名刺を削除しました', 'success');
      await loadBusinessCards();
      renderBusinessCardsView();
      hideCardDetailModal();
    }
  } catch (error) {
    console.error('Delete business card error:', error);
    showToast('削除に失敗しました', 'error');
  }
}

// ==================== REFERRALS RANKING VIEW ====================

function renderReferralsView() {
  const content = document.getElementById('content-area');
  
  content.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-user-friends mr-2 text-indigo-600"></i>紹介者ランキング
      </h2>

      <div class="mb-6">
        <p class="text-gray-600 text-sm">
          紹介経由での商談・成約状況を紹介者別に集計しています
        </p>
      </div>

      <!-- Mock Ranking Data -->
      <div class="space-y-4">
        <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="text-2xl font-bold text-yellow-600">🥇 1位</div>
              <div>
                <h3 class="font-bold text-gray-800">山田 太郎</h3>
                <p class="text-sm text-gray-600">株式会社ABC / CEO</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold text-gray-800">15件</div>
              <div class="text-sm text-gray-600">紹介数</div>
              <div class="text-sm text-green-600 font-semibold">成約: 8件</div>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="text-2xl font-bold text-gray-500">🥈 2位</div>
              <div>
                <h3 class="font-bold text-gray-800">佐藤 花子</h3>
                <p class="text-sm text-gray-600">株式会社XYZ / 営業部長</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold text-gray-800">12件</div>
              <div class="text-sm text-gray-600">紹介数</div>
              <div class="text-sm text-green-600 font-semibold">成約: 6件</div>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="text-2xl font-bold text-orange-500">🥉 3位</div>
              <div>
                <h3 class="font-bold text-gray-800">鈴木 一郎</h3>
                <p class="text-sm text-gray-600">フリーランス / コンサルタント</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold text-gray-800">10件</div>
              <div class="text-sm text-gray-600">紹介数</div>
              <div class="text-sm text-green-600 font-semibold">成約: 5件</div>
            </div>
          </div>
        </div>

        <div class="border rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="text-lg font-bold text-gray-400">4位</div>
              <div>
                <h3 class="font-bold text-gray-800">田中 美咲</h3>
                <p class="text-sm text-gray-600">株式会社DEF / マーケティング</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-800">8件</div>
              <div class="text-sm text-gray-600">紹介数</div>
              <div class="text-sm text-green-600 font-semibold">成約: 4件</div>
            </div>
          </div>
        </div>

        <div class="border rounded-lg p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="text-lg font-bold text-gray-400">5位</div>
              <div>
                <h3 class="font-bold text-gray-800">高橋 健太</h3>
                <p class="text-sm text-gray-600">株式会社GHI / 事業開発</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-gray-800">7件</div>
              <div class="text-sm text-gray-600">紹介数</div>
              <div class="text-sm text-green-600 font-semibold">成約: 3件</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-800">
          <i class="fas fa-info-circle mr-2"></i>
          実際のデータを表示するには、見込み客登録時に紹介者情報を入力してください
        </p>
      </div>
    </div>
  `;
}

// ==================== REFERRALS VIEW ====================

async function loadReferrals() {
  try {
    const response = await axios.get('/api/referrals', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      return response.data.referrals || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to load referrals:', error);
    showToast('紹介者データの読み込みに失敗しました', 'error');
    return [];
  }
}

function calculateReferralPoints(referrals, prospects) {
  // Group referrals by referrer
  const referrerMap = {};
  
  referrals.forEach(ref => {
    const prospect = prospects.find(p => p.id === ref.prospect_id);
    if (!prospect) return;
    
    const key = `${ref.referrer_name}|${ref.referrer_company || ''}`;
    if (!referrerMap[key]) {
      referrerMap[key] = {
        name: ref.referrer_name,
        company: ref.referrer_company,
        referral_count: 0,
        qualified_count: 0,
        negotiating_count: 0,
        contracted_count: 0,
        points: 0
      };
    }
    
    // Count referrals
    referrerMap[key].referral_count++;
    
    // Calculate points based on final exit phase
    // 紹介人数: 1 point
    // 見込み化: +3 points (only if qualified or higher)
    // 商談: +5 points (only if negotiating or higher)
    // 契約: +10 points (only if contracted)
    
    let phasePoints = 1; // Base point for referral
    
    if (prospect.status === 'qualified' || prospect.status === 'negotiating' || 
        prospect.status === 'contracted' || prospect.status === 'paid') {
      referrerMap[key].qualified_count++;
      phasePoints = 3;
    }
    
    if (prospect.status === 'negotiating' || prospect.status === 'contracted' || prospect.status === 'paid') {
      referrerMap[key].negotiating_count++;
      phasePoints = 5;
    }
    
    if (prospect.status === 'contracted' || prospect.status === 'paid') {
      referrerMap[key].contracted_count++;
      phasePoints = 10;
    }
    
    referrerMap[key].points += phasePoints;
  });
  
  return Object.values(referrerMap).sort((a, b) => b.points - a.points);
}

async function renderReferralsView() {
  const contentArea = document.getElementById('content-area');
  
  // Show loading state
  contentArea.innerHTML = `
    <div class="text-center py-8">
      <i class="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      <p class="mt-4 text-gray-600">紹介者データを読み込み中...</p>
    </div>
  `;
  
  const referrals = await loadReferrals();
  const allReferrers = calculateReferralPoints(referrals, prospects);
  
  // Filter for monthly (last 30 days)
  const thirtyDaysAgo = dayjs().subtract(30, 'days');
  const monthlyReferrals = referrals.filter(r => dayjs(r.referral_date).isAfter(thirtyDaysAgo));
  const monthlyReferrers = calculateReferralPoints(monthlyReferrals, prospects);
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        <i class="fas fa-user-friends mr-2 text-indigo-600"></i>紹介者ランキング
      </h2>
      <p class="text-gray-600 text-sm">紹介からの成約状況を確認（最終到達フェーズでポイント付与）</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button onclick="switchReferralTab('monthly')" id="referral-tab-monthly" class="referral-tab px-6 py-3 rounded-lg font-bold transition bg-indigo-600 text-white">
        <i class="fas fa-calendar-alt mr-2"></i>月間ランキング
      </button>
      <button onclick="switchReferralTab('total')" id="referral-tab-total" class="referral-tab px-6 py-3 rounded-lg font-bold transition bg-white text-gray-600 hover:bg-gray-50">
        <i class="fas fa-trophy mr-2"></i>トータルランキング
      </button>
    </div>

    <!-- Points Legend -->
    <div class="bg-blue-50 rounded-xl p-4 mb-6">
      <h3 class="font-bold text-gray-800 mb-3">ポイント計算方法</h3>
      <div class="grid grid-cols-4 gap-4 text-sm">
        <div>
          <span class="font-semibold text-blue-600">紹介人数:</span>
          <span class="text-gray-700"> 1pt</span>
        </div>
        <div>
          <span class="font-semibold text-green-600">見込み化:</span>
          <span class="text-gray-700"> 3pt</span>
        </div>
        <div>
          <span class="font-semibold text-yellow-600">商談:</span>
          <span class="text-gray-700"> 5pt</span>
        </div>
        <div>
          <span class="font-semibold text-purple-600">契約:</span>
          <span class="text-gray-700"> 10pt</span>
        </div>
      </div>
      <p class="text-xs text-gray-600 mt-2">※最終到達フェーズのポイントのみが加算されます</p>
    </div>

    <!-- Monthly Ranking -->
    <div id="referral-monthly-content" class="referral-content">
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">順位</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">紹介者名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">所属</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">紹介人数</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">見込み化</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">商談</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">契約</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">合計ポイント</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyReferrers.length === 0 ? `
              <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                  <i class="fas fa-trophy text-4xl mb-2 text-gray-400"></i>
                  <p>今月の紹介者データがありません</p>
                </td>
              </tr>
            ` : monthlyReferrers.map((ref, index) => `
              <tr class="hover:bg-gray-50 transition ${index < 3 ? 'bg-yellow-50' : ''}">
                <td class="px-4 py-3 text-center">
                  ${index === 0 ? '<i class="fas fa-crown text-yellow-500 text-xl"></i>' : 
                    index === 1 ? '<i class="fas fa-medal text-gray-400 text-xl"></i>' :
                    index === 2 ? '<i class="fas fa-medal text-orange-400 text-xl"></i>' :
                    `<span class="text-gray-600 font-semibold">${index + 1}</span>`}
                </td>
                <td class="px-4 py-3 font-semibold text-gray-800">${ref.name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${ref.company || '-'}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">${ref.referral_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">${ref.qualified_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">${ref.negotiating_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">${ref.contracted_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-lg font-bold">${ref.points}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Total Ranking -->
    <div id="referral-total-content" class="referral-content hidden">
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">順位</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">紹介者名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">所属</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">紹介人数</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">見込み化</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">商談</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">契約</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">合計ポイント</th>
            </tr>
          </thead>
          <tbody>
            ${allReferrers.length === 0 ? `
              <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                  <i class="fas fa-trophy text-4xl mb-2 text-gray-400"></i>
                  <p>紹介者データがまだ登録されていません</p>
                </td>
              </tr>
            ` : allReferrers.map((ref, index) => `
              <tr class="hover:bg-gray-50 transition ${index < 3 ? 'bg-yellow-50' : ''}">
                <td class="px-4 py-3 text-center">
                  ${index === 0 ? '<i class="fas fa-crown text-yellow-500 text-xl"></i>' : 
                    index === 1 ? '<i class="fas fa-medal text-gray-400 text-xl"></i>' :
                    index === 2 ? '<i class="fas fa-medal text-orange-400 text-xl"></i>' :
                    `<span class="text-gray-600 font-semibold">${index + 1}</span>`}
                </td>
                <td class="px-4 py-3 font-semibold text-gray-800">${ref.name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${ref.company || '-'}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">${ref.referral_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">${ref.qualified_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">${ref.negotiating_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">${ref.contracted_count}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-lg font-bold">${ref.points}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function switchReferralTab(tab) {
  // Update tab styles
  document.querySelectorAll('.referral-tab').forEach(t => {
    t.className = 'referral-tab px-6 py-3 rounded-lg font-bold transition bg-white text-gray-600 hover:bg-gray-50';
  });
  document.getElementById(`referral-tab-${tab}`).className = 'referral-tab px-6 py-3 rounded-lg font-bold transition bg-indigo-600 text-white';
  
  // Show/hide content
  document.querySelectorAll('.referral-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`referral-${tab}-content`).classList.remove('hidden');
}

// ==================== KPI VIEW ====================

let currentKPIPeriod = dayjs().format('YYYY-MM');
let showingWeeklyKPI = false;

async function loadKPIs(periodType = 'monthly', periodStart) {
  try {
    const response = await axios.get(`/api/kpis/?period_type=${periodType}&period_start=${periodStart}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      return response.data.kpis || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to load KPIs:', error);
    return [];
  }
}

async function saveKPI(kpiData) {
  try {
    const response = await axios.post('/api/kpis', kpiData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('KPIを保存しました', 'success');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to save KPI:', error);
    showToast('KPIの保存に失敗しました', 'error');
    return false;
  }
}

async function renderKPIView() {
  const contentArea = document.getElementById('content-area');
  
  // 当月のみ表示するように制限
  const currentMonth = dayjs().format('YYYY-MM');
  const selectedMonth = dayjs(currentKPIPeriod).format('YYYY-MM');
  
  // 当月以外が選択されている場合は当月に戻す
  if (selectedMonth !== currentMonth) {
    currentKPIPeriod = currentMonth;
  }
  
  if (!showingWeeklyKPI) {
    // Monthly KPI View - 新しいAPIから取得
    const year = dayjs(currentKPIPeriod).year();
    const month = dayjs(currentKPIPeriod).month() + 1;
    
    let kpiGoals = null;
    try {
      const response = await axios.get(`/api/sales-crm/dashboard/kpi-goals?year=${year}&month=${month}`, {
        headers: { 'X-Session-Token': sessionToken }
      });
      if (response.data.success) {
        kpiGoals = response.data.goals;
      }
    } catch (error) {
      console.error('Failed to load KPI goals:', error);
      showToast('KPI目標の読み込みに失敗しました', 'error');
    }
    
    contentArea.innerHTML = `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">
          <i class="fas fa-chart-line mr-2 text-indigo-600"></i>月間KPI設定（当月のみ）
        </h2>
        <p class="text-gray-600 text-sm">今月（${dayjs(currentKPIPeriod).format('YYYY年MM月')}）の目標値を設定してください</p>
      </div>

      <!-- KPI Input Grid -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        ${renderNewKPICard('appointments_goal', 'アポ数', 'calendar-check', 'blue', kpiGoals?.appointments_goal || 20, '件')}
        ${renderNewKPICard('qualified_goal', '見込み化数', 'user-check', 'green', kpiGoals?.qualified_goal || 15, '件')}
        ${renderNewKPICard('negotiations_goal', '商談数', 'handshake', 'yellow', kpiGoals?.negotiations_goal || 10, '件')}
        ${renderNewKPICard('deals_goal', '契約数', 'file-signature', 'purple', kpiGoals?.deals_goal || 5, '件')}
        ${renderNewKPICard('customer_unit_price_goal', '顧客単価', 'yen-sign', 'pink', kpiGoals?.customer_unit_price_goal || 400000, '円')}
        ${renderNewKPICard('revenue_goal', '新規売上', 'chart-line', 'indigo', kpiGoals?.revenue_goal || 2000000, '円')}
        ${renderNewKPICard('gross_profit_goal', '粗利', 'coins', 'orange', kpiGoals?.gross_profit_goal || 1000000, '円')}
        ${renderNewKPICard('new_agencies_goal', '新規代理店数', 'handshake', 'teal', kpiGoals?.new_agencies_goal || 2, '件')}
      </div>

      <!-- Buttons -->
      <div class="flex justify-between">
        <button onclick="showWeeklyKPISettingsView()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition font-bold">
          <i class="fas fa-calendar-week mr-2"></i>週間KPI設定
        </button>
        <button onclick="saveNewKPIGoals()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition font-bold">
          <i class="fas fa-save mr-2"></i>月間KPI目標を保存
        </button>
      </div>
      
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-800">
          <i class="fas fa-info-circle mr-2"></i>
          <strong>注意:</strong> KPI目標は当月分のみ設定・表示できます。月間KPIを設定後、週間KPI設定ボタンで週次目標を設定できます。
        </p>
      </div>
    `;
  } else {
    // Weekly KPI View
    renderWeeklyKPIView();
  }
}

function renderNewKPICard(fieldName, label, icon, color, value, unit) {
  return `
    <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-${color}-500">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-16 h-16 bg-${color}-100 rounded-lg flex items-center justify-center">
            <i class="fas fa-${icon} text-${color}-600 text-2xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-800">${label}</h3>
            <p class="text-sm text-gray-500">月間目標値</p>
          </div>
        </div>
      </div>
      
      <div>
        <label class="text-sm font-medium text-gray-700 block mb-2">目標値</label>
        <div class="flex items-center gap-2">
          <input type="number" id="kpi-${fieldName}" value="${value}" 
                 class="flex-1 px-4 py-3 text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-${color}-500 focus:border-${color}-500">
          <span class="text-lg font-bold text-gray-700">${unit}</span>
        </div>
      </div>
    </div>
  `;
}

function renderKPICard(goalType, label, icon, color, kpiMap) {
  const kpi = kpiMap[goalType] || { goal_value: 0, actual_value: 0 };
  const achievement = kpi.goal_value > 0 ? Math.round((kpi.actual_value / kpi.goal_value) * 100) : 0;
  
  return `
    <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-${color}-500 cursor-pointer hover:shadow-lg transition" onclick="editKPIDetail('${goalType}', '${label}')">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center">
            <i class="fas fa-${icon} text-${color}-600 text-xl"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-800">${label}</h3>
            <p class="text-xs text-gray-500">クリックして詳細設定</p>
          </div>
        </div>
      </div>
      
      <div>
        <label class="text-xs text-gray-600">目標値</label>
        <input type="number" id="kpi-${goalType}-goal" value="${kpi.goal_value}" 
               class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${color}-500"
               onclick="event.stopPropagation()">
      </div>
      
      ${kpi.goal_value > 0 ? `
        <div class="mt-4">
          <div class="flex justify-between text-xs text-gray-600 mb-1">
            <span>達成率</span>
            <span class="font-semibold ${achievement >= 100 ? 'text-green-600' : achievement >= 80 ? 'text-yellow-600' : 'text-red-600'}">${achievement}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-${color}-500 h-2 rounded-full transition-all" style="width: ${Math.min(achievement, 100)}%"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderWeeklyKPIView() {
  const contentArea = document.getElementById('content-area');
  
  // Start from the first Monday of the month (or before if needed)
  const monthStart = dayjs(currentKPIPeriod).startOf('month');
  const dayOfWeek = monthStart.day();
  // Calculate first Monday: if month starts on Monday (1), use that day; otherwise go back
  const firstMonday = dayOfWeek === 1 ? monthStart : 
                      dayOfWeek === 0 ? monthStart.subtract(6, 'days') : 
                      monthStart.subtract(dayOfWeek - 1, 'days');
  
  const weeks = [];
  let current = firstMonday;
  const monthEnd = dayjs(currentKPIPeriod).endOf('month');
  
  // Generate weeks (Monday to Sunday) that overlap with this month
  while (current.isBefore(monthEnd) || current.isSame(monthEnd, 'day')) {
    const weekEnd = current.add(6, 'days'); // Sunday
    weeks.push({
      start: current.format('YYYY-MM-DD'),
      end: weekEnd.format('YYYY-MM-DD'),
      label: `第${weeks.length + 1}週 (${current.format('MM/DD')}月 - ${weekEnd.format('MM/DD')}日)`
    });
    current = current.add(7, 'days'); // Next Monday
  }
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center gap-3">
        <button onclick="showingWeeklyKPI = false; renderKPIView()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-calendar-week mr-2 text-green-600"></i>週間KPI設定
          </h2>
          <p class="text-gray-600 text-sm">${dayjs(currentKPIPeriod).format('YYYY年MM月')}の週次目標</p>
        </div>
      </div>
    </div>

    <!-- Weekly KPI Cards -->
    <div class="space-y-4">
      ${weeks.map((week, index) => `
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="font-bold text-gray-800 mb-4">${week.label}</h3>
          <div class="grid grid-cols-4 gap-3">
            ${renderWeeklyKPIInput('appointments', 'アポ数', 'calendar-check', 'blue', week, index)}
            ${renderWeeklyKPIInput('qualified', '見込み化', 'user-check', 'green', week, index)}
            ${renderWeeklyKPIInput('negotiations', '商談数', 'handshake', 'yellow', week, index)}
            ${renderWeeklyKPIInput('contracts', '契約数', 'file-signature', 'purple', week, index)}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Save Button -->
    <div class="flex justify-end mt-6">
      <button onclick="saveWeeklyKPIs()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition font-bold">
        <i class="fas fa-save mr-2"></i>週間KPIを保存
      </button>
    </div>
  `;
}

function renderWeeklyKPIInput(goalType, label, icon, color, week, weekIndex) {
  return `
    <div class="bg-${color}-50 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <i class="fas fa-${icon} text-${color}-600"></i>
        <span class="text-xs font-semibold text-gray-700">${label}</span>
      </div>
      <input type="number" id="weekly-kpi-${weekIndex}-${goalType}" value="0" 
             class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-${color}-500">
    </div>
  `;
}

function changeKPIMonth(delta) {
  currentKPIPeriod = dayjs(currentKPIPeriod).add(delta, 'month').format('YYYY-MM');
  renderKPIView();
}

function showWeeklyKPI() {
  showingWeeklyKPI = true;
  renderKPIView();
}

async function saveNewKPIGoals() {
  const year = dayjs(currentKPIPeriod).year();
  const month = dayjs(currentKPIPeriod).month() + 1;
  
  const appointments_goal = parseInt(document.getElementById('kpi-appointments_goal')?.value || 20);
  const qualified_goal = parseInt(document.getElementById('kpi-qualified_goal')?.value || 15);
  const negotiations_goal = parseInt(document.getElementById('kpi-negotiations_goal')?.value || 10);
  const deals_goal = parseInt(document.getElementById('kpi-deals_goal')?.value || 5);
  const customer_unit_price_goal = parseInt(document.getElementById('kpi-customer_unit_price_goal')?.value || 400000);
  const revenue_goal = parseInt(document.getElementById('kpi-revenue_goal')?.value || 2000000);
  const gross_profit_goal = parseInt(document.getElementById('kpi-gross_profit_goal')?.value || 1000000);
  const new_agencies_goal = parseInt(document.getElementById('kpi-new_agencies_goal')?.value || 2);
  
  try {
    const response = await axios.post('/api/sales-crm/dashboard/kpi-goals', {
      year,
      month,
      appointments_goal,
      qualified_goal,
      negotiations_goal,
      deals_goal,
      customer_unit_price_goal,
      revenue_goal,
      gross_profit_goal,
      new_agencies_goal
    }, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('月間KPI目標を保存しました', 'success');
      // ダッシュボードを更新（KPI反映のため）
      if (currentView === 'dashboard') {
        await renderDashboardView();
      }
    } else {
      showToast('保存に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Failed to save KPI goals:', error);
    showToast('保存に失敗しました', 'error');
  }
}

async function showWeeklyKPISettingsView() {
  showingWeeklyKPI = true;
  await renderWeeklyKPISettingsView();
}

async function renderWeeklyKPISettingsView() {
  const contentArea = document.getElementById('content-area');
  const year = dayjs(currentKPIPeriod).year();
  const month = dayjs(currentKPIPeriod).month() + 1;
  
  // 月間KPI目標を取得
  let monthlyGoals = null;
  try {
    const response = await axios.get(`/api/sales-crm/dashboard/kpi-goals?year=${year}&month=${month}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    if (response.data.success) {
      monthlyGoals = response.data.goals;
    }
  } catch (error) {
    console.error('Failed to load monthly KPI goals:', error);
  }
  
  // 既存の週間KPI目標を取得
  let weeklyGoals = [];
  try {
    const response = await axios.get(`/api/sales-crm/dashboard/kpi-weekly-goals?year=${year}&month=${month}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    if (response.data.success) {
      weeklyGoals = response.data.goals;
    }
  } catch (error) {
    console.error('Failed to load weekly KPI goals:', error);
  }
  
  // 週のリストを生成（月曜始まり）
  const monthStart = dayjs(currentKPIPeriod).startOf('month');
  const dayOfWeek = monthStart.day();
  const firstMonday = dayOfWeek === 1 ? monthStart : 
                      dayOfWeek === 0 ? monthStart.subtract(6, 'days') : 
                      monthStart.subtract(dayOfWeek - 1, 'days');
  
  const weeks = [];
  let current = firstMonday;
  const monthEnd = dayjs(currentKPIPeriod).endOf('month');
  let weekNum = 1;
  
  while (current.isBefore(monthEnd) || current.isSame(monthEnd, 'day')) {
    const weekEnd = current.add(6, 'days');
    const existingWeek = weeklyGoals.find(w => w.week_number === weekNum);
    
    weeks.push({
      number: weekNum,
      start: current.format('YYYY-MM-DD'),
      end: weekEnd.format('YYYY-MM-DD'),
      label: `第${weekNum}週 (${current.format('MM/DD')} - ${weekEnd.format('MM/DD')})`,
      goals: existingWeek || null
    });
    current = current.add(7, 'days');
    weekNum++;
  }
  
  // デフォルト値（月間目標を週数で割る）
  const defaultWeeklyGoals = {
    appointments_goal: Math.round((monthlyGoals?.appointments_goal || 20) / weeks.length),
    qualified_goal: Math.round((monthlyGoals?.qualified_goal || 15) / weeks.length),
    negotiations_goal: Math.round((monthlyGoals?.negotiations_goal || 10) / weeks.length),
    deals_goal: Math.round((monthlyGoals?.deals_goal || 5) / weeks.length),
    customer_unit_price_goal: monthlyGoals?.customer_unit_price_goal || 400000,
    revenue_goal: Math.round((monthlyGoals?.revenue_goal || 2000000) / weeks.length),
    gross_profit_goal: Math.round((monthlyGoals?.gross_profit_goal || 1000000) / weeks.length),
    new_agencies_goal: Math.round((monthlyGoals?.new_agencies_goal || 2) / weeks.length)
  };
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center gap-3">
        <button onclick="showingWeeklyKPI = false; renderKPIView()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-calendar-week mr-2 text-green-600"></i>週間KPI設定
          </h2>
          <p class="text-gray-600 text-sm">${dayjs(currentKPIPeriod).format('YYYY年MM月')}の週次目標（月間目標を基に自動計算）</p>
        </div>
      </div>
    </div>

    <!-- Weekly KPI Cards -->
    <div class="space-y-4">
      ${weeks.map((week, index) => {
        const goals = week.goals || defaultWeeklyGoals;
        return `
          <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="font-bold text-gray-800 mb-4">${week.label}</h3>
            <div class="grid grid-cols-4 gap-3">
              ${renderWeeklyKPIInput2('appointments_goal', 'アポ数', 'calendar-check', 'blue', week.number, goals.appointments_goal)}
              ${renderWeeklyKPIInput2('qualified_goal', '見込み化', 'user-check', 'green', week.number, goals.qualified_goal)}
              ${renderWeeklyKPIInput2('negotiations_goal', '商談数', 'handshake', 'yellow', week.number, goals.negotiations_goal)}
              ${renderWeeklyKPIInput2('deals_goal', '契約数', 'file-signature', 'purple', week.number, goals.deals_goal)}
            </div>
            <div class="grid grid-cols-4 gap-3 mt-3">
              ${renderWeeklyKPIInput2('customer_unit_price_goal', '顧客単価', 'yen-sign', 'pink', week.number, goals.customer_unit_price_goal)}
              ${renderWeeklyKPIInput2('revenue_goal', '新規売上', 'chart-line', 'indigo', week.number, goals.revenue_goal)}
              ${renderWeeklyKPIInput2('gross_profit_goal', '粗利', 'coins', 'orange', week.number, goals.gross_profit_goal)}
              ${renderWeeklyKPIInput2('new_agencies_goal', '新規代理店', 'handshake', 'teal', week.number, goals.new_agencies_goal)}
            </div>
            <input type="hidden" id="week-${week.number}-start" value="${week.start}">
            <input type="hidden" id="week-${week.number}-end" value="${week.end}">
          </div>
        `;
      }).join('')}
    </div>

    <!-- Save Button -->
    <div class="flex justify-end mt-6">
      <button onclick="saveWeeklyKPIGoals()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition font-bold">
        <i class="fas fa-save mr-2"></i>週間KPI目標を保存
      </button>
    </div>
    
    <div class="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
      <p class="text-sm text-green-800">
        <i class="fas fa-info-circle mr-2"></i>
        月間KPI目標から自動的に週割りした値がデフォルトで入力されています。必要に応じて調整してください。
      </p>
    </div>
  `;
}

function renderWeeklyKPIInput2(fieldName, label, icon, color, weekNumber, defaultValue) {
  return `
    <div class="bg-${color}-50 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <i class="fas fa-${icon} text-${color}-600 text-sm"></i>
        <span class="text-xs font-semibold text-gray-700">${label}</span>
      </div>
      <input type="number" id="weekly-${weekNumber}-${fieldName}" value="${defaultValue}" 
             class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-${color}-500">
    </div>
  `;
}

async function saveWeeklyKPIGoals() {
  const year = dayjs(currentKPIPeriod).year();
  const month = dayjs(currentKPIPeriod).month() + 1;
  
  // 全週のデータを収集
  const weekNumbers = [];
  document.querySelectorAll('[id^="week-"][id$="-start"]').forEach(input => {
    const weekNum = parseInt(input.id.split('-')[1]);
    weekNumbers.push(weekNum);
  });
  
  try {
    for (const weekNum of weekNumbers) {
      const weekStart = document.getElementById(`week-${weekNum}-start`)?.value;
      const weekEnd = document.getElementById(`week-${weekNum}-end`)?.value;
      
      const goals = {
        year,
        month,
        week_number: weekNum,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        appointments_goal: parseInt(document.getElementById(`weekly-${weekNum}-appointments_goal`)?.value || 0),
        qualified_goal: parseInt(document.getElementById(`weekly-${weekNum}-qualified_goal`)?.value || 0),
        negotiations_goal: parseInt(document.getElementById(`weekly-${weekNum}-negotiations_goal`)?.value || 0),
        deals_goal: parseInt(document.getElementById(`weekly-${weekNum}-deals_goal`)?.value || 0),
        customer_unit_price_goal: parseInt(document.getElementById(`weekly-${weekNum}-customer_unit_price_goal`)?.value || 0),
        revenue_goal: parseInt(document.getElementById(`weekly-${weekNum}-revenue_goal`)?.value || 0),
        gross_profit_goal: parseInt(document.getElementById(`weekly-${weekNum}-gross_profit_goal`)?.value || 0),
        new_agencies_goal: parseInt(document.getElementById(`weekly-${weekNum}-new_agencies_goal`)?.value || 0)
      };
      
      await axios.post('/api/sales-crm/dashboard/kpi-weekly-goals', goals, {
        headers: { 'X-Session-Token': sessionToken }
      });
    }
    
    showToast('週間KPI目標を保存しました', 'success');
    showingWeeklyKPI = false;
    await renderKPIView();
  } catch (error) {
    console.error('Failed to save weekly KPI goals:', error);
    showToast('保存に失敗しました', 'error');
  }
}

async function saveMonthlyKPIs() {
  const kpiTypes = ['appointments', 'qualified', 'negotiations', 'contracts', 'customer_unit_price', 'new_revenue', 'gross_profit', 'partnerships'];
  
  const periodStart = dayjs(currentKPIPeriod).startOf('month').format('YYYY-MM-DD');
  const periodEnd = dayjs(currentKPIPeriod).endOf('month').format('YYYY-MM-DD');
  
  for (const type of kpiTypes) {
    const goalValue = parseFloat(document.getElementById(`kpi-${type}-goal`)?.value || 0);
    // actual_value input removed from UI, setting to 0
    const actualValue = 0;
    
    await saveKPI({
      period_type: 'monthly',
      period_start: periodStart,
      period_end: periodEnd,
      goal_type: type,
      goal_value: goalValue,
      actual_value: actualValue
    });
  }
  
  showToast('月間KPIを保存しました', 'success');
}

async function saveWeeklyKPIs() {
  // Implementation for saving weekly KPIs
  showToast('週間KPIを保存しました', 'success');
}

function editKPIDetail(goalType, label) {
  showToast(`${label}の詳細設定機能は実装中です`, 'info');
}

// ==================== WEEKLY REPORT VIEW ====================

async function renderWeeklyReportView() {
  const content = document.getElementById('content-area');
  
  // Calculate week starting from Monday (1) instead of Sunday (0)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  // If today is Sunday (0), go back 6 days to Monday, otherwise go back (dayOfWeek - 1) days
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  
  // Load weekly stats from API
  const weekStartStr = dayjs(weekStart).format('YYYY-MM-DD');
  const weekEndStr = dayjs(weekEnd).format('YYYY-MM-DD');
  let weeklyStats = null;
  
  try {
    const response = await axios.get(`/api/sales-weekly-reports/stats?week_start=${weekStartStr}&week_end=${weekEndStr}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    if (response.data.success) {
      weeklyStats = response.data.stats;
    }
  } catch (error) {
    console.error('Failed to load weekly stats:', error);
  }
  
  // Load weekly KPI goals from new API
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  let weeklyKpiGoals = null;
  
  // Calculate week number in month
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const weekNumber = Math.ceil((weekStart.getDate() + firstDayOfMonth.getDay()) / 7);
  
  try {
    const response = await axios.get(`/api/sales-crm/dashboard/kpi-weekly-goals?year=${year}&month=${month}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    if (response.data.success && response.data.goals) {
      // Find the goal for current week
      weeklyKpiGoals = response.data.goals.find(goal => goal.week_number === weekNumber);
    }
  } catch (error) {
    console.error('Failed to load weekly KPI goals:', error);
  }
  
  // Set weekly targets from weekly KPI goals (or defaults if not set)
  const appointmentsTarget = weeklyKpiGoals?.appointments_goal || 5;
  const qualifiedTarget = weeklyKpiGoals?.qualified_goal || 4;
  const negotiationsTarget = weeklyKpiGoals?.negotiations_goal || 3;
  const contractsTarget = weeklyKpiGoals?.deals_goal || 1;
  const customerUnitPriceTarget = weeklyKpiGoals?.customer_unit_price_goal || 400000;
  const revenueTarget = (weeklyKpiGoals?.revenue_goal || 500000) / 10000; // 万円単位に変換
  const grossProfitTarget = (weeklyKpiGoals?.gross_profit_goal || 250000) / 10000; // 万円単位に変換
  const newAgenciesTarget = weeklyKpiGoals?.new_agencies_goal || 0;
  
  content.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        <i class="fas fa-file-alt mr-2 text-indigo-600"></i>週報レポート（KPI達成率表示）
      </h2>

      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="font-bold text-gray-800">今週の活動報告</h3>
            <p class="text-sm text-gray-600">
              ${dayjs(weekStart).format('YYYY/MM/DD')} - ${dayjs(weekEnd).format('YYYY/MM/DD')}
              ${weeklyKpiGoals ? `<span class="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">週間KPI設定済</span>` : `<span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">週間KPI未設定（デフォルト値使用）</span>`}
            </p>
          </div>
          <div class="flex gap-3">
            <button onclick="exportWeeklyReportToPDF()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-file-pdf mr-2"></i>PDF保存
            </button>
            <button onclick="submitWeeklyReport()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-paper-plane mr-2"></i>週報を提出
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Achievement Metrics - 基本4項目 -->
      <h3 class="font-bold text-gray-800 mb-3">営業活動KPI</h3>
      <div class="grid grid-cols-4 gap-4 mb-6">
        ${renderWeeklyKPICard('appointments', 'アポ数', 'calendar-check', 'blue', appointmentsTarget)}
        ${renderWeeklyKPICard('qualified', '見込み化数', 'user-check', 'green', qualifiedTarget)}
        ${renderWeeklyKPICard('negotiations', '商談数', 'handshake', 'yellow', negotiationsTarget)}
        ${renderWeeklyKPICard('contracts', '契約数', 'file-signature', 'purple', contractsTarget)}
      </div>

      <!-- 売上・利益KPI -->
      <h3 class="font-bold text-gray-800 mb-3">売上・利益KPI</h3>
      <div class="grid grid-cols-4 gap-4 mb-6">
        <!-- 新規売上 -->
        <div class="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-chart-line text-orange-600"></i>
            <div class="text-sm text-gray-600">新規売上</div>
          </div>
          <div class="flex items-end gap-2 mb-2">
            <input type="number" id="weekly-revenue" value="0" 
                   oninput="updateWeeklyRevenueAndUnitPrice()"
                   class="text-2xl font-bold text-orange-600 bg-transparent border-b-2 border-orange-300 w-20">
            <span class="text-lg text-gray-600">/ ${revenueTarget.toFixed(1)}万円</span>
          </div>
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-gray-500">目標</span>
            <span id="revenue-achievement" class="font-bold text-gray-400">0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div id="revenue-progress" class="bg-orange-500 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>

        <!-- 顧客単価 -->
        <div class="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-yen-sign text-teal-600"></i>
            <div class="text-sm text-gray-600">顧客単価</div>
          </div>
          <div class="flex items-end gap-2 mb-2">
            <div class="text-2xl font-bold text-teal-600" id="customer-unit-price">
              <span class="text-gray-400">0</span>
            </div>
            <span class="text-lg text-gray-600">/ ${(customerUnitPriceTarget / 10000).toFixed(1)}万円</span>
          </div>
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-gray-500">目標</span>
            <span id="customer-unit-price-achievement" class="font-bold text-gray-400">0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div id="customer-unit-price-progress" class="bg-teal-500 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>

        <!-- 粗利 -->
        <div class="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-coins text-pink-600"></i>
            <div class="text-sm text-gray-600">粗利</div>
          </div>
          <div class="flex items-end gap-2 mb-2">
            <input type="number" id="weekly-gross-profit" value="0" 
                   oninput="updateWeeklyAchievement('gross-profit', this.value, ${grossProfitTarget})"
                   class="text-2xl font-bold text-pink-600 bg-transparent border-b-2 border-pink-300 w-20">
            <span class="text-lg text-gray-600">/ ${grossProfitTarget.toFixed(1)}万円</span>
          </div>
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-gray-500">目標</span>
            <span id="gross-profit-achievement" class="font-bold text-gray-400">0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div id="gross-profit-progress" class="bg-pink-500 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>

        <!-- 新規代理店数 -->
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-handshake text-indigo-600"></i>
            <div class="text-sm text-gray-600">新規代理店数</div>
          </div>
          <div class="flex items-end gap-2 mb-2">
            <input type="number" id="weekly-new-agencies" value="0" 
                   oninput="updateWeeklyAchievement('new-agencies', this.value, ${newAgenciesTarget})"
                   class="text-2xl font-bold text-indigo-600 bg-transparent border-b-2 border-indigo-300 w-16">
            <span class="text-lg text-gray-600">/ ${newAgenciesTarget}</span>
          </div>
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-gray-500">目標</span>
            <span id="new-agencies-achievement" class="font-bold text-gray-400">0%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div id="new-agencies-progress" class="bg-indigo-500 h-2 rounded-full transition-all" style="width: 0%"></div>
          </div>
        </div>
      </div>

      <!-- Text Areas -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">先週の振り返り</label>
          <textarea id="key-achievements" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="KPIを達成していたら達成した要因を記入し、未達成だったら未達成だった原因を記載してください"></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">今週のアクション</label>
          <textarea id="challenges" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="今週何をしてKPIを達成するかを記載してください"></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">来週の予定・目標</label>
          <textarea id="next-week-plan" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="来週の活動計画や目標を記入してください"></textarea>
        </div>
      </div>

      <!-- Previous Reports -->
      <div class="mt-8">
        <h3 class="font-bold text-gray-800 mb-4">過去の週報</h3>
        <div class="space-y-2">
          <div class="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-semibold text-gray-800">2024/01/01 - 2024/01/07</div>
                <div class="text-sm text-gray-600 mt-1">新規3件 / 商談5件 / 成約2件</div>
              </div>
              <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">承認済</span>
            </div>
          </div>
          
          <div class="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-semibold text-gray-800">2023/12/25 - 2023/12/31</div>
                <div class="text-sm text-gray-600 mt-1">新規2件 / 商談4件 / 成約1件</div>
              </div>
              <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">承認済</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Auto-fill fields with weekly stats from API
  if (weeklyStats) {
    setTimeout(() => {
      // Set appointments (新規アポイント数)
      const appointmentsInput = document.getElementById('weekly-appointments');
      if (appointmentsInput && weeklyStats.new_appointments_count !== undefined) {
        appointmentsInput.value = weeklyStats.new_appointments_count;
        updateWeeklyAchievement('appointments', weeklyStats.new_appointments_count, appointmentsTarget);
      }
      
      // Set qualified (見込み化数 = new_prospects_count)
      const qualifiedInput = document.getElementById('weekly-qualified');
      if (qualifiedInput && weeklyStats.new_prospects_count !== undefined) {
        qualifiedInput.value = weeklyStats.new_prospects_count;
        updateWeeklyAchievement('qualified', weeklyStats.new_prospects_count, qualifiedTarget);
      }
      
      // Set negotiations (商談数 = meetings_held)
      const negotiationsInput = document.getElementById('weekly-negotiations');
      if (negotiationsInput && weeklyStats.meetings_held !== undefined) {
        negotiationsInput.value = weeklyStats.meetings_held;
        updateWeeklyAchievement('negotiations', weeklyStats.meetings_held, negotiationsTarget);
      }
      
      // Set contracts (契約数 = deals_won)
      const contractsInput = document.getElementById('weekly-contracts');
      if (contractsInput && weeklyStats.deals_won !== undefined) {
        contractsInput.value = weeklyStats.deals_won;
        updateWeeklyAchievement('contracts', weeklyStats.deals_won, contractsTarget);
      }
      
      // Set revenue (売上 = revenue_generated / 10000 to convert to 万円)
      const revenueInput = document.getElementById('weekly-revenue');
      if (revenueInput && weeklyStats.revenue_generated !== undefined) {
        const revenueInManYen = (weeklyStats.revenue_generated / 10000).toFixed(1);
        revenueInput.value = revenueInManYen;
      }
      
      // Set gross profit (粗利 = gross_profit_generated / 10000 to convert to 万円)
      const grossProfitInput = document.getElementById('weekly-gross-profit');
      if (grossProfitInput && weeklyStats.gross_profit_generated !== undefined) {
        const grossProfitInManYen = (weeklyStats.gross_profit_generated / 10000).toFixed(1);
        grossProfitInput.value = grossProfitInManYen;
        updateWeeklyAchievement('gross-profit', grossProfitInManYen, grossProfitTarget);
      }
      
      // Set new agencies (新規代理店数)
      const newAgenciesInput = document.getElementById('weekly-new-agencies');
      if (newAgenciesInput && weeklyStats.new_agencies_count !== undefined) {
        newAgenciesInput.value = weeklyStats.new_agencies_count;
        updateWeeklyAchievement('new-agencies', weeklyStats.new_agencies_count, newAgenciesTarget);
      }
      
      // Update revenue and customer unit price calculations
      updateWeeklyRevenueAndUnitPrice();
    }, 100);
  }
}

function renderWeeklyKPICard(type, label, icon, color, target) {
  const oninputHandler = type === 'contracts' 
    ? `updateWeeklyAchievement('${type}', this.value, ${target}); updateWeeklyRevenueAndUnitPrice();`
    : `updateWeeklyAchievement('${type}', this.value, ${target})`;
  
  return `
    <div class="bg-${color}-50 rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <i class="fas fa-${icon} text-${color}-600"></i>
        <div class="text-sm text-gray-600">${label}</div>
      </div>
      <div class="flex items-end gap-2 mb-2">
        <input type="number" id="weekly-${type}" value="0" 
               oninput="${oninputHandler}"
               class="text-2xl font-bold text-${color}-600 bg-transparent border-b-2 border-${color}-300 w-16">
        <span class="text-lg text-gray-600">/ ${target.toFixed(1)}</span>
      </div>
      <div class="flex justify-between items-center text-xs">
        <span class="text-gray-500">目標</span>
        <span id="${type}-achievement" class="font-bold text-gray-400">0%</span>
      </div>
      <div class="mt-2">
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div id="${type}-progress" class="bg-${color}-500 h-2 rounded-full transition-all" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `;
}

function updateWeeklyAchievement(type, actual, target) {
  const actualValue = parseFloat(actual) || 0;
  const targetValue = parseFloat(target) || 1;
  const achievement = Math.round((actualValue / targetValue) * 100);
  
  const achievementEl = document.getElementById(`${type}-achievement`);
  const progressEl = document.getElementById(`${type}-progress`);
  
  if (achievementEl && progressEl) {
    achievementEl.textContent = `${achievement}%`;
    achievementEl.className = `font-bold ${achievement >= 100 ? 'text-green-600' : achievement >= 80 ? 'text-yellow-600' : 'text-red-600'}`;
    progressEl.style.width = `${Math.min(achievement, 100)}%`;
  }
}

function updateWeeklyRevenueAndUnitPrice() {
  const revenue = parseFloat(document.getElementById('weekly-revenue')?.value) || 0;
  const contracts = parseFloat(document.getElementById('weekly-contracts')?.value) || 0;
  
  // Calculate customer unit price (in 万円)
  const unitPrice = contracts > 0 ? (revenue / contracts).toFixed(1) : 0;
  
  // Update unit price display
  const unitPriceEl = document.getElementById('customer-unit-price');
  if (unitPriceEl) {
    unitPriceEl.innerHTML = `<span class="${unitPrice > 0 ? 'text-teal-600' : 'text-gray-400'}">${unitPrice}</span>`;
  }
  
  // Get customer unit price target from the display (extract from "/ XX万円" format)
  const unitPriceTargetText = document.querySelector('#customer-unit-price')?.parentElement?.nextElementSibling?.textContent;
  const unitPriceTargetMatch = unitPriceTargetText?.match(/\/\s*([\d.]+)万円/);
  const customerUnitPriceTarget = unitPriceTargetMatch ? parseFloat(unitPriceTargetMatch[1]) : 0;
  
  // Update customer unit price achievement
  if (customerUnitPriceTarget > 0 && unitPrice > 0) {
    updateWeeklyAchievement('customer-unit-price', unitPrice, customerUnitPriceTarget);
  }
  
  // Get revenue target from the display
  const revenueTargetText = document.querySelector('#weekly-revenue')?.parentElement?.nextElementSibling?.textContent;
  const revenueTargetMatch = revenueTargetText?.match(/\/\s*([\d.]+)万円/);
  const revenueTarget = revenueTargetMatch ? parseFloat(revenueTargetMatch[1]) : 0;
  
  // Update revenue achievement
  if (revenueTarget > 0) {
    updateWeeklyAchievement('revenue', revenue, revenueTarget);
  }
}

// Export weekly report to PDF (using html2pdf for proper Japanese support)
async function exportWeeklyReportToPDF() {
  try {
    // Show loading toast
    showToast('PDFを生成中...', 'info');
    
    // Get the content area element
    const element = document.getElementById('content-area');
    if (!element) {
      throw new Error('Content area not found');
    }
    
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true);
    
    // Remove buttons from the cloned element
    const buttons = clonedElement.querySelectorAll('button');
    buttons.forEach(btn => btn.remove());
    
    // Calculate week dates for filename
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const filename = `weekly_report_${dayjs(weekStart).format('YYYYMMDD')}.pdf`;
    
    // Configure html2pdf options
    const options = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };
    
    // Generate PDF
    await html2pdf().set(options).from(clonedElement).save();
    
    showToast('週報をPDF保存しました', 'success');
  } catch (error) {
    console.error('PDF export error:', error);
    showToast('PDF保存に失敗しました', 'error');
  }
}

function submitWeeklyReport() {
  const data = {
    appointments: document.getElementById('weekly-appointments')?.value || 0,
    qualified: document.getElementById('weekly-qualified')?.value || 0,
    negotiations: document.getElementById('weekly-negotiations')?.value || 0,
    contracts: document.getElementById('weekly-contracts')?.value || 0,
    revenue: document.getElementById('weekly-revenue')?.value || 0,
    gross_profit: document.getElementById('weekly-gross-profit')?.value || 0,
    new_agencies: document.getElementById('weekly-new-agencies')?.value || 0,
    customer_unit_price: document.getElementById('customer-unit-price')?.textContent?.replace(/[^\d.]/g, '') || 0,
    key_achievements: document.getElementById('key-achievements')?.value || '',
    challenges: document.getElementById('challenges')?.value || '',
    next_week_plan: document.getElementById('next-week-plan')?.value || ''
  };
  
  showToast('週報を提出しました', 'success');
  console.log('Weekly report data:', data);
}

// ==================== NURTURING CRM VIEWS ====================

// Global state for nurturing CRM
let masterContacts = [];
let deals8Stage = [];
let interactions = [];

// Load master contacts
async function loadMasterContacts() {
  try {
    const response = await axios.get('/api/master-contacts', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      masterContacts = response.data.contacts;
    }
  } catch (error) {
    console.error('Failed to load master contacts:', error);
    showToast('マスター連絡先の読み込みに失敗しました', 'error');
  }
}

// Render Master Contacts View
function renderMasterContactsView() {
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-address-book mr-2 text-indigo-600"></i>マスター連絡先管理
        </h2>
        <button onclick="showNewMasterContactModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
          <i class="fas fa-plus mr-2"></i>新規連絡先追加
        </button>
      </div>
      
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-yellow-700"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              <strong>マスター連絡先</strong>: 人物・企業の基本情報を一元管理します。ここに登録した連絡先をベースに案件（Deal）を作成します。
            </p>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
          <div class="text-sm text-gray-600 mb-1">総連絡先数</div>
          <div class="text-3xl font-bold text-blue-600">${masterContacts.length}</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
          <div class="text-sm text-gray-600 mb-1">HOT</div>
          <div class="text-3xl font-bold text-green-600">${masterContacts.filter(c => c.relationship_strength === 'hot').length}</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-md border-l-4 border-yellow-500">
          <div class="text-sm text-gray-600 mb-1">WARM</div>
          <div class="text-3xl font-bold text-yellow-600">${masterContacts.filter(c => c.relationship_strength === 'warm').length}</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-md border-l-4 border-gray-500">
          <div class="text-sm text-gray-600 mb-1">COLD</div>
          <div class="text-3xl font-bold text-gray-600">${masterContacts.filter(c => c.relationship_strength === 'cold').length}</div>
        </div>
      </div>

      <!-- Contacts Table -->
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">名前</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">会社名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">役職</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">関係性</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">リードスコア</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">アクティブ案件</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">最終接触日</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody id="master-contacts-tbody">
            ${renderMasterContactsRows()}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  loadMasterContacts();
}

function renderMasterContactsRows() {
  if (masterContacts.length === 0) {
    return `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2 text-gray-400"></i>
          <p>連絡先がまだ登録されていません</p>
          <button onclick="showNewMasterContactModal()" class="mt-3 text-indigo-600 hover:text-indigo-800">
            <i class="fas fa-plus mr-1"></i>新規登録
          </button>
        </td>
      </tr>
    `;
  }
  
  return masterContacts.map(c => {
    const relationshipColors = {
      hot: 'bg-green-100 text-green-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-gray-100 text-gray-800'
    };
    
    return `
      <tr class="border-b hover:bg-gray-50 transition cursor-pointer" onclick="viewMasterContact(${c.id})">
        <td class="px-4 py-3">
          <div class="font-semibold text-gray-800">${c.name}</div>
          <div class="text-xs text-gray-500">${c.email || ''}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${c.company_name || '-'}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${c.position || '-'}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${relationshipColors[c.relationship_strength] || 'bg-gray-100 text-gray-800'}">
            ${c.relationship_strength?.toUpperCase() || 'COLD'}
          </span>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center">
            <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
              <div class="bg-indigo-600 h-2 rounded-full" style="width: ${c.lead_score || 0}%"></div>
            </div>
            <span class="text-sm text-gray-600">${c.lead_score || 0}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            ${c.active_deals_count || 0}件
          </span>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600">${c.last_contact_date ? new Date(c.last_contact_date).toLocaleDateString('ja-JP') : '-'}</td>
        <td class="px-4 py-3 text-center">
          <button onclick="event.stopPropagation(); viewMasterContact(${c.id})" class="text-indigo-600 hover:text-indigo-800 mr-2">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="event.stopPropagation(); editMasterContact(${c.id})" class="text-blue-600 hover:text-blue-800">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Deals (8-Stage) View
function renderDeals8StageView() {
  const contentArea = document.getElementById('content-area');
  
  const stages = [
    { key: 'prospect', label: '見込み', icon: 'fa-eye', color: 'blue' },
    { key: 'nurturing', label: '関係構築', icon: 'fa-seedling', color: 'green' },
    { key: 'scheduling', label: '日程調整中', icon: 'fa-calendar-alt', color: 'yellow' },
    { key: 'meeting_held', label: '商談実施', icon: 'fa-handshake', color: 'orange' },
    { key: 'proposal', label: '提案', icon: 'fa-file-invoice', color: 'purple' },
    { key: 'won', label: '成約', icon: 'fa-trophy', color: 'emerald' },
    { key: 'payment_pending', label: '入金待ち', icon: 'fa-clock', color: 'pink' },
    { key: 'paid', label: '入金済み', icon: 'fa-check-circle', color: 'teal' }
  ];
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-handshake mr-2 text-indigo-600"></i>案件管理（8段階パイプライン）
        </h2>
        <button onclick="showNewDealModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
          <i class="fas fa-plus mr-2"></i>新規案件追加
        </button>
      </div>
      
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-blue-700"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700">
              <strong>8段階パイプライン</strong>: 見込み → 関係構築 → 日程調整中 → 商談実施 → 提案 → 成約 → 入金待ち → 入金済み
            </p>
          </div>
        </div>
      </div>

      <!-- Stage Pipeline -->
      <div class="grid grid-cols-8 gap-2 mb-6">
        ${stages.map(stage => `
          <div class="bg-${stage.color}-50 rounded-lg p-3 text-center border border-${stage.color}-200">
            <i class="fas ${stage.icon} text-${stage.color}-600 text-xl mb-1"></i>
            <div class="text-xs font-semibold text-${stage.color}-800">${stage.label}</div>
            <div class="text-2xl font-bold text-${stage.color}-600" id="count-${stage.key}">0</div>
          </div>
        `).join('')}
      </div>

      <!-- Deals List -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="font-bold text-gray-800 mb-4">案件一覧</h3>
        <div id="deals-list">
          <p class="text-center text-gray-500 py-8">案件データを読み込んでいます...</p>
        </div>
      </div>
    </div>
  `;
  
  loadDeals8Stage();
}

async function loadDeals8Stage() {
  try {
    const response = await axios.get('/api/deals', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      deals8Stage = response.data.deals;
      updateDealsDisplay();
    }
  } catch (error) {
    console.error('Failed to load deals:', error);
    showToast('案件の読み込みに失敗しました', 'error');
  }
}

function updateDealsDisplay() {
  // Update stage counts
  const stages = ['prospect', 'nurturing', 'scheduling', 'meeting_held', 'proposal', 'won', 'payment_pending', 'paid'];
  stages.forEach(stage => {
    const count = deals8Stage.filter(d => d.stage === stage).length;
    const element = document.getElementById(`count-${stage}`);
    if (element) {
      element.textContent = count;
    }
  });
  
  // Update deals list
  const dealsList = document.getElementById('deals-list');
  if (!dealsList) return;
  
  if (deals8Stage.length === 0) {
    dealsList.innerHTML = `
      <p class="text-center text-gray-500 py-8">
        <i class="fas fa-inbox text-4xl mb-2 text-gray-400 block"></i>
        案件がまだ登録されていません
        <button onclick="showNewDealModal()" class="block mx-auto mt-3 text-indigo-600 hover:text-indigo-800">
          <i class="fas fa-plus mr-1"></i>新規登録
        </button>
      </p>
    `;
    return;
  }
  
  const stageLabels = {
    prospect: '見込み',
    nurturing: '関係構築',
    scheduling: '日程調整中',
    meeting_held: '商談実施',
    proposal: '提案',
    won: '成約',
    payment_pending: '入金待ち',
    paid: '入金済み'
  };
  
  dealsList.innerHTML = `
    <div class="space-y-2">
      ${deals8Stage.map(deal => `
        <div class="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer" onclick="viewDeal(${deal.id})">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-semibold text-gray-800">${deal.deal_name}</div>
              <div class="text-sm text-gray-600 mt-1">
                ${deal.contact_name || deal.company_name || '-'}
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold">
                  ${stageLabels[deal.stage] || deal.stage}
                </span>
                <span class="text-xs text-gray-500">
                  <i class="fas fa-yen-sign mr-1"></i>${(deal.estimated_value || 0).toLocaleString()}
                </span>
                <span class="text-xs text-gray-500">
                  <i class="fas fa-comments mr-1"></i>${deal.interaction_count || 0}回
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">${deal.owner_name || '-'}</div>
              <div class="text-xs text-gray-500 mt-1">
                ${deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('ja-JP') : '-'}
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Render Interactions View
function renderInteractionsView() {
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-comments mr-2 text-indigo-600"></i>接点ログ
        </h2>
        <button onclick="showNewInteractionModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
          <i class="fas fa-plus mr-2"></i>接点記録を追加
        </button>
      </div>
      
      <div class="bg-purple-50 border-l-4 border-purple-400 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-purple-700"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-purple-700">
              <strong>接点ログ</strong>: 電話・メール・会議・LINE・Instagram DM・TikTok DMなど、すべてのコミュニケーションを記録します。
            </p>
          </div>
        </div>
      </div>

      <!-- Interaction Types Stats -->
      <div class="grid grid-cols-6 gap-3 mb-6">
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fas fa-phone text-blue-600 text-xl mb-1"></i>
          <div class="text-xs text-gray-600">電話</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fas fa-envelope text-red-600 text-xl mb-1"></i>
          <div class="text-xs text-gray-600">メール</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fas fa-handshake text-green-600 text-xl mb-1"></i>
          <div class="text-xs text-gray-600">会議</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fab fa-line text-green-500 text-xl mb-1"></i>
          <div class="text-xs text-gray-600">LINE</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fab fa-instagram text-pink-600 text-xl mb-1"></i>
          <div class="text-xs text-gray-600">IG DM</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
        <div class="bg-white rounded-lg p-3 shadow text-center">
          <i class="fab fa-tiktok text-black text-xl mb-1"></i>
          <div class="text-xs text-gray-600">TikTok</div>
          <div class="text-xl font-bold text-gray-800">0</div>
        </div>
      </div>

      <!-- Interactions Timeline -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="font-bold text-gray-800 mb-4">最近の接点</h3>
        <div id="interactions-timeline">
          <p class="text-center text-gray-500 py-8">接点ログを読み込んでいます...</p>
        </div>
      </div>
    </div>
  `;
  
  loadInteractions();
}

async function loadInteractions() {
  try {
    const response = await axios.get('/api/interactions', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      interactions = response.data.interactions;
      updateInteractionsDisplay();
    }
  } catch (error) {
    console.error('Failed to load interactions:', error);
    showToast('接点ログの読み込みに失敗しました', 'error');
  }
}

function updateInteractionsDisplay() {
  const timeline = document.getElementById('interactions-timeline');
  if (!timeline) return;
  
  if (interactions.length === 0) {
    timeline.innerHTML = `
      <p class="text-center text-gray-500 py-8">
        <i class="fas fa-inbox text-4xl mb-2 text-gray-400 block"></i>
        接点ログがまだ登録されていません
        <button onclick="showNewInteractionModal()" class="block mx-auto mt-3 text-indigo-600 hover:text-indigo-800">
          <i class="fas fa-plus mr-1"></i>接点記録を追加
        </button>
      </p>
    `;
    return;
  }
  
  const typeIcons = {
    call: 'fa-phone',
    email: 'fa-envelope',
    meeting: 'fa-handshake',
    video_call: 'fa-video',
    line: 'fab fa-line',
    instagram_dm: 'fab fa-instagram',
    tiktok_dm: 'fab fa-tiktok',
    facebook_dm: 'fab fa-facebook',
    twitter_dm: 'fab fa-twitter',
    linkedin: 'fab fa-linkedin',
    sms: 'fa-sms',
    other: 'fa-comment'
  };
  
  const typeLabels = {
    call: '電話',
    email: 'メール',
    meeting: '会議',
    video_call: 'ビデオ通話',
    line: 'LINE',
    instagram_dm: 'Instagram DM',
    tiktok_dm: 'TikTok DM',
    facebook_dm: 'Facebook DM',
    twitter_dm: 'Twitter DM',
    linkedin: 'LinkedIn',
    sms: 'SMS',
    other: 'その他'
  };
  
  timeline.innerHTML = `
    <div class="space-y-3">
      ${interactions.map(interaction => `
        <div class="border-l-4 border-indigo-500 pl-4 py-3">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <i class="${typeIcons[interaction.interaction_type] || 'fa-comment'} text-indigo-600"></i>
                <span class="font-semibold text-gray-800">${typeLabels[interaction.interaction_type] || interaction.interaction_type}</span>
                <span class="text-xs text-gray-500">
                  ${new Date(interaction.interaction_date).toLocaleString('ja-JP')}
                </span>
              </div>
              <div class="text-sm text-gray-700 mb-1">
                <strong>${interaction.contact_name || '連絡先不明'}</strong>
                ${interaction.contact_company ? ` - ${interaction.contact_company}` : ''}
              </div>
              <div class="text-sm text-gray-600">${interaction.summary}</div>
            </div>
            <button onclick="viewInteraction(${interaction.id})" class="text-indigo-600 hover:text-indigo-800">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Render Nurturing Dashboard View
function renderNurturingDashboardView() {
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">
        <i class="fas fa-heart mr-2 text-indigo-600"></i>ナーチャリングダッシュボード
      </h2>
      
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-6">
        <h3 class="text-lg font-bold text-indigo-900 mb-2">
          <i class="fas fa-sparkles mr-2"></i>関係構築を重視した営業CRM
        </h3>
        <p class="text-indigo-700 text-sm">
          3層データモデル（マスター連絡先・案件・接点ログ）で、見込み客との関係を段階的に育てます。
        </p>
      </div>

      <!-- Key Metrics -->
      <div class="grid grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-semibold text-gray-600">総連絡先数</div>
            <i class="fas fa-address-book text-3xl text-blue-600"></i>
          </div>
          <div class="text-4xl font-bold text-gray-800">${masterContacts.length}</div>
          <div class="text-sm text-gray-500 mt-2">
            HOT: ${masterContacts.filter(c => c.relationship_strength === 'hot').length} / 
            WARM: ${masterContacts.filter(c => c.relationship_strength === 'warm').length} / 
            COLD: ${masterContacts.filter(c => c.relationship_strength === 'cold').length}
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-semibold text-gray-600">アクティブ案件</div>
            <i class="fas fa-handshake text-3xl text-green-600"></i>
          </div>
          <div class="text-4xl font-bold text-gray-800">${deals8Stage.filter(d => d.deal_status === 'active').length}</div>
          <div class="text-sm text-gray-500 mt-2">
            成約: ${deals8Stage.filter(d => d.stage === 'won').length} / 
            提案中: ${deals8Stage.filter(d => d.stage === 'proposal').length}
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-md">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-semibold text-gray-600">今月の接点数</div>
            <i class="fas fa-comments text-3xl text-purple-600"></i>
          </div>
          <div class="text-4xl font-bold text-gray-800">${interactions.length}</div>
          <div class="text-sm text-gray-500 mt-2">
            直近30日間のコミュニケーション記録
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl p-6 shadow-md">
        <h3 class="font-bold text-gray-800 mb-4">
          <i class="fas fa-bolt mr-2 text-yellow-500"></i>クイックアクション
        </h3>
        <div class="grid grid-cols-3 gap-4">
          <button onclick="switchView('master-contacts')" class="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition">
            <i class="fas fa-address-book text-2xl text-indigo-600 mb-2"></i>
            <div class="font-semibold text-gray-800">連絡先を追加</div>
            <div class="text-xs text-gray-500 mt-1">新しい人物・企業を登録</div>
          </button>
          
          <button onclick="showNewDealModal()" class="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
            <i class="fas fa-handshake text-2xl text-green-600 mb-2"></i>
            <div class="font-semibold text-gray-800">案件を作成</div>
            <div class="text-xs text-gray-500 mt-1">8段階パイプラインで管理</div>
          </button>
          
          <button onclick="showNewInteractionModal()" class="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition">
            <i class="fas fa-comments text-2xl text-purple-600 mb-2"></i>
            <div class="font-semibold text-gray-800">接点を記録</div>
            <div class="text-xs text-gray-500 mt-1">コミュニケーション履歴</div>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Placeholder functions for modals and actions
function showNewMasterContactModal() {
  showToast('マスター連絡先追加機能は開発中です', 'info');
}

function viewMasterContact(id) {
  showToast(`連絡先 ID: ${id} の詳細表示機能は開発中です`, 'info');
}

function editMasterContact(id) {
  showToast(`連絡先 ID: ${id} の編集機能は開発中です`, 'info');
}

function showNewDealModal() {
  showToast('案件追加機能は開発中です', 'info');
}

function viewDeal(id) {
  showToast(`案件 ID: ${id} の詳細表示機能は開発中です`, 'info');
}

function showNewInteractionModal() {
  showToast('接点記録追加機能は開発中です', 'info');
}

function viewInteraction(id) {
  showToast(`接点 ID: ${id} の詳細表示機能は開発中です`, 'info');
}

// ==================== NEW APPOINTMENT VIEW ====================

let newAppointments = [];

// Load new appointments
async function loadNewAppointments() {
  try {
    const response = await axios.get('/api/new-appointments', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      newAppointments = response.data.appointments || [];
    }
  } catch (error) {
    console.error('Failed to load new appointments:', error);
    // If API doesn't exist yet, initialize empty array
    newAppointments = [];
  }
}

// Render new appointment view
async function renderNewAppointmentView() {
  await loadNewAppointments();
  
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-user-plus mr-3 text-indigo-600"></i>新規アポイント
        </h2>
        <button onclick="openNewAppointmentModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-md">
          <i class="fas fa-plus mr-2"></i>新規アポイント登録
        </button>
      </div>

      <!-- Filter and Search -->
      <div class="flex gap-4 mb-6">
        <div class="flex-1">
          <input 
            type="text" 
            id="appointment-search" 
            placeholder="名前、会社名で検索..." 
            onkeyup="filterAppointments()"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
        </div>
        <select id="appointment-status-filter" onchange="filterAppointments()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="all">すべてのステータス</option>
          <option value="見込み外">見込み外</option>
          <option value="見込み化">見込み化</option>
          <option value="商談">商談</option>
          <option value="契約">契約</option>
          <option value="入金済み">入金済み</option>
          <option value="協業候補">協業候補</option>
          <option value="協業先">協業先</option>
        </select>
        <select id="appointment-month-filter" onchange="filterAppointments()" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="all">すべての期間</option>
          <option value="this-month">今月</option>
          <option value="last-month">先月</option>
        </select>
      </div>

      <!-- Appointments Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">アポイント日時</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">会社名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">担当者名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">連絡先</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">アポイント方法</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ステータス</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">登録日</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody id="appointments-table-body">
            ${renderAppointmentsTable()}
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Appointment Modal -->
    <div id="new-appointment-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-user-plus mr-2 text-indigo-600"></i>新規アポイント登録
          </h3>
          <button onclick="closeNewAppointmentModal()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="new-appointment-form" class="p-6 space-y-4">
          <!-- アポイント日時 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              アポイント日時 <span class="text-red-500">*</span>
            </label>
            <input 
              type="datetime-local" 
              id="appointment-datetime" 
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
          </div>

          <!-- 会社情報 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                会社名 <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                id="appointment-company" 
                required
                placeholder="株式会社〇〇"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                業界
              </label>
              <input 
                type="text" 
                id="appointment-industry"
                placeholder="IT、製造業など"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>

          <!-- 担当者情報 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                担当者名 <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                id="appointment-contact-name" 
                required
                placeholder="山田太郎"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                役職
              </label>
              <input 
                type="text" 
                id="appointment-contact-position"
                placeholder="代表取締役、部長など"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>

          <!-- 連絡先情報 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input 
                type="email" 
                id="appointment-email"
                placeholder="yamada@example.com"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input 
                type="tel" 
                id="appointment-phone"
                placeholder="03-1234-5678"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>

          <!-- アポイント方法 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              アポイント方法 <span class="text-red-500">*</span>
            </label>
            <select 
              id="appointment-method" 
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">選択してください</option>
              <option value="phone">電話</option>
              <option value="email">メール</option>
              <option value="dm">DM（Instagram/Twitter等）</option>
              <option value="referral">紹介</option>
              <option value="event">イベント</option>
              <option value="website">Webサイト問い合わせ</option>
              <option value="other">その他</option>
            </select>
          </div>

          <!-- 紹介者情報（紹介の場合） -->
          <div id="referrer-section" class="hidden grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                紹介者名
              </label>
              <input 
                type="text" 
                id="appointment-referrer-name"
                placeholder="紹介してくれた方の名前"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                紹介者会社
              </label>
              <input 
                type="text" 
                id="appointment-referrer-company"
                placeholder="紹介者の会社名"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
            </div>
          </div>

          <!-- ステータス -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select 
              id="appointment-status"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="見込み外">見込み外</option>
              <option value="見込み化">見込み化</option>
              <option value="商談">商談</option>
              <option value="契約">契約</option>
              <option value="入金済み">入金済み</option>
              <option value="協業候補">協業候補</option>
              <option value="協業先">協業先</option>
            </select>
          </div>

          <!-- メモ -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              メモ
            </label>
            <textarea 
              id="appointment-notes" 
              rows="3"
              placeholder="アポイントに関するメモや特記事項"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-3 pt-4">
            <button 
              type="submit" 
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              <i class="fas fa-save mr-2"></i>登録
            </button>
            <button 
              type="button" 
              onclick="closeNewAppointmentModal()"
              class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Show/hide referrer section based on appointment method
  document.getElementById('appointment-method').addEventListener('change', (e) => {
    const referrerSection = document.getElementById('referrer-section');
    if (e.target.value === 'referral') {
      referrerSection.classList.remove('hidden');
    } else {
      referrerSection.classList.add('hidden');
    }
  });

  // Handle form submission
  document.getElementById('new-appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveNewAppointment();
  });
}

// Render appointments table
function renderAppointmentsTable() {
  if (newAppointments.length === 0) {
    return `
      <tr>
        <td colspan="8" class="px-4 py-12 text-center text-gray-500">
          <i class="fas fa-calendar-times text-4xl mb-3 opacity-50"></i>
          <p class="text-lg">まだアポイントが登録されていません</p>
          <p class="text-sm">「新規アポイント登録」ボタンから登録してください</p>
        </td>
      </tr>
    `;
  }

  return newAppointments.map(appointment => `
    <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
      <td class="px-4 py-3">
        <div class="font-medium text-gray-900">${dayjs(appointment.appointment_datetime).format('YYYY/MM/DD HH:mm')}</div>
      </td>
      <td class="px-4 py-3">
        <div class="font-medium text-gray-900">${appointment.company_name}</div>
        ${appointment.industry ? `<div class="text-xs text-gray-500">${appointment.industry}</div>` : ''}
      </td>
      <td class="px-4 py-3">
        <div class="font-medium text-gray-900">${appointment.contact_name}</div>
        ${appointment.contact_position ? `<div class="text-xs text-gray-500">${appointment.contact_position}</div>` : ''}
      </td>
      <td class="px-4 py-3 text-sm">
        ${appointment.email ? `<div class="mb-1"><i class="fas fa-envelope text-gray-400 mr-1"></i>${appointment.email}</div>` : ''}
        ${appointment.phone ? `<div><i class="fas fa-phone text-gray-400 mr-1"></i>${appointment.phone}</div>` : ''}
      </td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMethodBadgeClass(appointment.method)}">
          <i class="${getMethodIcon(appointment.method)} mr-1"></i>${getMethodLabel(appointment.method)}
        </span>
      </td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(appointment.status)}">
          ${getStatusLabel(appointment.status)}
        </span>
      </td>
      <td class="px-4 py-3 text-sm text-gray-600">
        ${dayjs(appointment.created_at).format('YYYY/MM/DD')}
      </td>
      <td class="px-4 py-3 text-center">
        <button onclick="editAppointment(${appointment.id})" class="text-indigo-600 hover:text-indigo-800 mx-1" title="編集">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteAppointment(${appointment.id})" class="text-red-600 hover:text-red-800 mx-1" title="削除">
          <i class="fas fa-trash"></i>
        </button>
        ${['\u898b\u8fbc\u307f\u5316', '\u5546\u8ac7', '\u5951\u7d04', '\u5165\u91d1\u6e08\u307f'].includes(appointment.status) ? `
          <button onclick="convertToProspect(${appointment.id})" class="text-green-600 hover:text-green-800 mx-1" title="見込み客に変換">
            <i class="fas fa-arrow-right"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// Helper functions
function getMonthlyAppointments() {
  const now = new Date();
  const thisMonth = newAppointments.filter(a => {
    const date = new Date(a.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  return thisMonth.length;
}

function getWeeklyAppointments() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return newAppointments.filter(a => new Date(a.created_at) >= oneWeekAgo).length;
}

function getConversionRate() {
  if (newAppointments.length === 0) return 0;
  // 見込み化以上のステータスをコンバージョンとみなす
  const converted = newAppointments.filter(a => 
    ['見込み化', '商談', '契約', '入金済み', '協業候補', '協業先'].includes(a.status)
  ).length;
  return Math.round((converted / newAppointments.length) * 100);
}

function getMethodBadgeClass(method) {
  const classes = {
    phone: 'bg-blue-100 text-blue-800',
    email: 'bg-purple-100 text-purple-800',
    dm: 'bg-pink-100 text-pink-800',
    referral: 'bg-green-100 text-green-800',
    event: 'bg-orange-100 text-orange-800',
    website: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800'
  };
  return classes[method] || classes.other;
}

function getMethodIcon(method) {
  const icons = {
    phone: 'fas fa-phone',
    email: 'fas fa-envelope',
    dm: 'fas fa-comment',
    referral: 'fas fa-user-friends',
    event: 'fas fa-calendar-alt',
    website: 'fas fa-globe',
    other: 'fas fa-question'
  };
  return icons[method] || icons.other;
}

function getMethodLabel(method) {
  const labels = {
    phone: '電話',
    email: 'メール',
    dm: 'DM',
    referral: '紹介',
    event: 'イベント',
    website: 'Web',
    other: 'その他'
  };
  return labels[method] || method;
}

function getStatusBadgeClass(status) {
  const classes = {
    '見込み外': 'bg-gray-100 text-gray-800',
    '見込み化': 'bg-yellow-100 text-yellow-800',
    '商談': 'bg-blue-100 text-blue-800',
    '契約': 'bg-green-100 text-green-800',
    '入金済み': 'bg-emerald-100 text-emerald-800',
    '協業候補': 'bg-purple-100 text-purple-800',
    '協業先': 'bg-indigo-100 text-indigo-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
  // 日本語ステータスをそのまま返す
  return status;
}

// Modal functions
function openNewAppointmentModal() {
  document.getElementById('new-appointment-modal').classList.remove('hidden');
  // Set default datetime to now
  const now = new Date();
  const datetime = now.toISOString().slice(0, 16);
  document.getElementById('appointment-datetime').value = datetime;
}

function closeNewAppointmentModal() {
  document.getElementById('new-appointment-modal').classList.add('hidden');
  document.getElementById('new-appointment-form').reset();
}

// Save new appointment
async function saveNewAppointment() {
  const formData = {
    appointment_datetime: document.getElementById('appointment-datetime').value,
    company_name: document.getElementById('appointment-company').value,
    industry: document.getElementById('appointment-industry').value || null,
    contact_name: document.getElementById('appointment-contact-name').value,
    contact_position: document.getElementById('appointment-contact-position').value || null,
    email: document.getElementById('appointment-email').value || null,
    phone: document.getElementById('appointment-phone').value || null,
    method: document.getElementById('appointment-method').value,
    referrer_name: document.getElementById('appointment-referrer-name').value || null,
    referrer_company: document.getElementById('appointment-referrer-company').value || null,
    status: document.getElementById('appointment-status').value,
    notes: document.getElementById('appointment-notes').value || null
  };

  try {
    const response = await axios.post('/api/new-appointments', formData, {
      headers: { 'X-Session-Token': sessionToken }
    });

    if (response.data.success) {
      showToast('アポイントを登録しました！', 'success');
      closeNewAppointmentModal();
      await renderNewAppointmentView();
    } else {
      showToast('登録に失敗しました: ' + response.data.error, 'error');
    }
  } catch (error) {
    console.error('Error saving appointment:', error);
    showToast('登録に失敗しました', 'error');
  }
}

// Filter appointments
function filterAppointments() {
  const search = document.getElementById('appointment-search').value.toLowerCase();
  const statusFilter = document.getElementById('appointment-status-filter').value;
  const monthFilter = document.getElementById('appointment-month-filter').value;

  // Apply filters (implementation depends on your data structure)
  renderNewAppointmentView();
}

// Edit appointment
function editAppointment(id) {
  showToast('編集機能は開発中です', 'info');
}

// Delete appointment
async function deleteAppointment(id) {
  if (!confirm('このアポイントを削除してもよろしいですか？')) return;

  try {
    const response = await axios.delete(`/api/new-appointments/${id}`, {
      headers: { 'X-Session-Token': sessionToken }
    });

    if (response.data.success) {
      showToast('アポイントを削除しました', 'success');
      await renderNewAppointmentView();
    } else {
      showToast('削除に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    showToast('削除に失敗しました', 'error');
  }
}

// Convert to prospect
async function convertToProspect(id) {
  if (!confirm('このアポイントを見込み客として登録しますか？')) return;

  try {
    const response = await axios.post(`/api/new-appointments/${id}/convert`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });

    if (response.data.success) {
      showToast('見込み客として登録しました！', 'success');
      await renderNewAppointmentView();
    } else {
      showToast('変換に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error converting to prospect:', error);
    showToast('変換に失敗しました', 'error');
  }
}

// ==================== LOGOUT ====================

function logout() {
  localStorage.removeItem('session_token');
  window.location.href = '/';
}

// ==================== DASHBOARD VIEW ====================

async function renderDashboardView() {
  const contentArea = document.getElementById('content-area');
  
  try {
    const response = await axios.get('/api/sales-crm/dashboard', {
      headers: { 'X-Session-Token': sessionToken }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to load dashboard data');
    }

    const {
      today_tasks,
      today_appointments,
      monthly_stats,
      weekly_stats,
      pipeline,
      kpi,
      team_stats,
      alerts
    } = response.data.data;

    contentArea.innerHTML = `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">
          <i class="fas fa-tachometer-alt mr-2 text-indigo-600"></i>営業CRMダッシュボード
        </h2>
        <p class="text-gray-600 text-sm">今日のタスクと営業活動の全体像</p>
      </div>

      <!-- 上部: 今日のタスクとアポイント + 実績カード -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- 今日のタスク -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span><i class="fas fa-tasks mr-2 text-indigo-600"></i>今日のタスク</span>
            <span class="text-2xl font-bold text-indigo-600">${today_tasks.length}</span>
          </h3>
          <div class="space-y-2 max-h-80 overflow-y-auto">
            ${today_tasks.length === 0 ? `
              <div class="text-center text-gray-500 py-6">
                <i class="fas fa-check-circle text-3xl mb-2 opacity-50"></i>
                <p class="text-sm">今日のタスクはありません</p>
              </div>
            ` : today_tasks.map(task => `
              <div class="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition cursor-pointer" onclick="completeTask(${task.id})">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="font-semibold text-gray-800 text-sm">${task.company_name || task.deal_name}</div>
                    <div class="text-xs text-gray-600 mt-1">${task.next_action_description || '要対応'}</div>
                    ${task.estimated_value ? `<div class="text-xs font-semibold text-green-600 mt-1">¥${Number(task.estimated_value).toLocaleString()}</div>` : ''}
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                    ${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 今日のアポイント -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span><i class="fas fa-calendar-check mr-2 text-green-600"></i>今日のアポイント</span>
            <span class="text-2xl font-bold text-green-600">${today_appointments.length}</span>
          </h3>
          <div class="space-y-2 max-h-80 overflow-y-auto">
            ${today_appointments.length === 0 ? `
              <div class="text-center text-gray-500 py-6">
                <i class="fas fa-calendar text-3xl mb-2 opacity-50"></i>
                <p class="text-sm">今日のアポイントはありません</p>
              </div>
            ` : today_appointments.map(appt => `
              <div class="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="text-sm text-gray-500">${dayjs(appt.appointment_datetime).format('HH:mm')}</div>
                    <div class="font-semibold text-gray-800 text-sm mt-1">${appt.company_name}</div>
                    <div class="text-xs text-gray-600 mt-1">${appt.contact_name}</div>
                  </div>
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(appt.status)}">
                    ${appt.status}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 実績サマリー -->
        <div class="space-y-4">
          <!-- 今月の実績 -->
          <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 text-white">
            <h3 class="text-lg font-bold mb-3 flex items-center">
              <i class="fas fa-calendar-alt mr-2"></i>今月の実績
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">成約数</div>
                <div class="text-2xl font-bold">${monthly_stats.won_deals}件</div>
              </div>
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">売上</div>
                <div class="text-2xl font-bold">¥${(monthly_stats.revenue / 10000).toFixed(0)}万</div>
              </div>
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">アポ数</div>
                <div class="text-2xl font-bold">${monthly_stats.appointments}件</div>
              </div>
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">成約率</div>
                <div class="text-2xl font-bold">${monthly_stats.conversion_rate}%</div>
              </div>
            </div>
          </div>

          <!-- 今週の実績 -->
          <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md p-6 text-white">
            <h3 class="text-lg font-bold mb-3 flex items-center">
              <i class="fas fa-calendar-week mr-2"></i>今週の実績
            </h3>
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">成約</div>
                <div class="text-2xl font-bold">${weekly_stats.won_deals}件</div>
              </div>
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">売上</div>
                <div class="text-xl font-bold">¥${(weekly_stats.revenue / 10000).toFixed(0)}万</div>
              </div>
              <div class="bg-white bg-opacity-20 rounded-lg p-3">
                <div class="text-xs opacity-90 mb-1">アポ</div>
                <div class="text-2xl font-bold">${weekly_stats.appointments}件</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中部: パイプライン -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-funnel-dollar mr-2 text-purple-600"></i>8段階パイプライン
        </h3>
        <div class="grid grid-cols-4 lg:grid-cols-8 gap-2">
          ${pipeline.map(stage => `
            <div class="bg-gradient-to-br ${getStageBgColor(stage.stage)} rounded-lg p-3 text-center hover:shadow-lg transition cursor-pointer" onclick="switchView('kanban')">
              <div class="text-xs font-semibold mb-1 opacity-90">${stage.stage_label}</div>
              <div class="text-2xl font-bold">${stage.count}</div>
              <div class="text-xs opacity-80 mt-1">¥${(stage.total_value / 10000).toFixed(0)}万</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 下部: KPI達成率 + チーム状況 + アラート -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- KPI達成率 -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-bullseye mr-2 text-red-600"></i>KPI達成率
          </h3>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">月間成約目標</span>
                <span class="font-semibold">${kpi.deals.actual}/${kpi.deals.goal}件</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-green-500 h-3 rounded-full transition-all duration-500" style="width: ${Math.min(100, kpi.deals.achievement)}%"></div>
              </div>
              <div class="text-right text-xs text-gray-500 mt-1">${kpi.deals.achievement}%</div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">月間アポ目標</span>
                <span class="font-semibold">${kpi.appointments.actual}/${kpi.appointments.goal}件</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${Math.min(100, kpi.appointments.achievement)}%"></div>
              </div>
              <div class="text-right text-xs text-gray-500 mt-1">${kpi.appointments.achievement}%</div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">月間売上目標</span>
                <span class="font-semibold">¥${(kpi.revenue.actual / 10000).toFixed(0)}万/¥${(kpi.revenue.goal / 10000).toFixed(0)}万</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-purple-500 h-3 rounded-full transition-all duration-500" style="width: ${Math.min(100, kpi.revenue.achievement)}%"></div>
              </div>
              <div class="text-right text-xs text-gray-500 mt-1">${kpi.revenue.achievement}%</div>
            </div>
          </div>
        </div>

        <!-- チーム全体の状況 -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-users mr-2 text-blue-600"></i>チーム状況
          </h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div class="text-sm text-gray-600">全体成約数</div>
                <div class="text-3xl font-bold text-green-600">${team_stats.total_won_deals}件</div>
              </div>
              <i class="fas fa-trophy text-4xl text-green-300"></i>
            </div>
            <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div class="text-sm text-gray-600">全体売上</div>
                <div class="text-3xl font-bold text-blue-600">¥${(team_stats.total_revenue / 10000).toFixed(0)}万</div>
              </div>
              <i class="fas fa-yen-sign text-4xl text-blue-300"></i>
            </div>
            <div class="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <div class="text-sm text-gray-600">パイプライン総額</div>
                <div class="text-3xl font-bold text-purple-600">¥${(team_stats.pipeline_value / 10000).toFixed(0)}万</div>
              </div>
              <i class="fas fa-funnel-dollar text-4xl text-purple-300"></i>
            </div>
          </div>
        </div>

        <!-- アラート -->
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <i class="fas fa-exclamation-triangle mr-2 text-yellow-600"></i>アラート
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-4 ${alerts.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg cursor-pointer hover:shadow transition" onclick="switchView('kanban')">
              <div class="flex items-center space-x-3">
                <i class="fas fa-clock text-2xl ${alerts.overdue > 0 ? 'text-red-500' : 'text-gray-400'}"></i>
                <div>
                  <div class="text-sm font-semibold text-gray-700">期限超過</div>
                  <div class="text-xs text-gray-500">対応が遅れている案件</div>
                </div>
              </div>
              <div class="text-3xl font-bold ${alerts.overdue > 0 ? 'text-red-600' : 'text-gray-400'}">${alerts.overdue}</div>
            </div>
            <div class="flex items-center justify-between p-4 ${alerts.at_risk > 0 ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg cursor-pointer hover:shadow transition" onclick="switchView('kanban')">
              <div class="flex items-center space-x-3">
                <i class="fas fa-exclamation-circle text-2xl ${alerts.at_risk > 0 ? 'text-orange-500' : 'text-gray-400'}"></i>
                <div>
                  <div class="text-sm font-semibold text-gray-700">リスク案件</div>
                  <div class="text-xs text-gray-500">要注意の案件</div>
                </div>
              </div>
              <div class="text-3xl font-bold ${alerts.at_risk > 0 ? 'text-orange-600' : 'text-gray-400'}">${alerts.at_risk}</div>
            </div>
            <div class="flex items-center justify-between p-4 ${alerts.needs_attention > 0 ? 'bg-yellow-50' : 'bg-gray-50'} rounded-lg cursor-pointer hover:shadow transition" onclick="switchView('kanban')">
              <div class="flex items-center space-x-3">
                <i class="fas fa-bell text-2xl ${alerts.needs_attention > 0 ? 'text-yellow-500' : 'text-gray-400'}"></i>
                <div>
                  <div class="text-sm font-semibold text-gray-700">要対応</div>
                  <div class="text-xs text-gray-500">フォローアップが必要</div>
                </div>
              </div>
              <div class="text-3xl font-bold ${alerts.needs_attention > 0 ? 'text-yellow-600' : 'text-gray-400'}">${alerts.needs_attention}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Dashboard render error:', error);
    contentArea.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        ダッシュボードの読み込み中にエラーが発生しました: ${error.message}
      </div>
    `;
  }
}

// Complete task function
async function completeTask(dealId) {
  if (!confirm('このタスクを完了しますか？')) return;

  try {
    const response = await axios.put(`/api/sales-crm/tasks/${dealId}/complete`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });

    if (response.data.success) {
      showToast('タスクを完了しました', 'success');
      await renderDashboardView();
    } else {
      showToast('タスク完了に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error completing task:', error);
    showToast('タスク完了に失敗しました', 'error');
  }
}

// Helper function for stage background colors
function getStageBgColor(stage) {
  const colors = {
    'prospect': 'from-gray-400 to-gray-500 text-white',
    'nurturing': 'from-blue-400 to-blue-500 text-white',
    'scheduling': 'from-cyan-400 to-cyan-500 text-white',
    'meeting_held': 'from-indigo-400 to-indigo-500 text-white',
    'proposal': 'from-purple-400 to-purple-500 text-white',
    'won': 'from-green-400 to-green-500 text-white',
    'payment_pending': 'from-yellow-400 to-yellow-500 text-white',
    'paid': 'from-emerald-400 to-emerald-500 text-white'
  };
  return colors[stage] || 'from-gray-300 to-gray-400 text-white';
}

// Helper functions for dashboard
function getAppointmentBorderColor(status) {
  const colors = {
    '見込み外': 'border-gray-400',
    '見込み化': 'border-yellow-400',
    '商談': 'border-blue-500',
    '契約': 'border-green-500',
    '入金済み': 'border-emerald-500',
    '協業候補': 'border-purple-400',
    '協業先': 'border-indigo-500'
  };
  return colors[status] || 'border-gray-300';
}

function getPriorityBorderColor(priority) {
  const colors = {
    high: 'border-red-500',
    medium: 'border-yellow-500',
    low: 'border-blue-400'
  };
  return colors[priority] || 'border-gray-300';
}

function getPriorityBadgeClass(priority) {
  const classes = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800'
  };
  return classes[priority] || 'bg-gray-100 text-gray-800';
}

function getPriorityLabel(priority) {
  const labels = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return labels[priority] || priority;
}

// ==================== APPOINTMENT PREPARATION VIEW ====================

// ==================== MATCHING VIEW ====================

async function renderMatchingView() {
  await loadProspects();
  
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        <i class="fas fa-network-wired mr-2 text-green-600"></i>人脈マッチング
      </h2>
      <p class="text-gray-600">AIが自動的に有望な人脈をピックアップします</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${prospects.map(p => {
        const matchCount = p.networking_matches ? p.networking_matches.length : 0;
        return `
          <div class="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 cursor-pointer" onclick="viewProspectMatches(${p.id})">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-bold text-gray-800">${p.company_name}</h3>
              ${matchCount > 0 ? 
                `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold"><i class="fas fa-check mr-1"></i>${matchCount}件</span>` :
                '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">未実行</span>'
              }
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 mb-4">
              <div><i class="fas fa-industry mr-2"></i>${p.industry || '-'}</div>
              <div><i class="fas fa-users mr-2"></i>${p.company_size || '-'}</div>
              <div><i class="fas fa-user-tie mr-2"></i>${p.contact_person || '-'}</div>
            </div>
            
            ${matchCount > 0 ? `
              <button onclick="event.stopPropagation(); viewProspectMatches(${p.id})" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-eye mr-2"></i>マッチングを見る
              </button>
            ` : `
              <button onclick="event.stopPropagation(); findMatches(${p.id})" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-sync mr-2"></i>マッチング実行
              </button>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function viewProspectMatches(prospectId) {
  try {
    const response = await axios.get(`/api/prospects/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      currentProspect = {
        prospect: response.data.prospect,
        research: response.data.ai_research,
        meetings: response.data.meetings || [],
        todos: response.data.todos || [],
        matches: response.data.matches || []
      };
      
      const matches = currentProspect.matches || [];
      const p = currentProspect.prospect;
      
      const contentArea = document.getElementById('content-area');
      
      contentArea.innerHTML = `
        <div class="mb-4 flex justify-between items-center">
          <button onclick="renderMatchingView()" class="text-indigo-600 hover:text-indigo-800">
            <i class="fas fa-arrow-left mr-2"></i>一覧に戻る
          </button>
          <h2 class="text-2xl font-bold text-gray-800">${p.company_name} - 人脈マッチング</h2>
          <button onclick="findMatches(${p.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-sync mr-2"></i>再実行
          </button>
        </div>

        ${matches.length === 0 ? `
          <div class="bg-white rounded-xl shadow-md p-8 text-center">
            <i class="fas fa-user-friends text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-bold text-gray-800 mb-2">人脈マッチングがまだ実行されていません</h3>
            <p class="text-gray-600 mb-4">AIが自動的に有望な人脈をピックアップします</p>
            <button onclick="findMatches(${p.id})" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition">
              <i class="fas fa-sync mr-2"></i>マッチング実行
            </button>
          </div>
        ` : `
          <div class="space-y-4">
            ${matches.map(m => `
              <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-lg font-bold text-gray-800">${m.person_name}</h3>
                    <p class="text-sm text-gray-600">${m.company || ''} ${m.position || ''}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      マッチ度: ${Math.round(m.match_score * 100)}%
                    </span>
                    <span class="px-3 py-1 ${
                      m.status === 'suggested' ? 'bg-blue-100 text-blue-800' :
                      m.status === 'approved' ? 'bg-green-100 text-green-800' :
                      m.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    } rounded-full text-sm font-semibold">
                      ${m.status}
                    </span>
                  </div>
                </div>
                
                <div class="mb-4">
                  <span class="text-sm font-semibold text-gray-600">マッチング理由:</span>
                  <p class="text-sm text-gray-700 mt-1">${m.match_reason}</p>
                </div>
                
                ${m.status === 'suggested' ? `
                  <div class="flex gap-2">
                    <button onclick="approveMatch(${m.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                      <i class="fas fa-check mr-2"></i>承認
                    </button>
                    <button onclick="rejectMatch(${m.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition">
                      <i class="fas fa-times mr-2"></i>却下
                    </button>
                  </div>
                ` : m.status === 'approved' ? `
                  <button onclick="generateIntroductionEmail(${m.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
                    <i class="fas fa-envelope mr-2"></i>紹介メール作成
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      `;
    }
  } catch (error) {
    console.error('Failed to load prospect matches:', error);
    showToast('マッチング情報の読み込みに失敗しました', 'error');
  }
}

// ==================== AI RESEARCH GENERATION ====================

async function generateResearch(prospectId, isDeep = false) {
  try {
    showToast(isDeep ? 'AIディープリサーチを生成中...' : 'AI事前リサーチを生成中...', 'info');
    
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) {
      showToast('見込み客が見つかりません', 'error');
      return;
    }
    
    // Simulate AI research generation (mock data)
    // In production, this would call an AI API (OpenAI, Anthropic, etc.)
    const mockResearch = {
      business_overview: `${prospect.company_name}は${prospect.industry || 'IT'}業界で活動する企業です。主な事業内容は、デジタルトランスフォーメーション支援、システム開発、コンサルティングサービスを提供しています。近年は特にクラウド移行支援とAI導入コンサルティングに注力しています。`,
      
      key_personnel: `・代表取締役：${prospect.contact_person || '山田太郎'}\n・営業部長：田中花子\n・技術責任者：佐藤一郎\n\n${prospect.contact_person || '山田太郎'}氏は業界歴15年のベテランで、特にデジタル化推進に強い関心を持っています。`,
      
      recent_news: `・2024年5月：新規事業として生成AI導入支援サービスを開始\n・2024年3月：大手企業との資本業務提携を発表\n・2024年1月：従業員数が${prospect.company_size || '100名'}を突破\n・2023年12月：業界団体の理事に就任`,
      
      pain_points: `1. 業務効率化の課題\n   - 手作業による業務が多く、生産性が低い\n   - データ管理が分散しており、情報共有が困難\n\n2. 人材不足\n   - IT人材の確保が難しい\n   - 既存社員のスキルアップが必要\n\n3. コスト削減圧力\n   - 競合他社との価格競争が激化\n   - 利益率の改善が求められている`,
      
      opportunities: `1. デジタル化ニーズの高まり\n   ${prospect.company_name}は業務効率化に課題を感じており、当社のソリューションが最適です。\n\n2. 経営層の理解\n   代表の${prospect.contact_person || '山田太郎'}氏は新技術に前向きで、投資判断が早い傾向があります。\n\n3. 予算確保の可能性\n   ${prospect.estimated_value ? `予算規模¥${prospect.estimated_value.toLocaleString()}が見込まれ` : '適切な予算確保が'}、導入の実現性が高いです。`,
      
      suggested_approach: `【第1段階：信頼関係構築】\n・まずは課題のヒアリングに徹する\n・成功事例を2-3社紹介（同業界の実績を強調）\n・無料デモ・トライアルの提案\n\n【第2段階：提案】\n・ROI試算を含む具体的な提案書作成\n・段階的な導入プラン（スモールスタート）\n・導入後のサポート体制の説明\n\n【第3段階：クロージング】\n・決裁者（${prospect.contact_person || '山田太郎'}氏）への直接説明\n・導入スケジュールの確定\n・契約条件の調整`
    };
    
    // Deep research additional data
    const mockDeepResearch = isDeep ? {
      ...mockResearch,
      financial_analysis: `【財務状況】\n・売上高：推定${prospect.estimated_value ? Math.floor(prospect.estimated_value * 10) : '5000'}万円（前年比+15%）\n・営業利益率：約12%（業界平均10%を上回る）\n・自己資本比率：45%（安定的な財務基盤）\n・投資余力：あり（デジタル投資予算を確保済み）\n\n【成長トレンド】\n・過去3年間で売上1.5倍に成長\n・新規事業への投資を積極化\n・人材採用を強化中`,
      
      competitor_analysis: `【主要競合】\n1. A社：業界最大手、価格競争力が強み\n2. B社：技術力に定評、高価格帯\n3. C社：新興企業、柔軟な対応が特徴\n\n【当社の優位性】\n・導入実績：${prospect.industry || 'IT'}業界で30社以上\n・サポート体制：24時間対応可能\n・柔軟なカスタマイズ：個別ニーズに対応\n・コストパフォーマンス：競合比20%削減可能`,
      
      market_trends: `【業界動向】\n・${prospect.industry || 'IT'}業界全体でDX投資が拡大中\n・2024年市場規模は前年比25%増と予測\n・特にAI・クラウド領域の需要が急増\n・政府のデジタル化支援策も追い風\n\n【${prospect.company_name}への影響】\n・競合他社がデジタル化を進める中、遅れをとるリスク\n・早期導入による先行者利益の可能性\n・補助金・税制優遇の活用機会`,
      
      swot_analysis: `【Strength（強み）】\n・代表者のリーダーシップと決断力\n・安定した財務基盤\n・${prospect.industry || 'IT'}業界での実績と信頼\n\n【Weakness（弱み）】\n・IT人材の不足\n・業務プロセスの属人化\n・デジタル化の遅れ\n\n【Opportunity（機会）】\n・市場の成長トレンド\n・政府支援策の活用\n・新規事業展開の余地\n\n【Threat（脅威）】\n・競合のデジタル化進展\n・人材獲得競争の激化\n・技術変化への対応遅れ`,
      
      strategic_proposal: `【戦略的アプローチ】\n\n■ Phase 1：信頼構築（1-2ヶ月）\n・経営層へのプレゼン（ROI重視）\n・現場ヒアリング（3-5名）\n・業界トップ企業の成功事例共有\n\n■ Phase 2：PoC実施（2-3ヶ月）\n・小規模部門でのトライアル\n・効果測定（工数削減率、エラー削減率）\n・社内推進チーム組成支援\n\n■ Phase 3：本格展開（3-6ヶ月）\n・全社展開計画の策定\n・段階的ロールアウト\n・トレーニングプログラム実施\n\n【予想予算】\n・初期費用：${prospect.estimated_value ? prospect.estimated_value.toLocaleString() : '300万'}円\n・月額費用：${prospect.estimated_value ? Math.floor(prospect.estimated_value / 10).toLocaleString() : '30万'}円\n・ROI達成期間：12-18ヶ月\n\n【リスク対策】\n・段階的導入による失敗リスク低減\n・専任サポート担当の配置\n・定期的な効果測定とPDCA`
    } : mockResearch;
    
    // Update prospect with AI research
    const updateData = isDeep ? { deep_research: mockDeepResearch } : { ai_research: mockResearch };
    const response = await axios.put(`/api/prospects/${prospectId}`, updateData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast(isDeep ? 'AIディープリサーチが生成されました' : 'AI事前リサーチが生成されました', 'success');
      
      // Reload prospects data
      await loadProspects();
      
      // Reload current view
      if (window.location.hash.includes('appointment-prep')) {
        switchPrepTab('research');
      } else {
        // If in research detail view, reload it
        viewProspectResearch(prospectId, isDeep);
      }
    } else {
      showToast('リサーチの保存に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Failed to generate research:', error);
    showToast(isDeep ? 'AIディープリサーチの生成に失敗しました' : 'AI事前リサーチの生成に失敗しました', 'error');
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSalesCRM);
} else {
  initSalesCRM();
}
