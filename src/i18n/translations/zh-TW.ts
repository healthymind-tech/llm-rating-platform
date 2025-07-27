export const zhTW = {
  // Common
  common: {
    loading: '載入中...',
    error: '錯誤',
    success: '成功',
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    edit: '編輯',
    add: '新增',
    back: '返回',
    close: '關閉',
    confirm: '確認',
    yes: '是',
    no: '否',
    ok: '確定',
    search: '搜尋',
    filter: '篩選',
    clear: '清除',
    submit: '提交',
    reset: '重設',
    actions: '操作'
  },

  // Navigation
  nav: {
    dashboard: '儀表板',
    chat: '聊天',
    history: '歷史記錄',
    settings: '設定',
    logout: '登出',
    login: '登入'
  },

  // Authentication
  auth: {
    login: '登入',
    logout: '登出',
    username: '使用者名稱',
    password: '密碼',
    email: '電子郵件',
    loginButton: '登入',
    loginFailed: '登入失敗，請檢查您的帳號密碼。',
    accessDenied: '存取被拒絕，需要管理員權限。',
    sessionExpired: '工作階段已過期，請重新登入。'
  },

  // Admin Dashboard
  admin: {
    title: '管理員儀表板',
    subtitle: '管理使用者、設定和監控系統效能',
    systemOverview: '系統總覽',
    chatHistory: '聊天記錄',
    userManagement: '使用者管理',
    systemSettings: '系統設定',
    llmConfiguration: 'LLM 設定',
    
    // User Management
    users: {
      title: '管理使用者',
      addUser: '新增使用者',
      editUser: '編輯使用者',
      deleteUser: '刪除使用者',
      username: '使用者名稱',
      email: '電子郵件',
      role: '角色',
      created: '建立時間',
      lastLogin: '最後登入',
      admin: '管理員',
      user: '使用者'
    },

    // System Settings
    settings: {
      title: '系統設定',
      language: '系統語言',
      theme: '預設主題',
      chatRetention: '聊天記錄保留天數',
      userRegistration: '啟用使用者註冊',
      maxMessageLength: '訊息最大長度',
      updateSettings: '更新設定',
      settingsUpdated: '設定更新成功'
    },

    // LLM Configuration
    llm: {
      title: 'LLM 設定',
      addConfig: '新增設定',
      editConfig: '編輯設定',
      deleteConfig: '刪除設定',
      name: '設定名稱',
      type: '類型',
      model: '模型',
      temperature: '溫度',
      maxTokens: '最大標記數',
      active: '啟用',
      apiKey: 'API 金鑰',
      endpoint: '端點網址',
      fetchModels: '取得模型',
      testConfig: '測試設定',
      testing: '測試中...',
      testSuccess: '設定測試成功！',
      testFailed: '設定測試失敗'
    }
  },

  // Chat Interface
  chat: {
    title: '聊天介面',
    newChat: '新聊天',
    sendMessage: '發送訊息',
    typeMessage: '輸入您的訊息...',
    noMessages: '尚無訊息，開始對話吧！',
    errorSending: '發送訊息失敗，請重試。',
    connecting: '連接中...',
    connected: '已連接',
    disconnected: '已斷線'
  },

  // Message Rating
  rating: {
    like: '讚',
    dislike: '不讚',
    reason: '不讚的原因',
    reasonPlaceholder: '請說明您不喜歡這個回應的原因...',
    reasonRequired: '請提供您不讚的原因',
    ratingSuccess: '評分提交成功',
    ratingError: '評分提交失敗',
    reasons: {
      incorrect: '回應包含錯誤或虛假資訊',
      irrelevant: '回應與我的問題不相關',
      unclear: '回應不清楚或令人困惑',
      incomplete: '回應不完整或缺少重要細節',
      generic: '回應過於籠統或不夠具體',
      inappropriate: '回應不當或具冒犯性',
      other: '其他（請在下方說明）'
    }
  },

  // System Metrics
  metrics: {
    title: '系統指標',
    totalUsers: '總使用者數',
    totalChats: '總聊天數',
    totalMessages: '總訊息數',
    averageRating: '平均評分',
    refreshMetrics: '重新整理指標'
  },

  // Errors
  errors: {
    generic: '發生錯誤，請重試。',
    network: '網路錯誤，請檢查您的連線。',
    unauthorized: '您沒有權限執行此操作。',
    notFound: '找不到請求的資源。',
    serverError: '伺服器錯誤，請稍後重試。',
    validationError: '請檢查您的輸入並重試。'
  }
};