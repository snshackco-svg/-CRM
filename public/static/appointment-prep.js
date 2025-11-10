// ==================== APPOINTMENT PREPARATION VIEW ====================
// 新しいアポイント準備ビューの実装

async function renderAppointmentPrepView() {
  await loadProspects();
  await loadMeetings();
  
  const contentArea = document.getElementById('content-area');
  
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
  const nextWeekMeetings = upcomingMeetings.filter(m => m.meetingDate > nextWeek && m.meetingDate <= twoWeeksLater);
  
  contentArea.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        <i class="fas fa-clipboard-check mr-2 text-indigo-600"></i>アポイント準備
      </h2>
      <p class="text-gray-600">予定されているアポイントの準備状況を確認できます</p>
    </div>

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
