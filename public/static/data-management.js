// Data Management for Sales CRM
// Option 3: Backup, Import, History Management

// ==================== DATA BACKUP & RESTORE ====================

/**
 * Backup and restore data functionality
 */
class BackupManager {
  /**
   * Create full backup of all CRM data
   */
  async createFullBackup() {
    try {
      loadingManager.show('バックアップを作成中...');
      
      // Fetch all data
      const [prospectsRes, connectionsRes, meetingsRes] = await Promise.all([
        axios.get('/api/prospects', { headers: { 'X-Session-Token': sessionToken } }),
        axios.get('/api/networking/connections', { headers: { 'X-Session-Token': sessionToken } }),
        axios.get('/api/meetings', { headers: { 'X-Session-Token': sessionToken } })
      ]);
      
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          prospects: prospectsRes.data.prospects || [],
          connections: connectionsRes.data.connections || [],
          meetings: meetingsRes.data.meetings || []
        },
        metadata: {
          prospect_count: prospectsRes.data.prospects?.length || 0,
          connection_count: connectionsRes.data.connections?.length || 0,
          meeting_count: meetingsRes.data.meetings?.length || 0
        }
      };
      
      const filename = `sales-crm-backup-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
      this.downloadJSON(backup, filename);
      
      loadingManager.hide();
      toastManager.success(`バックアップを作成しました: ${filename}`);
      
      // Save backup history
      this.saveBackupHistory(backup.metadata);
      
      return backup;
    } catch (error) {
      loadingManager.hide();
      console.error('Backup failed:', error);
      toastManager.error('バックアップの作成に失敗しました');
      throw error;
    }
  }
  
  /**
   * Restore data from backup file
   */
  async restoreFromBackup(file) {
    try {
      loadingManager.show('バックアップを復元中...');
      
      const backupData = await this.readJSONFile(file);
      
      if (!backupData.version || !backupData.data) {
        throw new Error('Invalid backup file format');
      }
      
      // Confirm restore
      const confirmed = await new Promise(resolve => {
        showConfirmDialog({
          title: 'バックアップの復元',
          message: `${backupData.metadata.prospect_count}件の見込み客、${backupData.metadata.connection_count}件の人脈、${backupData.metadata.meeting_count}件の商談を復元します。既存のデータは上書きされます。よろしいですか？`,
          type: 'warning',
          confirmText: '復元する',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });
      
      if (!confirmed) {
        loadingManager.hide();
        return;
      }
      
      // Restore prospects
      loadingManager.updateMessage('見込み客を復元中...', `0/${backupData.data.prospects.length}`);
      for (let i = 0; i < backupData.data.prospects.length; i++) {
        const prospect = backupData.data.prospects[i];
        await axios.post('/api/prospects', prospect, {
          headers: { 'X-Session-Token': sessionToken }
        });
        loadingManager.updateMessage('見込み客を復元中...', `${i + 1}/${backupData.data.prospects.length}`);
      }
      
      // Restore connections
      loadingManager.updateMessage('人脈を復元中...', `0/${backupData.data.connections.length}`);
      for (let i = 0; i < backupData.data.connections.length; i++) {
        const connection = backupData.data.connections[i];
        await axios.post('/api/networking', connection, {
          headers: { 'X-Session-Token': sessionToken }
        });
        loadingManager.updateMessage('人脈を復元中...', `${i + 1}/${backupData.data.connections.length}`);
      }
      
      // Restore meetings
      loadingManager.updateMessage('商談を復元中...', `0/${backupData.data.meetings.length}`);
      for (let i = 0; i < backupData.data.meetings.length; i++) {
        const meeting = backupData.data.meetings[i];
        await axios.post('/api/meetings', meeting, {
          headers: { 'X-Session-Token': sessionToken }
        });
        loadingManager.updateMessage('商談を復元中...', `${i + 1}/${backupData.data.meetings.length}`);
      }
      
      loadingManager.hide();
      toastManager.success('バックアップの復元が完了しました');
      
      // Reload page
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      loadingManager.hide();
      console.error('Restore failed:', error);
      toastManager.error('バックアップの復元に失敗しました');
      throw error;
    }
  }
  
  /**
   * Download JSON file
   */
  downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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
   * Read JSON file
   */
  async readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * Save backup history to localStorage
   */
  saveBackupHistory(metadata) {
    const history = JSON.parse(localStorage.getItem('backup_history') || '[]');
    history.unshift({
      timestamp: new Date().toISOString(),
      ...metadata
    });
    // Keep only last 10 backups
    history.splice(10);
    localStorage.setItem('backup_history', JSON.stringify(history));
  }
  
  /**
   * Get backup history
   */
  getBackupHistory() {
    return JSON.parse(localStorage.getItem('backup_history') || '[]');
  }
}

const backupManager = new BackupManager();

// ==================== CSV IMPORT ====================

/**
 * Import data from CSV files
 */
class ImportManager {
  /**
   * Import prospects from CSV
   */
  async importProspectsFromCSV(file) {
    try {
      loadingManager.show('CSVファイルを解析中...');
      
      const csvText = await this.readTextFile(file);
      const rows = this.parseCSV(csvText);
      
      if (rows.length < 2) {
        throw new Error('CSV file is empty or invalid');
      }
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      loadingManager.updateMessage('見込み客をインポート中...', `0/${dataRows.length}`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < dataRows.length; i++) {
        try {
          const prospect = this.csvRowToProspect(headers, dataRows[i]);
          await axios.post('/api/prospects', prospect, {
            headers: { 'X-Session-Token': sessionToken }
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import row ${i + 1}:`, error);
          errorCount++;
        }
        loadingManager.updateMessage('見込み客をインポート中...', `${i + 1}/${dataRows.length}`);
      }
      
      loadingManager.hide();
      toastManager.success(`${successCount}件インポート成功、${errorCount}件失敗`);
      
      // Reload prospects
      await loadProspects();
      renderProspectsView();
    } catch (error) {
      loadingManager.hide();
      console.error('Import failed:', error);
      toastManager.error('CSVのインポートに失敗しました');
      throw error;
    }
  }
  
  /**
   * Read text file
   */
  async readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }
  
  /**
   * Parse CSV text
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const rows = [];
    
    for (const line of lines) {
      const row = [];
      let cell = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(cell.trim());
          cell = '';
        } else {
          cell += char;
        }
      }
      row.push(cell.trim());
      rows.push(row);
    }
    
    return rows;
  }
  
  /**
   * Convert CSV row to prospect object
   */
  csvRowToProspect(headers, row) {
    const prospect = {
      company_name: row[0] || '',
      contact_name: row[1] || null,
      contact_position: row[2] || null,
      contact_email: row[3] || null,
      contact_phone: row[4] || null,
      industry: row[5] || null,
      status: this.parseStatus(row[6]) || 'qualified',
      priority: this.parsePriority(row[7]) || 'medium',
      estimated_value: parseInt(row[8]) || null,
      source: row[9] || null,
      notes: row[10] || null
    };
    
    return prospect;
  }
  
  /**
   * Parse status label to value
   */
  parseStatus(label) {
    const statusMap = {
      '新規': 'new',
      '接触済': 'contacted',
      '見込みあり': 'qualified',
      '商談中': 'negotiating',
      '契約済': 'contracted',
      '見込みなし': 'not_qualified'
    };
    return statusMap[label] || label;
  }
  
  /**
   * Parse priority label to value
   */
  parsePriority(label) {
    const priorityMap = {
      '低': 'low',
      '中': 'medium',
      '高': 'high',
      '緊急': 'urgent'
    };
    return priorityMap[label] || label;
  }
}

