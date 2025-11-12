// Hot Leads UI Component for Sales CRM

let hotLeadsData = null;

// Generate suggested action based on hot lead reason and data
function getSuggestedAction(lead) {
  const daysSinceUpdate = Math.floor((new Date() - new Date(lead.updated_at)) / (1000 * 60 * 60 * 24));
  
  if (lead.hot_lead_reason === 'upcoming_meeting') {
    return {
      priority: 'high',
      action: '今日中に商談準備を完了',
      icon: 'calendar-check',
      color: 'blue'
    };
  }
  
  if (lead.hot_lead_reason === 'needs_follow_up') {
    if (daysSinceUpdate >= 14) {
      return {
        priority: 'urgent',
        action: '今すぐ電話でフォロー',
        icon: 'phone',
        color: 'red'
      };
    }
    return {
      priority: 'high',
      action: '今日中にメールでフォロー',
      icon: 'envelope',
      color: 'orange'
    };
  }
  
  if (lead.hot_lead_reason === 'high_value_stalled') {
    return {
      priority: 'urgent',
      action: '決裁者に直接アプローチ',
      icon: 'user-tie',
      color: 'purple'
    };
  }
  
  if (lead.hot_lead_reason === 'stalled_negotiation') {
    return {
      priority: 'high',
      action: '提案内容を見直して再提示',
      icon: 'sync',
      color: 'yellow'
    };
  }
  
  return {
    priority: 'medium',
    action: 'ステータス確認',
    icon: 'clipboard-check',
    color: 'gray'
  };
}

// Fetch hot leads from API
async function fetchHotLeads() {
  try {
    const response = await axios.get('/api/sales-crm/dashboard/hot-leads', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      hotLeadsData = response.data;
      return hotLeadsData;
    }
  } catch (error) {
    console.error('Failed to fetch hot leads:', error);
    return null;
  }
}

