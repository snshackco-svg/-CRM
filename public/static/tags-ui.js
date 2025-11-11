// Tags UI Component for Sales CRM

let prospectTags = [];
let allTags = [];

// Fetch tags for a prospect
async function fetchProspectTags(prospectId) {
  try {
    const response = await axios.get(`/api/tags/prospect/${prospectId}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      prospectTags = response.data.tags;
      return prospectTags;
    }
  } catch (error) {
    console.error('Failed to fetch prospect tags:', error);
    return [];
  }
}

// Fetch all available tags
async function fetchAllTags() {
  try {
    const response = await axios.get('/api/tags/all', {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      allTags = response.data.tags;
      return allTags;
    }
  } catch (error) {
    console.error('Failed to fetch all tags:', error);
    return [];
  }
}

// Add tag to prospect
async function addTagToProspect(prospectId, tag) {
  try {
    const response = await axios.post(`/api/tags/prospect/${prospectId}`, 
      { tag }, 
      { headers: { 'X-Session-Token': sessionToken } }
    );
    
    if (response.data.success) {
      await fetchProspectTags(prospectId);
      renderTagsSection(prospectId);
      showToast('タグを追加しました', 'success');
    }
  } catch (error) {
    console.error('Failed to add tag:', error);
    showToast('タグの追加に失敗しました', 'error');
  }
}

// Remove tag from prospect
async function removeTagFromProspect(prospectId, tag) {
  try {
    const response = await axios.delete(`/api/tags/prospect/${prospectId}/${encodeURIComponent(tag)}`, {
      headers: { 'X-Session-Token': sessionToken }
    });
    
    if (response.data.success) {
      await fetchProspectTags(prospectId);
      renderTagsSection(prospectId);
      showToast('タグを削除しました', 'success');
    }
  } catch (error) {
    console.error('Failed to remove tag:', error);
    showToast('タグの削除に失敗しました', 'error');
  }
}

// Render tags section for prospect detail view
function renderTagsSection(prospectId) {
  const container = document.getElementById('prospect-tags-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-800">
          <i class="fas fa-tags mr-2 text-purple-600"></i>タグ
        </h3>
        <button onclick="showAddTagModal(${prospectId})" class="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition">
          <i class="fas fa-plus mr-1"></i>追加
        </button>
      </div>
      
      ${prospectTags.length === 0 ? `
        <div class="text-center py-8 text-gray-400">
          <i class="fas fa-tag text-4xl mb-2 opacity-50"></i>
          <p class="text-sm">タグがまだ設定されていません</p>
          <button onclick="showAddTagModal(${prospectId})" class="mt-3 text-purple-600 hover:text-purple-800 text-sm font-semibold">
            最初のタグを追加
          </button>
        </div>
      ` : `
        <div class="flex flex-wrap gap-2">
          ${prospectTags.map(tag => `
            <div class="group relative inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition">
              <i class="fas fa-tag mr-1.5 text-xs"></i>
              <span class="text-sm font-medium">${tag}</span>
              <button 
                onclick="removeTagFromProspect(${prospectId}, '${tag.replace(/'/g, "\\'")}')"
                class="ml-2 opacity-0 group-hover:opacity-100 transition"
              >
                <i class="fas fa-times text-xs hover:text-red-600"></i>
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// Show add tag modal
function showAddTagModal(prospectId) {
  const modal = document.createElement('div');
  modal.id = 'add-tag-modal';
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
  
  // Fetch all tags for suggestions
  fetchAllTags();
  
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-tag mr-2 text-purple-600"></i>タグを追加
        </h2>
        <button onclick="document.getElementById('add-tag-modal').remove()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form onsubmit="handleAddTag(event, ${prospectId})" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">タグ名</label>
          <input 
            type="text" 
            id="tag-input" 
            placeholder="例: IT業界, 大手企業, 緊急"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
            list="tag-suggestions"
          />
          <datalist id="tag-suggestions">
            ${allTags.map(t => `<option value="${t.tag}">`).join('')}
          </datalist>
          <p class="text-xs text-gray-500 mt-1">よく使うタグから選択または新規作成</p>
        </div>
        
        ${allTags.length > 0 ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">よく使われるタグ</label>
            <div class="flex flex-wrap gap-2">
              ${allTags.slice(0, 8).map(t => `
                <button 
                  type="button"
                  onclick="document.getElementById('tag-input').value='${t.tag.replace(/'/g, "\\'")}'"
                  class="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-purple-100 hover:text-purple-800 transition"
                >
                  <i class="fas fa-tag mr-1 text-xs"></i>${t.tag} (${t.count})
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="flex gap-3">
          <button 
            type="button"
            onclick="document.getElementById('add-tag-modal').remove()"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button 
            type="submit"
            class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <i class="fas fa-plus mr-2"></i>追加
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
  
  // Focus input
  setTimeout(() => {
    document.getElementById('tag-input').focus();
  }, 100);
}

// Handle add tag form submission
function handleAddTag(event, prospectId) {
  event.preventDefault();
  const tag = document.getElementById('tag-input').value.trim();
  
  if (tag) {
    addTagToProspect(prospectId, tag);
    document.getElementById('add-tag-modal').remove();
  }
}