const importManager = new ImportManager();

// ==================== ACTIVITY HISTORY ====================

/**
 * Track and display activity history
 */
class ActivityHistoryManager {
  constructor() {
    this.maxHistorySize = 100;
  }
  
  /**
   * Log activity
   */
  logActivity(type, action, details) {
    const history = this.getHistory();
    
    history.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type, // prospect, connection, meeting, todo
      action, // create, update, delete
      details,
      user_id: sessionToken
    });
    
    // Keep only max size
    history.splice(this.maxHistorySize);
    
    localStorage.setItem('activity_history', JSON.stringify(history));
  }
  
  /**
   * Get activity history
   */
  getHistory(limit = 50) {
    const history = JSON.parse(localStorage.getItem('activity_history') || '[]');
    return history.slice(0, limit);
  }
  
  /**
   * Clear history
   */
  clearHistory() {
    localStorage.removeItem('activity_history');
    toastManager.success('アクティビティ履歴をクリアしました');
  }
  
  /**
   * Get activity icon
   */
  getActivityIcon(type, action) {
    const icons = {
      prospect: {
        create: 'fa-building',
        update: 'fa-edit',
        delete: 'fa-trash'
      },
      connection: {
        create: 'fa-user-plus',
        update: 'fa-user-edit',
        delete: 'fa-user-times'
      },
      meeting: {
        create: 'fa-calendar-plus',
        update: 'fa-calendar-check',
        delete: 'fa-calendar-times'
      },
      todo: {
        create: 'fa-plus-circle',
        update: 'fa-check-circle',
        delete: 'fa-times-circle'
      }
    };
    
    return icons[type]?.[action] || 'fa-info-circle';
  }
  
  /**
   * Get activity color
   */
  getActivityColor(action) {
    const colors = {
      create: 'text-green-600',
      update: 'text-blue-600',
      delete: 'text-red-600'
    };
    return colors[action] || 'text-gray-600';
  }
  
  /**
   * Get activity label
   */
  getActivityLabel(type, action) {
    const labels = {
      prospect: {
        create: '見込み客を作成',
        update: '見込み客を更新',
        delete: '見込み客を削除'
      },
      connection: {
        create: '人脈を追加',
        update: '人脈を更新',
        delete: '人脈を削除'
      },
      meeting: {
        create: '商談を登録',
        update: '商談を更新',
        delete: '商談を削除'
      },
      todo: {
        create: 'ToDoを追加',
        update: 'ToDoを更新',
        delete: 'ToDoを削除'
      }
    };
    
    return labels[type]?.[action] || `${type} ${action}`;
  }
}

