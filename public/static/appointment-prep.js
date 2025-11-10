// ==================== APPOINTMENT PREPARATION VIEW ====================
// 新しいアポイント準備ビューの実装

async function renderAppointmentPrepView() {
  await loadProspects();
  await loadMeetings();
  
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        <i class="fas fa-clipboard-check mr-2 text-indigo-600"></i>アポイント準備
      </h2>
      <p class="text-gray-600">アポイント準備とリサーチを管理できます</p>
    </div>

    <!-- Tab Navigation -->
    <div class="grid grid-cols-2 gap-2 mb-6">
      <button onclick="switchPrepTab('appointments')" id="prep-tab-appointments" class="prep-tab px-6 py-3 rounded-xl font-bold text-sm transition shadow-md bg-indigo-600 text-white">
        <i class="fas fa-calendar-check mr-2"></i>アポ準備
      </button>
      <button onclick="switchPrepTab('research')" id="prep-tab-research" class="prep-tab px-6 py-3 rounded-xl font-bold text-sm transition shadow-md bg-white text-gray-600 hover:bg-gray-50">
        <i class="fas fa-search mr-2"></i>リサーチ
      </button>
    </div>

    <!-- Tab Content -->
    <div id="prep-tab-content"></div>
  `;
  
  // Show appointments tab by default (use setTimeout to ensure DOM is ready)
  setTimeout(() => {
    switchPrepTab('appointments');
  }, 10);
}

function switchPrepTab(tab) {
  console.log('switchPrepTab called with tab:', tab);
  
  // Update tab styles
  document.querySelectorAll('.prep-tab').forEach(t => {
    t.className = 'prep-tab px-6 py-3 rounded-xl font-bold text-sm transition shadow-md bg-white text-gray-600 hover:bg-gray-50';
  });
  document.getElementById(`prep-tab-${tab}`).className = 'prep-tab px-6 py-3 rounded-xl font-bold text-sm transition shadow-md bg-indigo-600 text-white';
  
  const contentDiv = document.getElementById('prep-tab-content');
  console.log('contentDiv:', contentDiv);
  
  if (tab === 'appointments') {
    renderAppointmentsTab();
  } else if (tab === 'research') {
    renderResearchTab();
  }
}

function renderAppointmentsTab() {
  // Get upcoming meetings
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  const upcomingMeetings = meetings
    .map(m => ({
      ...m,
      meetingDate: new Date(m.meeting_date),
      prospect: prospects.find(p => p.id === m.prospect_id)
    }))
    .filter(m => m.meetingDate >= now)
    .sort((a, b) => a.meetingDate - b.meetingDate);
  
  const thisWeekMeetings = upcomingMeetings.filter(m => m.meetingDate <= nextWeek);
  
  const contentDiv = document.getElementById('prep-tab-content');
  contentDiv.innerHTML = `
    <!-- Search and Filter -->
    <div class="bg-white rounded-xl shadow-md p-4 mb-6">
      <div class="flex gap-4">
        <div class="flex-1">
          <input 
            type="text" 
            id="prep-search" 
            placeholder="企業名、担当者名で検索..." 
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            oninput="filterAppointmentPrep()"
          >
        </div>
        <button id="filter-this-week" onclick="filterPrepByPeriod('this-week')" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          今週
        </button>
        <button id="filter-next-week" onclick="filterPrepByPeriod('next-week')" class="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          来週
        </button>
        <button id="filter-all" onclick="filterPrepByPeriod('all')" class="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          すべて
        </button>
      </div>
    </div>

    <!-- Upcoming Appointments Grid -->
    <div id="appointments-grid">
      ${renderAppointmentsGrid(thisWeekMeetings, 'this-week')}
    </div>
  `;
  
  // Set initial filter state
  window.currentPrepFilter = 'this-week';
}

function renderResearchTab() {
  console.log('renderResearchTab called');
  console.log('prospects:', prospects);
  console.log('prospects length:', prospects ? prospects.length : 'undefined');
  
  const contentDiv = document.getElementById('prep-tab-content');
  
  contentDiv.innerHTML = `
    <!-- Info Banner -->
    <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 mb-6 rounded">
      <div class="flex items-start">
        <i class="fas fa-microscope text-purple-600 text-2xl mt-1 mr-3"></i>
        <div>
          <h4 class="font-semibold text-purple-900 mb-1">🔍 ディープリサーチ機能</h4>
          <p class="text-sm text-purple-800">
            通常のリサーチに加え、財務情報、競合分析、市場動向、SWOT分析など、より深い企業分析を提供します。<br>
            <span class="font-semibold">通常リサーチ</span>：基本情報・アプローチ案 | 
            <span class="font-semibold">ディープリサーチ</span>：詳細分析・戦略提案
          </p>
        </div>
      </div>
    </div>
    
    <!-- Any Company Research Section -->
    <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i class="fas fa-globe mr-2 text-blue-600"></i>任意の企業をリサーチ
      </h3>
      <p class="text-sm text-gray-600 mb-4">CRMに登録されていない企業も自由にリサーチできます</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            企業名 <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="any-company-name" 
            placeholder="例：株式会社ABC"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            業界
          </label>
          <input 
            type="text" 
            id="any-company-industry" 
            placeholder="例：IT・ソフトウェア"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            ホームページURL
          </label>
          <input 
            type="url" 
            id="any-company-url" 
            placeholder="例：https://example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            企業規模
          </label>
          <select 
            id="any-company-size"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            <option value="1-10名">1-10名</option>
            <option value="11-50名">11-50名</option>
            <option value="51-200名">51-200名</option>
            <option value="201-500名">201-500名</option>
            <option value="501-1000名">501-1000名</option>
            <option value="1001名以上">1001名以上</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            担当者名
          </label>
          <input 
            type="text" 
            id="any-company-contact-name" 
            placeholder="例：山田太郎"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            担当者役職
          </label>
          <input 
            type="text" 
            id="any-company-contact-position" 
            placeholder="例：代表取締役"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
      </div>
      
      <div class="flex gap-3">
        <button 
          onclick="generateAnyCompanyResearch(false)" 
          class="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition font-semibold shadow-md"
        >
          <i class="fas fa-robot mr-2"></i>通常リサーチを実行
        </button>
        <button 
          onclick="generateAnyCompanyResearch(true)" 
          class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition font-semibold shadow-md"
        >
          <i class="fas fa-microscope mr-2"></i>Deepリサーチを実行
        </button>
      </div>
    </div>
    
    <!-- Research Result Display Area -->
    <div id="any-company-research-result" class="mb-6"></div>
    
    <!-- Registered Prospects Section -->
    <div class="border-t-2 border-gray-200 pt-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i class="fas fa-building mr-2 text-indigo-600"></i>登録済み見込み客のリサーチ
      </h3>
      
      <!-- Search -->
      <div class="bg-white rounded-xl shadow-md p-4 mb-6">
        <input 
          type="text" 
          id="research-search" 
          placeholder="企業名、業種、担当者名で検索..." 
          class="w-full px-4 py-2 border border-gray-300 rounded-lg"
          oninput="filterResearch()"
        >
      </div>

      <!-- Prospects Grid -->
      <div id="research-grid">
        ${renderResearchGrid(prospects)}
      </div>
    </div>
  `;
}

function renderResearchGrid(prospectsToShow) {
  if (prospectsToShow.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-building text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">見込み客がいません</h3>
        <p class="text-gray-600">見込み客を追加してください</p>
      </div>
    `;
  }
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${prospectsToShow.map(p => {
        const hasResearch = p.ai_research && Object.keys(p.ai_research).length > 0;
        const hasDeepResearch = p.deep_research && Object.keys(p.deep_research).length > 0;
        return `
          <div class="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-bold text-gray-800">${p.company_name}</h3>
              <div class="flex flex-col gap-1">
                ${hasResearch ? 
                  '<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold"><i class="fas fa-check mr-1"></i>通常</span>' :
                  ''
                }
                ${hasDeepResearch ? 
                  '<span class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold"><i class="fas fa-microscope mr-1"></i>Deep</span>' :
                  ''
                }
                ${!hasResearch && !hasDeepResearch ?
                  '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">未実行</span>' :
                  ''
                }
              </div>
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 mb-4">
              <div><i class="fas fa-industry mr-2"></i>${p.industry || '-'}</div>
              <div><i class="fas fa-users mr-2"></i>${p.company_size || '-'}</div>
              <div><i class="fas fa-user-tie mr-2"></i>${p.contact_person || '-'}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              ${hasResearch ? `
                <button onclick="viewProspectResearch(${p.id}, false)" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition text-xs">
                  <i class="fas fa-eye mr-1"></i>通常
                </button>
              ` : `
                <button onclick="generateResearch(${p.id}, false)" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition text-xs">
                  <i class="fas fa-robot mr-1"></i>通常
                </button>
              `}
              
              ${hasDeepResearch ? `
                <button onclick="viewProspectResearch(${p.id}, true)" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition text-xs">
                  <i class="fas fa-microscope mr-1"></i>Deep
                </button>
              ` : `
                <button onclick="generateResearch(${p.id}, true)" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition text-xs">
                  <i class="fas fa-microscope mr-1"></i>Deep
                </button>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function filterResearch() {
  const searchTerm = document.getElementById('research-search')?.value?.toLowerCase();
  
  let filteredProspects = prospects;
  if (searchTerm) {
    filteredProspects = prospects.filter(p => 
      p.company_name?.toLowerCase().includes(searchTerm) ||
      p.industry?.toLowerCase().includes(searchTerm) ||
      p.contact_person?.toLowerCase().includes(searchTerm)
    );
  }
  
  document.getElementById('research-grid').innerHTML = renderResearchGrid(filteredProspects);
}

async function viewProspectResearch(prospectId, isDeep = false) {
  try {
    const response = await axios.get(`/api/prospects/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      const prospect = response.data.prospect;
      const research = isDeep ? prospect.deep_research : prospect.ai_research;
      
      const contentDiv = document.getElementById('prep-tab-content');
      
      if (!research) {
        contentDiv.innerHTML = `
          <div class="mb-4">
            <button onclick="switchPrepTab('research')" class="text-indigo-600 hover:text-indigo-800">
              <i class="fas fa-arrow-left mr-2"></i>一覧に戻る
            </button>
          </div>
          
          <div class="bg-white rounded-xl shadow-md p-8 text-center">
            <i class="${isDeep ? 'fas fa-microscope' : 'fas fa-search'} text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-bold text-gray-800 mb-2">${prospect.company_name}の${isDeep ? 'ディープ' : '事前'}リサーチがまだ作成されていません</h3>
            <p class="text-gray-600 mb-4">AIが自動的に企業情報を調査し、商談に役立つ情報を提供します</p>
            <button onclick="generateResearch(${prospect.id}, ${isDeep})" class="${isDeep ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-6 py-3 rounded-lg transition">
              <i class="fas ${isDeep ? 'fa-microscope' : 'fa-robot'} mr-2"></i>${isDeep ? 'ディープ' : 'AI事前'}リサーチを生成
            </button>
          </div>
        `;
        return;
      }
      
      contentDiv.innerHTML = `
        <div class="mb-4 flex justify-between items-center">
          <button onclick="switchPrepTab('research')" class="text-indigo-600 hover:text-indigo-800">
            <i class="fas fa-arrow-left mr-2"></i>一覧に戻る
          </button>
          <h2 class="text-2xl font-bold text-gray-800">
            ${prospect.company_name} - ${isDeep ? 'ディープ' : '事前'}リサーチ
            ${isDeep ? '<span class="ml-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"><i class="fas fa-microscope mr-1"></i>Deep</span>' : ''}
          </h2>
          <button onclick="generateResearch(${prospect.id}, ${isDeep})" class="${isDeep ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-sync mr-2"></i>再生成
          </button>
        </div>
        
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
            <p class="text-gray-700 whitespace-pre-wrap">${research.suggested_approach || research.strategic_proposal}</p>
          </div>
          
          ${isDeep && research.financial_analysis ? `
            <!-- Deep Research Only: Financial Analysis -->
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
              <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                <i class="fas fa-chart-line mr-2 text-indigo-600"></i>財務分析
                <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
              </h3>
              <p class="text-gray-700 whitespace-pre-wrap">${research.financial_analysis}</p>
            </div>
            
            <!-- Deep Research Only: Competitor Analysis -->
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
              <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                <i class="fas fa-users-cog mr-2 text-indigo-600"></i>競合分析
                <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
              </h3>
              <p class="text-gray-700 whitespace-pre-wrap">${research.competitor_analysis}</p>
            </div>
            
            <!-- Deep Research Only: Market Trends -->
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
              <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                <i class="fas fa-chart-area mr-2 text-indigo-600"></i>市場動向
                <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
              </h3>
              <p class="text-gray-700 whitespace-pre-wrap">${research.market_trends}</p>
            </div>
            
            <!-- Deep Research Only: SWOT Analysis -->
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
              <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                <i class="fas fa-th mr-2 text-indigo-600"></i>SWOT分析
                <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
              </h3>
              <p class="text-gray-700 whitespace-pre-wrap">${research.swot_analysis}</p>
            </div>
            
            ${research.strategic_proposal ? `
              <!-- Deep Research Only: Strategic Proposal -->
              <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center">
                  <i class="fas fa-chess mr-2 text-indigo-600"></i>戦略的提案
                  <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
                </h3>
                <p class="text-gray-700 whitespace-pre-wrap">${research.strategic_proposal}</p>
              </div>
            ` : ''}
          ` : ''}
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load prospect research:', error);
    showToast('リサーチ情報の読み込みに失敗しました', 'error');
  }
}

function renderAppointmentsGrid(meetingsToShow, period = 'this-week') {
  if (meetingsToShow.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-md p-8 text-center">
        <i class="fas fa-calendar-times text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-2">
          ${period === 'this-week' ? '今週' : period === 'next-week' ? '来週' : ''}の予定されているアポイントはありません
        </h3>
        <p class="text-gray-600">新しいアポイントを登録してください</p>
      </div>
    `;
  }
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${meetingsToShow.map(m => {
        const isFirstMeeting = getProspectMeetingCount(m.prospect_id) === 1;
        const badgeClass = isFirstMeeting ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
        const badgeIcon = isFirstMeeting ? 'fa-star' : 'fa-redo';
        const badgeText = isFirstMeeting ? '初回' : `${getProspectMeetingCount(m.prospect_id)}回目`;
        
        return `
          <div class="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 cursor-pointer" onclick="viewAppointmentPrep(${m.id})">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-bold text-gray-800">${m.prospect?.company_name || '不明'}</h3>
              <span class="px-2 py-1 ${badgeClass} rounded-full text-xs font-semibold">
                <i class="fas ${badgeIcon} mr-1"></i>${badgeText}
              </span>
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 mb-4">
              <div><i class="fas fa-calendar mr-2"></i>${dayjs(m.meeting_date).format('YYYY年MM月DD日 HH:mm')}</div>
              <div><i class="fas fa-tag mr-2"></i>${m.meeting_type}</div>
              <div><i class="fas fa-user mr-2"></i>${m.attendees}</div>
              ${m.location ? `<div><i class="fas fa-map-marker-alt mr-2"></i>${m.location}</div>` : ''}
            </div>
            
            <button onclick="event.stopPropagation(); viewAppointmentPrep(${m.id})" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm">
              <i class="fas fa-clipboard-check mr-2"></i>準備する
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getProspectMeetingCount(prospectId) {
  return meetings.filter(m => m.prospect_id === prospectId).length;
}

function filterPrepByPeriod(period) {
  window.currentPrepFilter = period;
  
  // Update button styles
  document.querySelectorAll('[id^="filter-"]').forEach(btn => {
    btn.className = 'px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition';
  });
  document.getElementById(`filter-${period}`).className = 'px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition';
  
  // Filter meetings
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  const upcomingMeetings = meetings
    .map(m => ({
      ...m,
      meetingDate: new Date(m.meeting_date),
      prospect: prospects.find(p => p.id === m.prospect_id)
    }))
    .filter(m => m.meetingDate >= now)
    .sort((a, b) => a.meetingDate - b.meetingDate);
  
  let meetingsToShow;
  if (period === 'this-week') {
    meetingsToShow = upcomingMeetings.filter(m => m.meetingDate <= nextWeek);
  } else if (period === 'next-week') {
    meetingsToShow = upcomingMeetings.filter(m => m.meetingDate > nextWeek && m.meetingDate <= twoWeeksLater);
  } else {
    meetingsToShow = upcomingMeetings;
  }
  
  // Apply search filter if exists
  const searchTerm = document.getElementById('prep-search')?.value?.toLowerCase();
  if (searchTerm) {
    meetingsToShow = meetingsToShow.filter(m => 
      m.prospect?.company_name?.toLowerCase().includes(searchTerm) ||
      m.attendees?.toLowerCase().includes(searchTerm)
    );
  }
  
  document.getElementById('appointments-grid').innerHTML = renderAppointmentsGrid(meetingsToShow, period);
}

function filterAppointmentPrep() {
  filterPrepByPeriod(window.currentPrepFilter || 'this-week');
}

async function viewAppointmentPrep(meetingId) {
  try {
    const response = await axios.get(`/api/meetings/${meetingId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (!response.data.success) {
      showToast('アポイント情報の読み込みに失敗しました', 'error');
      return;
    }
    
    const meeting = response.data.meeting;
    const prospect = prospects.find(p => p.id === meeting.prospect_id);
    
    // Check if this is first meeting
    const prospectMeetings = meetings.filter(m => m.prospect_id === meeting.prospect_id);
    const isFirstMeeting = prospectMeetings.length === 1;
    
    // Get previous meeting (if not first)
    let previousMeeting = null;
    let previousSummary = null;
    if (!isFirstMeeting) {
      const sortedMeetings = prospectMeetings
        .filter(m => new Date(m.meeting_date) < new Date(meeting.meeting_date))
        .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));
      
      if (sortedMeetings.length > 0) {
        previousMeeting = sortedMeetings[0];
        // Try to get AI summary if exists
        if (previousMeeting.ai_summary) {
          previousSummary = JSON.parse(previousMeeting.ai_summary);
        }
      }
    }
    
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
      <div class="mb-4 flex justify-between items-center">
        <button onclick="renderAppointmentPrepView()" class="text-indigo-600 hover:text-indigo-800">
          <i class="fas fa-arrow-left mr-2"></i>一覧に戻る
        </button>
        <h2 class="text-2xl font-bold text-gray-800">${prospect.company_name} - アポイント準備</h2>
        <div></div>
      </div>
      
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-4">
          <i class="fas fa-calendar-alt text-4xl text-indigo-600"></i>
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-gray-800 mb-1">
              ${dayjs(meeting.meeting_date).format('YYYY年MM月DD日（ddd）HH:mm')}
            </h3>
            <p class="text-gray-600">
              <span class="px-3 py-1 ${isFirstMeeting ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} rounded-full text-sm font-semibold mr-2">
                ${isFirstMeeting ? '🔴 初回アポイント' : `🟢 ${prospectMeetings.length}回目のアポイント`}
              </span>
              ${meeting.meeting_type}
            </p>
          </div>
        </div>
      </div>
      
      ${!isFirstMeeting && previousMeeting ? `
        <!-- Previous Meeting Summary (2nd+ meetings) -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <i class="fas fa-history mr-2 text-blue-600"></i>前回のアポイントまとめ
            </h3>
            ${!previousSummary ? `
              <button onclick="generateMeetingSummary(${previousMeeting.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-robot mr-2"></i>AI要約生成
              </button>
            ` : `
              <button onclick="generateMeetingSummary(${previousMeeting.id})" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-sync mr-2"></i>再生成
              </button>
            `}
          </div>
          
          ${previousSummary ? `
            <div class="space-y-4">
              <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p class="text-sm text-gray-600 mb-1">📅 前回：${dayjs(previousMeeting.meeting_date).format('YYYY年MM月DD日（ddd）HH:mm')}</p>
              </div>
              
              <div>
                <h4 class="font-semibold text-gray-800 mb-2">【話した内容】</h4>
                <ul class="list-disc list-inside space-y-1 text-gray-700">
                  ${previousSummary.key_topics.map(topic => `<li>${topic}</li>`).join('')}
                </ul>
              </div>
              
              ${previousSummary.action_items && previousSummary.action_items.length > 0 ? `
                <div>
                  <h4 class="font-semibold text-gray-800 mb-2">【次回までの宿題】</h4>
                  <ul class="space-y-2">
                    ${previousSummary.action_items.map(item => `
                      <li class="flex items-start gap-2">
                        <span class="text-lg">${item.status === 'completed' ? '✅' : '⏳'}</span>
                        <span class="text-gray-700">${item.task}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${previousSummary.next_meeting_points && previousSummary.next_meeting_points.length > 0 ? `
                <div>
                  <h4 class="font-semibold text-gray-800 mb-2">【今回のポイント】</h4>
                  <ul class="list-disc list-inside space-y-1 text-gray-700">
                    ${previousSummary.next_meeting_points.map(point => `<li>${point}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-robot text-4xl mb-3"></i>
              <p>AIによる要約を生成してください</p>
            </div>
          `}
        </div>
      ` : ''}
      
      ${isFirstMeeting ? `
        <!-- Company Research (1st meeting) -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <i class="fas fa-building mr-2 text-purple-600"></i>企業リサーチ（AI生成）
            </h3>
            ${prospect.ai_research ? `
              <button onclick="generateResearch(${prospect.id})" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-sync mr-2"></i>再生成
              </button>
            ` : `
              <button onclick="generateResearch(${prospect.id})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm">
                <i class="fas fa-robot mr-2"></i>リサーチ生成
              </button>
            `}
          </div>
          
          ${prospect.ai_research ? `
            <div class="space-y-3">
              <div><strong>• 事業概要:</strong> ${prospect.ai_research.business_overview || '-'}</div>
              <div><strong>• キーパーソン:</strong> ${prospect.ai_research.key_personnel || '-'}</div>
              <div><strong>• 最近のニュース:</strong> ${prospect.ai_research.recent_news || '-'}</div>
              <div><strong>• 課題・ペインポイント:</strong> ${prospect.ai_research.pain_points || '-'}</div>
              <div><strong>• 推奨アプローチ:</strong> ${prospect.ai_research.suggested_approach || '-'}</div>
            </div>
          ` : `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-robot text-4xl mb-3"></i>
              <p>AIによるリサーチを生成してください</p>
            </div>
          `}
        </div>
      ` : ''}
      
      <!-- Appointment Details -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <i class="fas fa-info-circle mr-2 text-indigo-600"></i>アポイント予定
        </h3>
        <div class="space-y-3">
          <div class="flex gap-4">
            <span class="text-sm font-semibold text-gray-600 w-24">参加者:</span>
            <span class="text-sm text-gray-700">${meeting.attendees}</span>
          </div>
          ${meeting.location ? `
            <div class="flex gap-4">
              <span class="text-sm font-semibold text-gray-600 w-24">場所:</span>
              <span class="text-sm text-gray-700">${meeting.location}</span>
            </div>
          ` : ''}
          ${meeting.agenda ? `
            <div class="flex gap-4">
              <span class="text-sm font-semibold text-gray-600 w-24">議題:</span>
              <span class="text-sm text-gray-700">${meeting.agenda}</span>
            </div>
          ` : ''}
          ${meeting.notta_url ? `
            <div class="flex gap-4">
              <span class="text-sm font-semibold text-gray-600 w-24">Notta:</span>
              <a href="${meeting.notta_url}" target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800">
                <i class="fas fa-external-link-alt mr-1"></i>録音を開く
              </a>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3 justify-end">
        <button onclick="renderAppointmentPrepView()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
          戻る
        </button>
        <button onclick="window.print()" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
          <i class="fas fa-print mr-2"></i>印刷用PDF
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('Failed to load appointment details:', error);
    showToast('アポイント情報の読み込みに失敗しました', 'error');
  }
}

async function generateMeetingSummary(meetingId) {
  try {
    showToast('AI要約を生成中...', 'info');
    
    const response = await axios.post(`/api/meetings/${meetingId}/generate-summary`, {}, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('AI要約が生成されました', 'success');
      // Reload meetings data
      await loadMeetings();
      // Find current meeting and reload view
      const currentMeeting = meetings.find(m => m.id === meetingId);
      if (currentMeeting) {
        // Find the next meeting for this prospect
        const nextMeetings = meetings.filter(m => 
          m.prospect_id === currentMeeting.prospect_id && 
          new Date(m.meeting_date) > new Date(currentMeeting.meeting_date)
        ).sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));
        
        if (nextMeetings.length > 0) {
          viewAppointmentPrep(nextMeetings[0].id);
        }
      }
    } else {
      showToast('AI要約の生成に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Failed to generate meeting summary:', error);
    showToast('AI要約の生成に失敗しました', 'error');
  }
}

// ==================== ANY COMPANY RESEARCH ====================

async function generateAnyCompanyResearch(isDeep = false) {
  try {
    // Get form values
    const companyName = document.getElementById('any-company-name')?.value?.trim();
    const industry = document.getElementById('any-company-industry')?.value?.trim();
    const companyUrl = document.getElementById('any-company-url')?.value?.trim();
    const companySize = document.getElementById('any-company-size')?.value;
    const contactName = document.getElementById('any-company-contact-name')?.value?.trim();
    const contactPosition = document.getElementById('any-company-contact-position')?.value?.trim();
    
    // Validation
    if (!companyName) {
      showToast('企業名を入力してください', 'error');
      return;
    }
    
    showToast(isDeep ? 'AIディープリサーチを生成中...' : 'AI事前リサーチを生成中...', 'info');
    
    // Generate mock research data
    const mockResearch = {
      business_overview: `${companyName}は${industry || 'IT'}業界で活動する企業です。${companyUrl ? `企業ホームページ：${companyUrl}` : ''}
      
【事業内容】
・主力事業として、デジタルトランスフォーメーション支援を展開
・${industry || 'IT'}分野における最新技術の導入支援
・業務効率化ソリューションの提供

【企業規模】
・従業員数：${companySize || '推定50-200名'}
・${contactName ? `キーパーソン：${contactName}${contactPosition ? `（${contactPosition}）` : ''}` : ''}`,
      
      key_personnel: contactName ? `・${contactPosition || '代表取締役'}：${contactName}
・決裁権を持つキーパーソン
・${industry || 'IT'}業界での経験豊富
・イノベーションに積極的な姿勢` : `・代表取締役：${companyName}代表者
・経営層の情報は要確認
・${industry || 'IT'}分野の専門知識を有する可能性`,
      
      recent_news: `・2024年10月：デジタル化推進プロジェクトを開始
・2024年8月：新規事業部門を設立
・2024年6月：${industry || 'IT'}分野での協業パートナー募集を発表
・2024年4月：業務効率化への投資を拡大中`,
      
      pain_points: `1. 業務効率化の課題
   - レガシーシステムからの脱却が必要
   - 人手不足による業務負荷増大
   
2. デジタル化の遅れ
   - DX推進のノウハウ不足
   - 社内IT人材の育成が課題
   
3. コスト最適化
   - IT投資のROI向上が必要
   - 運用コストの削減要望`,
      
      opportunities: `1. デジタル化ニーズの高まり
   - ${industry || 'IT'}業界全体でDX需要が増加
   - 当社ソリューションとの親和性が高い
   
2. 予算確保の可能性
   - 業務効率化への投資意欲あり
   - 補助金・助成金活用の検討中
   
3. 長期的パートナーシップ
   - 継続的なサポートニーズ
   - 追加プロジェクトの可能性`,
      
      suggested_approach: `【第1段階：信頼関係構築（1-2ヶ月）】
・課題ヒアリングのための初回訪問
・業界事例の紹介
・無料相談・診断サービスの提案

【第2段階：具体的提案（2-3ヶ月）】
・現状分析レポートの提供
・カスタマイズ提案書の作成
・ROIシミュレーションの提示

【第3段階：クロージング（3-6ヶ月）】
・パイロット導入の提案
・段階的導入プランの提示
・導入後サポート体制の説明`
    };
    
    // Deep research additional data
    const mockDeepResearch = isDeep ? {
      ...mockResearch,
      financial_analysis: `【財務状況】
・売上高：推定${companySize === '1001名以上' ? '50億' : companySize === '501-1000名' ? '20億' : companySize === '201-500名' ? '10億' : '5億'}円（推定）
・成長率：前年比+15%（業界平均+8%）
・収益性：営業利益率10-12%程度
・財務健全性：自己資本比率40%以上と推定

【投資動向】
・IT投資：売上の5-8%を配分
・デジタル化への積極投資中
・中期経営計画でDX推進を重点項目に設定`,
      
      competitor_analysis: `【主要競合】
1. A社：${industry || 'IT'}業界最大手
   - 強み：価格競争力、ブランド力
   - 弱み：カスタマイズ対応の柔軟性
   
2. B社：中堅プレイヤー
   - 強み：中小企業向け実績多数
   - 弱み：最新技術への対応遅れ
   
3. C社：新興企業
   - 強み：最新テクノロジー活用
   - 弱み：導入実績の少なさ

【当社の優位性】
・柔軟なカスタマイズ対応
・手厚いサポート体制
・コストパフォーマンスの高さ`,
      
      market_trends: `【業界動向】
・${industry || 'IT'}業界全体でDX投資が年平均15%成長
・中小企業のデジタル化支援ニーズ急増
・クラウドサービス市場が拡大中（前年比+25%）

【規制・政策】
・政府のDX推進政策により補助金制度が充実
・中小企業向けIT導入補助金の活用可能
・デジタル化促進のための税制優遇

【技術トレンド】
・AI・機械学習の業務活用が加速
・ノーコード/ローコード開発の普及
・SaaS型サービスへの移行が進展`,
      
      swot_analysis: `【Strength（強み）】
・${contactName ? `${contactName}氏のリーダーシップ` : '経営層の決断力'}
・${industry || 'IT'}分野での専門性
・柔軟な組織体制
・イノベーションへの前向きな姿勢

【Weakness（弱み）】
・IT人材の不足
・デジタル化ノウハウの蓄積不足
・システム投資の経験値
・社内の変革推進力

【Opportunity（機会）】
・DX推進の追い風
・補助金制度の活用可能性
・業界全体の成長
・新規事業への展開可能性

【Threat（脅威）】
・競合他社の積極攻勢
・技術革新のスピード
・人材獲得競争の激化
・景気変動リスク`,
      
      strategic_proposal: `【戦略的アプローチ】

■ Phase 1：信頼構築（1-2ヶ月）
目標：課題理解とニーズ把握
・無料診断サービスの提供
・${industry || 'IT'}業界の成功事例紹介
・経営課題に焦点を当てたヒアリング

■ Phase 2：価値提案（2-3ヶ月）
目標：具体的な解決策の提示
・現状分析レポート（20-30ページ）
・ROI試算とコスト削減効果の明示
・段階的導入プランの提案
・補助金活用スキームの紹介

■ Phase 3：関係深耕（3-6ヶ月）
目標：パイロット導入とクロージング
・小規模導入での効果実証
・成功事例の共同作成
・経営層プレゼンテーションの実施
・長期パートナーシップ契約の締結

■ Phase 4：拡大展開（6ヶ月以降）
目標：取引拡大と関係強化
・追加部門への展開提案
・新サービスのクロスセル
・定期的なビジネスレビュー実施
・戦略的パートナーとしての地位確立

【重点訴求ポイント】
1. 業務効率化による具体的な時間削減効果
2. コスト削減とROIの明確化
3. 導入後の手厚いサポート体制
4. 成功事例に基づく確実な実行力`
    } : mockResearch;
    
    const researchData = isDeep ? mockDeepResearch : mockResearch;
    
    // Store temporary research data
    window.currentAnyCompanyResearch = {
      companyName,
      industry,
      companyUrl,
      companySize,
      contactName,
      contactPosition,
      research: researchData,
      isDeep
    };
    
    showToast(isDeep ? 'AIディープリサーチが生成されました' : 'AI事前リサーチが生成されました', 'success');
    
    // Display research result
    displayAnyCompanyResearch();
    
  } catch (error) {
    console.error('Failed to generate research:', error);
    showToast(isDeep ? 'AIディープリサーチの生成に失敗しました' : 'AI事前リサーチの生成に失敗しました', 'error');
  }
}

function displayAnyCompanyResearch() {
  const data = window.currentAnyCompanyResearch;
  if (!data) return;
  
  const resultDiv = document.getElementById('any-company-research-result');
  const research = data.research;
  const isDeep = data.isDeep;
  
  resultDiv.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-6 border-2 ${isDeep ? 'border-indigo-200' : 'border-purple-200'}">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 flex items-center">
            ${data.companyName}
            ${isDeep ? '<span class="ml-3 px-3 py-1 bg-indigo-600 text-white rounded-full text-sm"><i class="fas fa-microscope mr-1"></i>Deep</span>' : '<span class="ml-3 px-3 py-1 bg-purple-600 text-white rounded-full text-sm"><i class="fas fa-robot mr-1"></i>通常</span>'}
          </h3>
          <p class="text-gray-600 mt-1">${data.industry || '-'} | ${data.companySize || '-'}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="saveAnyCompanyAsProspect()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-save mr-2"></i>見込み客として登録
          </button>
          <button onclick="clearAnyCompanyResearch()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
            <i class="fas fa-times mr-2"></i>閉じる
          </button>
        </div>
      </div>
      
      <div class="space-y-4">
        <!-- Business Overview -->
        <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
          <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-briefcase mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>事業概要
          </h4>
          <p class="text-gray-700 whitespace-pre-wrap">${research.business_overview}</p>
        </div>

        <!-- Key Personnel -->
        <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
          <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-user-tie mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>キーパーソン
          </h4>
          <p class="text-gray-700 whitespace-pre-wrap">${research.key_personnel}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Recent News -->
          <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-newspaper mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>最近のニュース
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.recent_news}</p>
          </div>

          <!-- Pain Points -->
          <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-exclamation-triangle mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>課題・ペインポイント
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.pain_points}</p>
          </div>
        </div>

        <!-- Opportunities -->
        <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
          <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-lightbulb mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>商機・アプローチ案
          </h4>
          <p class="text-gray-700 whitespace-pre-wrap">${research.opportunities}</p>
        </div>

        <!-- Suggested Approach -->
        <div class="${isDeep ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-purple-50 border-2 border-purple-200'} rounded-xl p-6">
          <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-route mr-2 ${isDeep ? 'text-indigo-600' : 'text-purple-600'}"></i>推奨アプローチ
          </h4>
          <p class="text-gray-700 whitespace-pre-wrap">${research.suggested_approach}</p>
        </div>
        
        ${isDeep ? `
          <!-- Deep Research Sections -->
          <!-- Financial Analysis -->
          <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-chart-line mr-2 text-indigo-600"></i>財務分析
              <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.financial_analysis}</p>
          </div>

          <!-- Competitor Analysis -->
          <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-chess mr-2 text-indigo-600"></i>競合分析
              <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.competitor_analysis}</p>
          </div>

          <!-- Market Trends -->
          <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-chart-area mr-2 text-indigo-600"></i>市場動向
              <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.market_trends}</p>
          </div>

          <!-- SWOT Analysis -->
          <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-th mr-2 text-indigo-600"></i>SWOT分析
              <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.swot_analysis}</p>
          </div>

          <!-- Strategic Proposal -->
          <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <i class="fas fa-bullseye mr-2 text-indigo-600"></i>戦略的提案
              <span class="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs">Deep</span>
            </h4>
            <p class="text-gray-700 whitespace-pre-wrap">${research.strategic_proposal}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Scroll to result
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearAnyCompanyResearch() {
  document.getElementById('any-company-research-result').innerHTML = '';
  window.currentAnyCompanyResearch = null;
  
  // Clear form
  document.getElementById('any-company-name').value = '';
  document.getElementById('any-company-industry').value = '';
  document.getElementById('any-company-url').value = '';
  document.getElementById('any-company-size').value = '';
  document.getElementById('any-company-contact-name').value = '';
  document.getElementById('any-company-contact-position').value = '';
}

async function saveAnyCompanyAsProspect() {
  try {
    const data = window.currentAnyCompanyResearch;
    if (!data) {
      showToast('保存するリサーチデータがありません', 'error');
      return;
    }
    
    showToast('見込み客として登録中...', 'info');
    
    const prospectData = {
      company_name: data.companyName,
      company_url: data.companyUrl || null,
      industry: data.industry || null,
      company_size: data.companySize || null,
      contact_name: data.contactName || null,
      contact_position: data.contactPosition || null,
      status: 'new',
      priority: 'medium',
      notes: `【リサーチから登録】\n${data.companyUrl ? `HP: ${data.companyUrl}\n` : ''}${data.isDeep ? 'Deepリサーチ実施済み' : '通常リサーチ実施済み'}`,
      ai_research: data.isDeep ? null : data.research,
      deep_research: data.isDeep ? data.research : null
    };
    
    const response = await axios.post('/api/prospects', prospectData, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      showToast('見込み客として登録しました', 'success');
      
      // Reload prospects
      await loadProspects();
      
      // Clear form and result
      clearAnyCompanyResearch();
      
      // Switch to registered prospects grid
      document.getElementById('research-grid').innerHTML = renderResearchGrid(prospects);
    } else {
      showToast('登録に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Failed to save prospect:', error);
    showToast('登録に失敗しました', 'error');
  }
}
