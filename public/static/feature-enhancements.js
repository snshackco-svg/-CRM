// Feature Enhancements for Sales CRM
// Option 2: Search, Filter, Export, Charts

// ==================== SEARCH & FILTER ====================

/**
 * Advanced search functionality across multiple fields
 */
class SearchManager {
  constructor() {
    this.searchResults = [];
    this.currentQuery = '';
  }
  
  /**
   * Search across prospects data
   */
  searchProspects(query, prospects) {
    if (!query || query.trim() === '') {
      return prospects;
    }
    
    this.currentQuery = query.toLowerCase();
    const keywords = this.currentQuery.split(' ').filter(k => k.length > 0);
    
    this.searchResults = prospects.filter(prospect => {
      const searchableText = [
        prospect.company_name,
        prospect.contact_name,
        prospect.contact_email,
        prospect.industry,
        prospect.notes,
        prospect.status,
        prospect.priority
      ].filter(Boolean).join(' ').toLowerCase();
      
      return keywords.every(keyword => searchableText.includes(keyword));
    });
    
    return this.searchResults;
  }
  
  /**
   * Search across connections data
   */
  searchConnections(query, connections) {
    if (!query || query.trim() === '') {
      return connections;
    }
    
    this.currentQuery = query.toLowerCase();
    const keywords = this.currentQuery.split(' ').filter(k => k.length > 0);
    
    this.searchResults = connections.filter(connection => {
      const searchableText = [
        connection.person_name,
        connection.company,
        connection.position,
        connection.industry,
        connection.email,
        connection.notes
      ].filter(Boolean).join(' ').toLowerCase();
      
      return keywords.every(keyword => searchableText.includes(keyword));
    });
    
    return this.searchResults;
  }
  
  /**
   * Highlight search keywords in text
   */
  highlightKeywords(text, query) {
    if (!query || !text) return text;
    
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 0);
    let highlightedText = text;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 font-semibold">$1</mark>');
    });
    
    return highlightedText;
  }
}

const searchManager = new SearchManager();

/**
 * Advanced filter functionality
 */
class FilterManager {
  constructor() {
    this.activeFilters = {};
  }
  
  /**
   * Apply multiple filters to prospects
   */
  filterProspects(prospects, filters) {
    this.activeFilters = filters;
    let filtered = [...prospects];
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    // Priority filter
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(p => p.priority === filters.priority);
    }
    
    // Industry filter
    if (filters.industry && filters.industry !== 'all') {
      filtered = filtered.filter(p => p.industry === filters.industry);
    }
    
    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(p => {
        const prospectDate = new Date(p.created_at);
        return prospectDate >= new Date(filters.dateFrom);
      });
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(p => {
        const prospectDate = new Date(p.created_at);
        return prospectDate <= new Date(filters.dateTo);
      });
    }
    
    // Value range filter
    if (filters.minValue !== undefined && filters.minValue !== '') {
      filtered = filtered.filter(p => p.estimated_value >= parseInt(filters.minValue));
    }
    
    if (filters.maxValue !== undefined && filters.maxValue !== '') {
      filtered = filtered.filter(p => p.estimated_value <= parseInt(filters.maxValue));
    }
    
    // Has tasks filter
    if (filters.hasTasks === true) {
      filtered = filtered.filter(p => p.todo_count > 0);
    }
    
    // Has meetings filter
    if (filters.hasMeetings === true) {
      filtered = filtered.filter(p => p.meeting_count > 0);
    }
    
    return filtered;
  }
  
  /**
   * Get unique values for filter dropdowns
   */
  getUniqueValues(prospects, field) {
    const values = prospects
      .map(p => p[field])
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort();
    
    return values;
  }
  
  /**
   * Clear all active filters
   */
  clearFilters() {
    this.activeFilters = {};
  }
  
  /**
   * Get count of active filters
   */
  getActiveFilterCount() {
    return Object.keys(this.activeFilters).filter(key => {
      const value = this.activeFilters[key];
      return value && value !== 'all' && value !== '';
    }).length;
  }
}

const filterManager = new FilterManager();

// ==================== DATA EXPORT ====================

/**
 * Export data to various formats
 */
class ExportManager {
  /**
   * Export prospects to CSV
   */
  exportProspectsToCSV(prospects) {
    const headers = [
      '企業名', '担当者', '役職', 'メール', '電話', 
      '業界', 'ステータス', '優先度', '見込み金額', 
      '情報源', '商談回数', '作成日', '更新日'
    ];
    
    const rows = prospects.map(p => [
      p.company_name || '',
      p.contact_name || '',
      p.contact_position || '',
      p.contact_email || '',
      p.contact_phone || '',
      p.industry || '',
      this.getStatusLabel(p.status),
      this.getPriorityLabel(p.priority),
      p.estimated_value || '',
      p.source || '',
      p.meeting_count || 0,
      dayjs(p.created_at).format('YYYY/MM/DD'),
      dayjs(p.updated_at).format('YYYY/MM/DD')
    ]);
    
    const csv = this.arrayToCSV([headers, ...rows]);
    this.downloadFile(csv, 'prospects.csv', 'text/csv;charset=utf-8;');
  }
  
