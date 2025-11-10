// UI/UX Enhancement JavaScript for Sales CRM

// ==================== ENHANCED LOADING INDICATOR ====================
class LoadingManager {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
  }
  
  show(message = 'Loading...', progress = null) {
    if (this.isVisible) return;
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
      ${progress !== null ? `<div class="loading-progress">${progress}</div>` : ''}
    `;
    
    document.body.appendChild(this.overlay);
    this.isVisible = true;
  }
  
  updateMessage(message, progress = null) {
    if (!this.isVisible || !this.overlay) return;
    
    const textEl = this.overlay.querySelector('.loading-text');
    if (textEl) textEl.textContent = message;
    
    if (progress !== null) {
      let progressEl = this.overlay.querySelector('.loading-progress');
      if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.className = 'loading-progress';
        this.overlay.appendChild(progressEl);
      }
      progressEl.textContent = progress;
    }
  }
  
  hide() {
    if (!this.isVisible || !this.overlay) return;
    
    this.overlay.remove();
    this.overlay = null;
    this.isVisible = false;
  }
}

const loadingManager = new LoadingManager();

// ==================== ENHANCED TOAST NOTIFICATIONS ====================
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }
  
  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }
  
  show(message, type = 'info', options = {}) {
    const {
      title = this.getDefaultTitle(type),
      duration = 3000,
      closable = true
    } = options;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconHtml = this.getIcon(type);
    const closeBtn = closable ? `
      <button class="toast-close" onclick="toastManager.remove(this.parentElement)">
        <i class="fas fa-times"></i>
      </button>
    ` : '';
    
    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      ${closeBtn}
    `;
    
    this.container.appendChild(toast);
    this.toasts.push(toast);
    
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
    
    return toast;
  }
  
  remove(toast) {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      toast.remove();
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }
  
  getIcon(type) {
    const icons = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>'
    };
    return icons[type] || icons.info;
  }
  
  getDefaultTitle(type) {
    const titles = {
      success: '成功',
      error: 'エラー',
      info: '情報',
      warning: '警告'
    };
    return titles[type] || '';
  }
  
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    return this.show(message, 'error', options);
  }
  
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
  
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
}

const toastManager = new ToastManager();

// Backward compatible - replace old showToast
window.showToast = function(message, type = 'info') {
  toastManager.show(message, type);
};

// ==================== FORM VALIDATION ====================
class FormValidator {
  constructor(formElement) {
    this.form = formElement;
    this.errors = {};
  }
  
  validate(rules) {
    this.errors = {};
    this.clearErrors();
    
    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const field = this.form.querySelector(`#${fieldName}`);
      if (!field) continue;
      
      const value = field.value.trim();
      
      // Required validation
      if (fieldRules.required && !value) {
        this.addError(field, fieldRules.requiredMessage || `${fieldRules.label || fieldName}は必須です`);
        continue;
      }
      
      // Skip other validations if empty and not required
      if (!value && !fieldRules.required) continue;
      
      // Min length validation
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        this.addError(field, `${fieldRules.label || fieldName}は${fieldRules.minLength}文字以上で入力してください`);
        continue;
      }
      
      // Max length validation
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        this.addError(field, `${fieldRules.label || fieldName}は${fieldRules.maxLength}文字以内で入力してください`);
        continue;
      }
      
      // Email validation
      if (fieldRules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          this.addError(field, '有効なメールアドレスを入力してください');
          continue;
        }
      }
      
      // URL validation
      if (fieldRules.url) {
        try {
          new URL(value);
        } catch (e) {
          this.addError(field, '有効なURLを入力してください');
          continue;
        }
      }
      
      // Number validation
      if (fieldRules.number) {
        if (isNaN(value)) {
          this.addError(field, '数値を入力してください');
          continue;
        }
      }
      
      // Min value validation
      if (fieldRules.min !== undefined && parseFloat(value) < fieldRules.min) {
        this.addError(field, `${fieldRules.label || fieldName}は${fieldRules.min}以上で入力してください`);
        continue;
      }
      
      // Max value validation
      if (fieldRules.max !== undefined && parseFloat(value) > fieldRules.max) {
        this.addError(field, `${fieldRules.label || fieldName}は${fieldRules.max}以下で入力してください`);
        continue;
      }
      
      // Custom validation
      if (fieldRules.custom) {
        const customResult = fieldRules.custom(value);
        if (customResult !== true) {
          this.addError(field, customResult || 'Invalid input');
          continue;
        }
      }
      
      // If we reach here, field is valid
      this.markValid(field);
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  addError(field, message) {
    const fieldName = field.id;
    this.errors[fieldName] = message;
    
    field.classList.add('error');
    field.classList.remove('success');
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) existingError.remove();
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
    field.parentElement.appendChild(errorDiv);
  }
  
  markValid(field) {
    field.classList.remove('error');
    field.classList.add('success');
    
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) existingError.remove();
  }
  
  clearErrors() {
    this.form.querySelectorAll('.form-error').forEach(el => el.remove());
    this.form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
      el.classList.remove('success');
    });
  }
  
  getErrors() {
    return this.errors;
  }
}