const activityHistoryManager = new ActivityHistoryManager();

// ==================== AUTO-SAVE ====================

/**
 * Auto-save draft functionality
 */
class AutoSaveManager {
  constructor() {
    this.saveTimeout = null;
    this.saveDelay = 2000; // 2 seconds
  }
  
  /**
   * Save draft data
   */
  saveDraft(key, data) {
    const drafts = this.getAllDrafts();
    drafts[key] = {
      data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('crm_drafts', JSON.stringify(drafts));
  }
  
  /**
   * Load draft data
   */
  loadDraft(key) {
    const drafts = this.getAllDrafts();
    return drafts[key]?.data || null;
  }
  
  /**
   * Delete draft
   */
  deleteDraft(key) {
    const drafts = this.getAllDrafts();
    delete drafts[key];
    localStorage.setItem('crm_drafts', JSON.stringify(drafts));
  }
  
  /**
   * Get all drafts
   */
  getAllDrafts() {
    return JSON.parse(localStorage.getItem('crm_drafts') || '{}');
  }
  
  /**
   * Auto-save with debounce
   */
  autoSave(key, data) {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveDraft(key, data);
    }, this.saveDelay);
  }
  
  /**
   * Clear all drafts
   */
  clearAllDrafts() {
    localStorage.removeItem('crm_drafts');
    toastManager.success('すべての下書きをクリアしました');
  }
}

const autoSaveManager = new AutoSaveManager();

// ==================== EXPORTS ====================
window.backupManager = backupManager;
window.importManager = importManager;
window.activityHistoryManager = activityHistoryManager;
window.autoSaveManager = autoSaveManager;