  /**
   * Export connections to CSV
   */
  exportConnectionsToCSV(connections) {
    const headers = [
      '名前', '会社名', '役職', '業界', 
      'メール', '電話', '関係強度', '作成日'
    ];
    
    const rows = connections.map(c => [
      c.person_name || '',
      c.company || '',
      c.position || '',
      c.industry || '',
      c.email || '',
      c.phone || '',
      c.relationship_strength || '',
      dayjs(c.created_at).format('YYYY/MM/DD')
    ]);
    
    const csv = this.arrayToCSV([headers, ...rows]);
    this.downloadFile(csv, 'connections.csv', 'text/csv;charset=utf-8;');
  }
  
  /**
   * Export meetings to CSV
   */
  exportMeetingsToCSV(meetings, prospects) {
    const headers = [
      '企業名', '商談日', '種別', '参加者', 
      '場所', '時間(分)', 'ステータス', '作成日'
    ];
    
    const rows = meetings.map(m => {
      const prospect = prospects.find(p => p.id === m.prospect_id);
      return [
        prospect ? prospect.company_name : '',
        dayjs(m.meeting_date).format('YYYY/MM/DD HH:mm'),
        m.meeting_type || '',
        m.attendees || '',
        m.location || '',
        m.duration_minutes || '',
        m.status || '',
        dayjs(m.created_at).format('YYYY/MM/DD')
      ];
    });
    
    const csv = this.arrayToCSV([headers, ...rows]);
    this.downloadFile(csv, 'meetings.csv', 'text/csv;charset=utf-8;');
  }
  
  /**
   * Convert array to CSV string
   */
  arrayToCSV(data) {
    return data.map(row => 
      row.map(cell => {
        const cellStr = String(cell).replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')
    ).join('\n');
  }
  
  /**
   * Download file
   */
  downloadFile(content, filename, mimeType) {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Get status label in Japanese
   */
  getStatusLabel(status) {
    const labels = {
      'new': '新規',
      'contacted': '接触済',
      'qualified': '見込みあり',
      'negotiating': '商談中',
      'contracted': '契約済',
      'not_qualified': '見込みなし'
    };
    return labels[status] || status;
  }
  
  /**
   * Get priority label in Japanese
   */
  getPriorityLabel(priority) {
    const labels = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '緊急'
    };
    return labels[priority] || priority;
  }
}

const exportManager = new ExportManager();

// ==================== CHARTS & VISUALIZATION ====================

/**
 * Chart manager using Chart.js
 */
class ChartManager {
  constructor() {
    this.charts = {};
  }
  
  /**
   * Create status distribution pie chart
   */
  createStatusChart(canvasId, prospects) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const statusCounts = {
      'new': 0,
      'contacted': 0,
      'qualified': 0,
      'negotiating': 0,
      'contracted': 0,
      'not_qualified': 0
    };
    
    prospects.forEach(p => {
      if (statusCounts.hasOwnProperty(p.status)) {
        statusCounts[p.status]++;
      }
    });
    
    const data = {
      labels: ['新規', '接触済', '見込みあり', '商談中', '契約済', '見込みなし'],
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#3b82f6', // blue
          '#f59e0b', // yellow
          '#10b981', // green
          '#6366f1', // indigo
          '#8b5cf6', // purple
          '#6b7280'  // gray
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
    
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    
    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12
              },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value}件 (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Create priority distribution bar chart
   */
  createPriorityChart(canvasId, prospects) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const priorityCounts = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'urgent': 0
    };
    
    prospects.forEach(p => {
      if (priorityCounts.hasOwnProperty(p.priority)) {
        priorityCounts[p.priority]++;
      }
    });
    
    const data = {
      labels: ['低', '中', '高', '緊急'],
      datasets: [{
        label: '件数',
        data: Object.values(priorityCounts),
        backgroundColor: [
          '#10b981', // green
          '#f59e0b', // yellow
          '#f97316', // orange
          '#ef4444'  // red
        ],
        borderWidth: 0
      }]
    };
    
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    
    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y}件`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
  
  /**
   * Create monthly meetings trend line chart
   */
  createMeetingsTrendChart(canvasId, meetings) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Group meetings by month
    const monthlyData = {};
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = dayjs().subtract(i, 'month').format('YYYY-MM');
      last6Months.push(month);
      monthlyData[month] = 0;
    }
    
    meetings.forEach(m => {
      const month = dayjs(m.meeting_date).format('YYYY-MM');
      if (monthlyData.hasOwnProperty(month)) {
        monthlyData[month]++;
      }
    });
    
    const data = {
      labels: last6Months.map(m => dayjs(m).format('MM月')),
      datasets: [{
        label: '商談件数',
        data: last6Months.map(m => monthlyData[m]),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    };
    
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    
    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y}件`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
  
  /**
   * Destroy all charts
   */
  destroyAll() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }
}

const chartManager = new ChartManager();

// ==================== EXPORTS ====================
window.searchManager = searchManager;
window.filterManager = filterManager;
window.exportManager = exportManager;
window.chartManager = chartManager;
