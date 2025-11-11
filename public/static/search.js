// Global Search Functionality for Sales CRM

let searchResults = null;
let searchDebounceTimer = null;

// Render search bar in the header
function renderSearchBar() {
  return `
    <div class="relative w-full max-w-2xl">
      <div class="relative">
        <input 
          type="text" 
          id="global-search-input" 
          placeholder="企業名、担当者名、業界などで検索..." 
          class="w-full px-4 py-3 pl-12 pr-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          onkeyup="handleSearchInput(event)"
        />
        <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        <button 
          id="clear-search-btn" 
          onclick="clearSearch()" 
          class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- Search Results Dropdown -->
      <div 
        id="search-results-dropdown" 
        class="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50 hidden"
      ></div>
    </div>
  `;
}

// Handle search input with debounce
function handleSearchInput(event) {
  const query = event.target.value.trim();
  const clearBtn = document.getElementById('clear-search-btn');
  
  // Show/hide clear button
  if (query.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
    hideSearchResults();
    return;
  }
  
  // Debounce search
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (query.length >= 2) {
      performSearch(query);
    }
  }, 300);
}

// Perform search via API
async function performSearch(query) {
  try {
    const response = await axios.get('/api/search', {
      params: { q: query },
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      searchResults = response.data.results;
      displaySearchResults(response.data);
    }
  } catch (error) {
    console.error('Search error:', error);
    showToast('検索に失敗しました', 'error');
  }
}

// Display search results
function displaySearchResults(data) {
  const dropdown = document.getElementById('search-results-dropdown');
  const { results, total, query } = data;
  
  if (total === 0) {
    dropdown.innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-search text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">「${query}」の検索結果が見つかりませんでした</p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }
  
  let html = `
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <p class="text-sm text-gray-600">
        <i class="fas fa-info-circle mr-2"></i>
        <strong>${total}件</strong>の結果が見つかりました
      </p>
    </div>
  `;
  
  // Prospects
  if (results.prospects && results.prospects.length > 0) {
    html += `
      <div class="p-4 border-b border-gray-100">
        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">
          <i class="fas fa-building mr-2"></i>見込み客 (${results.prospects.length})
        </h4>
        <div class="space-y-2">
          ${results.prospects.map(p => `
            <div 
              onclick="viewProspect(${p.id}); hideSearchResults();" 
              class="p-3 hover:bg-indigo-50 rounded-lg cursor-pointer transition group"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-bold text-gray-800 group-hover:text-indigo-600 transition">
                    ${p.company_name}
                  </p>
                  <p class="text-sm text-gray-600">
                    ${p.contact_name || '担当者未登録'}${p.contact_position ? ` - ${p.contact_position}` : ''}
                  </p>
                  ${p.industry ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-industry mr-1"></i>${p.industry}</p>` : ''}
                </div>
                <div class="flex flex-col items-end">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(p.status)} mb-1">
                    ${getStatusLabel(p.status)}
                  </span>
                  ${p.estimated_value ? `<span class="text-xs text-gray-600">¥${(p.estimated_value / 10000).toFixed(0)}万円</span>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Meetings
  if (results.meetings && results.meetings.length > 0) {
    html += `
      <div class="p-4 border-b border-gray-100">
        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">
          <i class="fas fa-calendar-check mr-2"></i>商談履歴 (${results.meetings.length})
        </h4>
        <div class="space-y-2">
          ${results.meetings.map(m => `
            <div 
              onclick="viewMeetingDetail(${m.id}); hideSearchResults();" 
              class="p-3 hover:bg-green-50 rounded-lg cursor-pointer transition group"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-bold text-gray-800 group-hover:text-green-600 transition">
                    ${m.company_name}
                  </p>
                  <p class="text-sm text-gray-600">
                    ${dayjs(m.meeting_date).format('YYYY/MM/DD HH:mm')} - ${m.meeting_type}
                  </p>
                  ${m.contact_name ? `<p class="text-xs text-gray-500 mt-1">${m.contact_name}</p>` : ''}
                </div>
                ${m.meeting_outcome ? `
                  <span class="px-3 py-1 rounded-full text-xs font-semibold ${getMeetingOutcomeColor(m.meeting_outcome)}">
                    ${getMeetingOutcomeLabel(m.meeting_outcome)}
                  </span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Contacts
  if (results.contacts && results.contacts.length > 0) {
    html += `
      <div class="p-4 border-b border-gray-100">
        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">
          <i class="fas fa-user mr-2"></i>マスター連絡先 (${results.contacts.length})
        </h4>
        <div class="space-y-2">
          ${results.contacts.map(c => `
            <div 
              onclick="viewContact(${c.id}); hideSearchResults();" 
              class="p-3 hover:bg-purple-50 rounded-lg cursor-pointer transition group"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-bold text-gray-800 group-hover:text-purple-600 transition">
                    ${c.name}
                  </p>
                  <p class="text-sm text-gray-600">
                    ${c.company || '会社名未登録'}${c.position ? ` - ${c.position}` : ''}
                  </p>
                  <div class="flex gap-3 mt-1">
                    ${c.email ? `<span class="text-xs text-gray-500"><i class="fas fa-envelope mr-1"></i>${c.email}</span>` : ''}
                    ${c.phone ? `<span class="text-xs text-gray-500"><i class="fas fa-phone mr-1"></i>${c.phone}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Appointments
  if (results.appointments && results.appointments.length > 0) {
    html += `
      <div class="p-4">
        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">
          <i class="fas fa-calendar-plus mr-2"></i>アポイント履歴 (${results.appointments.length})
        </h4>
        <div class="space-y-2">
          ${results.appointments.map(a => `
            <div 
              onclick="viewAppointment(${a.id}); hideSearchResults();" 
              class="p-3 hover:bg-yellow-50 rounded-lg cursor-pointer transition group"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-bold text-gray-800 group-hover:text-yellow-600 transition">
                    ${a.company_name}
                  </p>
                  <p class="text-sm text-gray-600">
                    ${dayjs(a.appointment_datetime).format('YYYY/MM/DD HH:mm')} - ${a.method}
                  </p>
                  ${a.contact_name ? `<p class="text-xs text-gray-500 mt-1">${a.contact_name}</p>` : ''}
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${getAppointmentStatusColor(a.status)}">
                  ${a.status}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');
}

// Helper functions for status colors
function getStatusColor(status) {
  const colors = {
    'new': 'bg-gray-100 text-gray-800',
    'researching': 'bg-blue-100 text-blue-800',
    'contacted': 'bg-purple-100 text-purple-800',
    'meeting_scheduled': 'bg-yellow-100 text-yellow-800',
    'negotiating': 'bg-orange-100 text-orange-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
  const labels = {
    'new': '新規',
    'researching': 'リサーチ中',
    'contacted': '見込み化',
    'meeting_scheduled': '日程調整中',
    'negotiating': '商談中',
    'won': '契約',
    'lost': '失注'
  };
  return labels[status] || status;
}

function getMeetingOutcomeColor(outcome) {
  const colors = {
    'successful': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'follow_up_needed': 'bg-orange-100 text-orange-800',
    'unsuccessful': 'bg-red-100 text-red-800'
  };
  return colors[outcome] || 'bg-gray-100 text-gray-800';
}

function getMeetingOutcomeLabel(outcome) {
  const labels = {
    'successful': '成功',
    'pending': '保留中',
    'follow_up_needed': '要フォローアップ',
    'unsuccessful': '不成功'
  };
  return labels[outcome] || outcome;
}

function getAppointmentStatusColor(status) {
  if (status === '見込み外') return 'bg-gray-100 text-gray-800';
  if (status === '見込み化') return 'bg-purple-100 text-purple-800';
  if (status === '商談') return 'bg-blue-100 text-blue-800';
  if (status === '契約') return 'bg-green-100 text-green-800';
  if (status === '入金済み') return 'bg-green-100 text-green-800';
  if (status === '協業候補') return 'bg-yellow-100 text-yellow-800';
  if (status === '協業先') return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-800';
}

// Clear search
function clearSearch() {
  document.getElementById('global-search-input').value = '';
  document.getElementById('clear-search-btn').classList.add('hidden');
  hideSearchResults();
}

// Hide search results
function hideSearchResults() {
  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

// Placeholder functions for viewing details (to be implemented in main app)
function viewContact(contactId) {
  console.log('View contact:', contactId);
  showToast('マスター連絡先の詳細表示機能は開発中です', 'info');
}

function viewAppointment(appointmentId) {
  console.log('View appointment:', appointmentId);
  switchView('appointments');
  // TODO: Scroll to and highlight specific appointment
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const searchInput = document.getElementById('global-search-input');
  const dropdown = document.getElementById('search-results-dropdown');
  
  if (searchInput && dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
    hideSearchResults();
  }
});