// ==================== MODAL MANAGER ====================
class ModalManager {
  constructor() {
    this.modals = [];
  }
  
  create(options = {}) {
    const {
      title = 'Modal',
      content = '',
      size = 'medium', // small, medium, large, xlarge
      closable = true,
      onClose = null
    } = options;
    
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    const sizeClasses = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      xlarge: 'max-w-6xl'
    };
    
    modal.innerHTML = `
      <div class="modal-content ${sizeClasses[size] || sizeClasses.medium}" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          ${closable ? `
            <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">
              <i class="fas fa-times text-xl"></i>
            </button>
          ` : ''}
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    // Close on backdrop click
    if (closable) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close(modal);
          if (onClose) onClose();
        }
      });
    }
    
    // Close on Escape key
    if (closable) {
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.close(modal);
          if (onClose) onClose();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }
    
    document.body.appendChild(modal);
    this.modals.push(modal);
    
    return modal;
  }
  
  close(modal) {
    modal.style.animation = 'fadeIn 0.2s ease-out reverse';
    setTimeout(() => {
      modal.remove();
      this.modals = this.modals.filter(m => m !== modal);
    }, 200);
  }
  
  closeAll() {
    this.modals.forEach(modal => this.close(modal));
  }
}

const modalManager = new ModalManager();

// ==================== CONFIRMATION DIALOG ====================
function showConfirmDialog(options = {}) {
  const {
    title = '確認',
    message = 'この操作を実行してもよろしいですか？',
    confirmText = '確認',
    cancelText = 'キャンセル',
    type = 'warning', // success, warning, danger, info
    onConfirm = null,
    onCancel = null
  } = options;
  
  const iconMap = {
    success: { icon: 'fa-check-circle', color: 'text-green-600' },
    warning: { icon: 'fa-exclamation-triangle', color: 'text-yellow-600' },
    danger: { icon: 'fa-exclamation-circle', color: 'text-red-600' },
    info: { icon: 'fa-info-circle', color: 'text-blue-600' }
  };
  
  const { icon, color } = iconMap[type] || iconMap.warning;
  
  const content = `
    <div class="text-center py-6">
      <div class="mb-4">
        <i class="fas ${icon} ${color} text-6xl"></i>
      </div>
      <h3 class="text-xl font-bold text-gray-800 mb-3">${title}</h3>
      <p class="text-gray-600 mb-6">${message}</p>
      <div class="flex gap-3 justify-center">
        <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove(); ${onCancel ? 'window.confirmDialogOnCancel()' : ''}">
          ${cancelText}
        </button>
        <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" onclick="this.closest('.modal-backdrop').remove(); ${onConfirm ? 'window.confirmDialogOnConfirm()' : ''}">
          ${confirmText}
        </button>
      </div>
    </div>
  `;
  
  // Temporarily store callbacks
  if (onConfirm) window.confirmDialogOnConfirm = onConfirm;
  if (onCancel) window.confirmDialogOnCancel = onCancel;
  
  return modalManager.create({
    title: '',
    content,
    size: 'small',
    closable: true
  });
}

// ==================== BUTTON LOADING STATE ====================
function setButtonLoading(button, loading = true, originalText = null) {
  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.classList.add('btn-loading');
    button.disabled = true;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    if (originalText) {
      button.innerHTML = originalText;
    } else if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

// ==================== DEBOUNCE UTILITY ====================
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==================== COPY TO CLIPBOARD ====================
async function copyToClipboard(text, showNotification = true) {
  try {
    await navigator.clipboard.writeText(text);
    if (showNotification) {
      toastManager.success('クリップボードにコピーしました');
    }
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    if (showNotification) {
      toastManager.error('コピーに失敗しました');
    }
    return false;
  }
}

// ==================== FORMAT UTILITIES ====================
function formatCurrency(amount) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
}

function formatNumber(number) {
  return new Intl.NumberFormat('ja-JP').format(number);
}

function formatDate(date, format = 'YYYY/MM/DD') {
  return dayjs(date).format(format);
}

function formatDateTime(date) {
  return dayjs(date).format('YYYY/MM/DD HH:mm');
}

function formatRelativeTime(date) {
  return dayjs(date).fromNow();
}

// ==================== EXPORTS ====================
window.loadingManager = loadingManager;
window.toastManager = toastManager;
window.FormValidator = FormValidator;
window.modalManager = modalManager;
window.showConfirmDialog = showConfirmDialog;
window.setButtonLoading = setButtonLoading;
window.debounce = debounce;
window.copyToClipboard = copyToClipboard;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatRelativeTime = formatRelativeTime;