// Render hot leads widget for dashboard
function renderHotLeadsWidget() {
  if (!hotLeadsData || !hotLeadsData.hot_leads || hotLeadsData.hot_leads.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">
          <i class="fas fa-fire mr-2 text-orange-500"></i>ホットリード
        </h3>
        <div class="text-center py-8 text-gray-400">
          <i class="fas fa-check-circle text-4xl mb-2"></i>
          <p class="text-sm">現在、優先対応が必要な案件はありません</p>
        </div>
      </div>
    `;
  }
  
  const { hot_leads, summary } = hotLeadsData;
  const topLeads = hot_leads.slice(0, 5); // Show top 5
  
  return `
    <div class="bg-white rounded-xl shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-800">
          <i class="fas fa-fire mr-2 text-orange-500"></i>ホットリード
          <span class="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
            ${hot_leads.length}件
          </span>
        </h3>
        <button onclick="showAllHotLeads()" class="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
          すべて表示 <i class="fas fa-arrow-right ml-1"></i>
        </button>
      </div>
      
      <!-- Summary Badges -->
      <div class="flex flex-wrap gap-2 mb-4">
        ${summary.needs_follow_up > 0 ? `
          <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
            <i class="fas fa-clock mr-1"></i>フォローアップ期限切れ: ${summary.needs_follow_up}件
          </span>
        ` : ''}
        ${summary.upcoming_meetings > 0 ? `
          <span class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
            <i class="fas fa-calendar mr-1"></i>商談予定: ${summary.upcoming_meetings}件
          </span>
        ` : ''}
        ${summary.stalled_negotiations > 0 ? `
          <span class="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
            <i class="fas fa-exclamation-triangle mr-1"></i>停滞中: ${summary.stalled_negotiations}件
          </span>
        ` : ''}
        ${summary.high_value_stalled > 0 ? `
          <span class="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
            <i class="fas fa-gem mr-1"></i>高額案件: ${summary.high_value_stalled}件
          </span>
        ` : ''}
      </div>
      
      <!-- Hot Leads List -->
      <div class="space-y-3">
        ${topLeads.map(lead => `
          <div 
            onclick="viewProspect(${lead.id})" 
            class="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition group"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-bold text-gray-800 group-hover:text-orange-600 transition">
                    ${lead.company_name}
                  </h4>
                  <span class="px-2 py-0.5 rounded text-xs font-semibold ${getHotLeadReasonColor(lead.hot_lead_reason)}">
                    <i class="fas fa-fire mr-1"></i>${lead.priority_score}pt
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-2">
                  ${lead.contact_name || '担当者未登録'}
                </p>
                <p class="text-xs text-gray-500 mb-2">
                  <i class="fas fa-exclamation-circle mr-1 text-orange-500"></i>
                  ${lead.reason_text}
                </p>
                ${(() => {
                  const action = getSuggestedAction(lead);
                  const bgColor = {
                    red: 'bg-red-100 text-red-700',
                    orange: 'bg-orange-100 text-orange-700',
                    yellow: 'bg-yellow-100 text-yellow-700',
                    blue: 'bg-blue-100 text-blue-700',
                    purple: 'bg-purple-100 text-purple-700',
                    gray: 'bg-gray-100 text-gray-700'
                  }[action.color];
                  return `
                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${bgColor}">
                      <i class="fas fa-${action.icon}"></i>
                      <span>${action.action}</span>
                    </div>
                  `;
                })()}
              </div>
              <div class="text-right">
                ${lead.estimated_value ? `
                  <div class="text-sm font-semibold text-gray-800 mb-1">
                    ¥${(lead.estimated_value / 10000).toFixed(0)}万円
                  </div>
                ` : ''}
                <div class="text-xs text-gray-500">
                  ${getStatusLabel(lead.status)}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      ${hot_leads.length > 5 ? `
        <div class="mt-4 text-center">
          <button onclick="showAllHotLeads()" class="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
            他${hot_leads.length - 5}件のホットリードを表示
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Get hot lead reason badge color
function getHotLeadReasonColor(reason) {
  const colors = {
    'needs_follow_up': 'bg-yellow-100 text-yellow-800',
    'upcoming_meeting': 'bg-blue-100 text-blue-800',
    'stalled_negotiation': 'bg-red-100 text-red-800',
    'high_value_stalled': 'bg-purple-100 text-purple-800'
  };
  return colors[reason] || 'bg-orange-100 text-orange-800';
}

// Show all hot leads in modal
function showAllHotLeads() {
  if (!hotLeadsData || !hotLeadsData.hot_leads) return;
  
  const modal = document.createElement('div');
  modal.id = 'hot-leads-modal';
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
          <i class="fas fa-fire mr-2 text-orange-500"></i>ホットリード一覧
          <span class="ml-2 px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full">
            ${hotLeadsData.hot_leads.length}件
          </span>
        </h2>
        <button onclick="document.getElementById('hot-leads-modal').remove()" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="p-6">
        <div class="space-y-3">
          ${hotLeadsData.hot_leads.map(lead => `
            <div 
              onclick="viewProspect(${lead.id}); document.getElementById('hot-leads-modal').remove();" 
              class="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-bold text-gray-800">
                      ${lead.company_name}
                    </h4>
                    <span class="px-2 py-1 rounded text-xs font-semibold ${getHotLeadReasonColor(lead.hot_lead_reason)}">
                      <i class="fas fa-fire mr-1"></i>優先度: ${lead.priority_score}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">
                    ${lead.contact_name || '担当者未登録'}
                  </p>
                  <div class="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      <i class="fas fa-exclamation-circle mr-1 text-orange-500"></i>
                      ${lead.reason_text}
                    </span>
                    <span>
                      <i class="fas fa-tag mr-1"></i>
                      ${getStatusLabel(lead.status)}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  ${lead.estimated_value ? `
                    <div class="text-lg font-bold text-gray-800 mb-1">
                      ¥${(lead.estimated_value / 10000).toFixed(0)}万円
                    </div>
                  ` : '<div class="text-sm text-gray-400 mb-1">金額未設定</div>'}
                  <button 
                    onclick="event.stopPropagation(); viewProspect(${lead.id}); document.getElementById('hot-leads-modal').remove();"
                    class="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition"
                  >
                    詳細を見る
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
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
}

// Helper function for status labels (reuse from search.js if needed)
function getStatusLabel(status) {
  const labels = {
    'new': '新規',
    'researching': 'リサーチ中',
    'contacted': '見込み化',
    'meeting_scheduled': '日程調整中',
    'negotiating': '商談中',
    'won': '契約',
    'lost': '失注',
    'qualified': '見込みあり'
  };
  return labels[status] || status;
}
