// Quality Improvements for Sales CRM
// Option 4: Error Handling, Performance, Testing

// ==================== ENHANCED ERROR HANDLING ====================

/**
 * Global error handler
 */
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrorsStored = 50;
    this.setupGlobalHandlers();
  }
  
  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.logError('Promise Rejection', event.reason);
      event.preventDefault();
    });
    
    // Catch global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.logError('Runtime Error', event.error);
    });
    
    // Intercept axios errors
    if (window.axios) {
      axios.interceptors.response.use(
        response => response,
        error => {
          this.handleAPIError(error);
          return Promise.reject(error);
        }
      );
    }
  }
  
  /**
   * Handle API errors
   */
  handleAPIError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.error || error.response.data?.message || 'Unknown error';
      
      if (status === 401) {
        toastManager.error('認証が必要です。再度ログインしてください。');
        setTimeout(() => {
          localStorage.removeItem('session_token');
          window.location.href = '/';
        }, 2000);
      } else if (status === 403) {
        toastManager.error('この操作を実行する権限がありません');
      } else if (status === 404) {
        toastManager.error('リソースが見つかりません');
      } else if (status >= 500) {
        toastManager.error('サーバーエラーが発生しました。しばらくしてから再試行してください。');
      } else {
        toastManager.error(message);
      }
      
      this.logError('API Error', {
        status,
        message,
        url: error.config?.url,
        method: error.config?.method
      });
    } else if (error.request) {
      // Request was made but no response received
      toastManager.error('サーバーに接続できません。ネットワーク接続を確認してください。');
      this.logError('Network Error', error);
    } else {
      // Something else happened
      toastManager.error('リクエストの設定中にエラーが発生しました');
      this.logError('Request Error', error);
    }
  }
  
  /**
   * Log error
   */
  logError(type, error) {
    const errorLog = {
      type,
      message: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.unshift(errorLog);
    
    // Keep only max errors
    if (this.errors.length > this.maxErrorsStored) {
      this.errors.pop();
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.errors));
    } catch (e) {
      console.error('Failed to save error logs:', e);
    }
  }
  
  /**
   * Get error logs
   */
  getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]');
    } catch (e) {
      return this.errors;
    }
  }
  
  /**
   * Clear error logs
   */
  clearErrorLogs() {
    this.errors = [];
    localStorage.removeItem('error_logs');
    toastManager.success('エラーログをクリアしました');
  }
  
  /**
   * Export error logs
   */
  exportErrorLogs() {
    const logs = this.getErrorLogs();
    const filename = `error-logs-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastManager.success('エラーログをエクスポートしました');
  }
}

const errorHandler = new ErrorHandler();

// ==================== PERFORMANCE MONITORING ====================

/**
 * Performance monitor
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.setupMonitoring();
  }
  
  /**
   * Setup performance monitoring
   */
  setupMonitoring() {
    // Monitor page load time
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        this.recordMetric('page_load', {
          duration: perfData.loadEventEnd - perfData.fetchStart,
          dom_interactive: perfData.domInteractive - perfData.fetchStart,
          dom_complete: perfData.domComplete - perfData.fetchStart
        });
      }
    });
  }
  
  /**
   * Record metric
   */
  recordMetric(name, data) {
    this.metrics.push({
      name,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }
  
  /**
   * Measure async function performance
   */
  async measureAsync(name, fn) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, { duration, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, { duration, status: 'error', error: error.message });
      throw error;
    }
  }
  
  /**
   * Get performance report
   */
  getReport() {
    const grouped = {};
    
    this.metrics.forEach(m => {
      if (!grouped[m.name]) {
        grouped[m.name] = {
          count: 0,
          total_duration: 0,
          min_duration: Infinity,
          max_duration: -Infinity,
          success_count: 0,
          error_count: 0
        };
      }
      
      const stats = grouped[m.name];
      stats.count++;
      
      if (m.data.duration !== undefined) {
        stats.total_duration += m.data.duration;
        stats.min_duration = Math.min(stats.min_duration, m.data.duration);
        stats.max_duration = Math.max(stats.max_duration, m.data.duration);
      }
      
      if (m.data.status === 'success') stats.success_count++;
      if (m.data.status === 'error') stats.error_count++;
    });
    
    // Calculate averages
    Object.keys(grouped).forEach(key => {
      const stats = grouped[key];
      stats.avg_duration = stats.total_duration / stats.count;
      stats.success_rate = (stats.success_count / stats.count) * 100;
    });
    
    return grouped;
  }
  
  /**
   * Print performance report
   */
  printReport() {
    const report = this.getReport();
    console.table(report);
    return report;
  }
}

const performanceMonitor = new PerformanceMonitor();

// ==================== DATA VALIDATION ====================

/**
 * Data validator
 */
class DataValidator {
  /**
   * Validate prospect data
   */
  validateProspect(data) {
    const errors = [];
    
    if (!data.company_name || data.company_name.trim() === '') {
      errors.push('企業名は必須です');
    }
    
    if (data.contact_email && !this.isValidEmail(data.contact_email)) {
      errors.push('有効なメールアドレスを入力してください');
    }
    
    if (data.estimated_value && (isNaN(data.estimated_value) || data.estimated_value < 0)) {
      errors.push('見込み金額は0以上の数値を入力してください');
    }
    
    if (data.company_url && !this.isValidURL(data.company_url)) {
      errors.push('有効なURLを入力してください');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate connection data
   */
  validateConnection(data) {
    const errors = [];
    
    if (!data.person_name || data.person_name.trim() === '') {
      errors.push('名前は必須です');
    }
    
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('有効なメールアドレスを入力してください');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate meeting data
   */
  validateMeeting(data) {
    const errors = [];
    
    if (!data.meeting_date) {
      errors.push('商談日は必須です');
    }
    
    if (!data.meeting_type || data.meeting_type.trim() === '') {
      errors.push('商談種別は必須です');
    }
    
    if (!data.attendees || data.attendees.trim() === '') {
      errors.push('参加者は必須です');
    }
    
    if (data.duration_minutes && (isNaN(data.duration_minutes) || data.duration_minutes < 0)) {
      errors.push('時間は0以上の数値を入力してください');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Check if URL is valid
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
}

const dataValidator = new DataValidator();

// ==================== CACHE MANAGEMENT ====================

/**
 * Simple cache manager
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Set cache with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  /**
   * Get from cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * Check if cache has key
   */
  has(key) {
    return this.get(key) !== null;
  }
  
  /**
   * Delete from cache
   */
  delete(key) {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    toastManager.success('キャッシュをクリアしました');
  }
  
  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

const cacheManager = new CacheManager();

// ==================== HEALTH CHECK ====================

/**
 * System health checker
 */
class HealthChecker {
  /**
   * Run health check
   */
  async runHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };
    
    try {
      // Check API connectivity
      results.checks.api = await this.checkAPI();
      
      // Check localStorage
      results.checks.localStorage = this.checkLocalStorage();
      
      // Check browser features
      results.checks.browser = this.checkBrowserFeatures();
      
      // Overall status
      const allHealthy = Object.values(results.checks).every(c => c.status === 'ok');
      results.status = allHealthy ? 'healthy' : 'degraded';
      
      return results;
    } catch (error) {
      results.status = 'unhealthy';
      results.error = error.message;
      return results;
    }
  }
  
  /**
   * Check API connectivity
   */
  async checkAPI() {
    try {
      const response = await axios.get('/health');
      return {
        status: response.status === 200 ? 'ok' : 'error',
        response_time: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Check localStorage availability
   */
  checkLocalStorage() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return {
        status: 'ok',
        available: true
      };
    } catch (error) {
      return {
        status: 'error',
        available: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check browser features
   */
  checkBrowserFeatures() {
    return {
      status: 'ok',
      features: {
        localStorage: typeof Storage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window
      }
    };
  }
  
  /**
   * Display health check results
   */
  displayHealthCheck(results) {
    console.group('System Health Check');
    console.log('Status:', results.status);
    console.log('Timestamp:', results.timestamp);
    console.log('Checks:', results.checks);
    console.groupEnd();
    
    return results;
  }
}

const healthChecker = new HealthChecker();

// ==================== DEBUG MODE ====================

/**
 * Debug utilities
 */
class DebugManager {
  constructor() {
    this.enabled = localStorage.getItem('debug_mode') === 'true';
  }
  
  /**
   * Enable debug mode
   */
  enable() {
    this.enabled = true;
    localStorage.setItem('debug_mode', 'true');
    console.log('%c Debug Mode Enabled ', 'background: #4f46e5; color: white; padding: 5px 10px; border-radius: 3px;');
    toastManager.info('デバッグモードを有効にしました');
  }
  
  /**
   * Disable debug mode
   */
  disable() {
    this.enabled = false;
    localStorage.removeItem('debug_mode');
    console.log('%c Debug Mode Disabled ', 'background: #6b7280; color: white; padding: 5px 10px; border-radius: 3px;');
    toastManager.info('デバッグモードを無効にしました');
  }
  
  /**
   * Toggle debug mode
   */
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Log debug message
   */
  log(...args) {
    if (this.enabled) {
      console.log('%c[DEBUG]', 'color: #4f46e5; font-weight: bold;', ...args);
    }
  }
  
  /**
   * Get system info
   */
  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      connection: navigator.connection?.effectiveType || 'unknown',
      memory: navigator.deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown'
    };
  }
  
  /**
   * Print system info
   */
  printSystemInfo() {
    const info = this.getSystemInfo();
    console.table(info);
    return info;
  }
}

const debugManager = new DebugManager();

// ==================== EXPORTS ====================
window.errorHandler = errorHandler;
window.performanceMonitor = performanceMonitor;
window.dataValidator = dataValidator;
window.cacheManager = cacheManager;
window.healthChecker = healthChecker;
window.debugManager = debugManager;

// Make debug functions globally accessible
window.debug = debugManager;
window.health = () => healthChecker.runHealthCheck().then(r => healthChecker.displayHealthCheck(r));
window.perf = () => performanceMonitor.printReport();
window.errors = () => {
  const logs = errorHandler.getErrorLogs();
  console.table(logs);
  return logs;
};
