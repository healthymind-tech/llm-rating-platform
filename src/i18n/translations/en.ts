export const en = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    back: 'Back',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    submit: 'Submit',
    reset: 'Reset',
    actions: 'Actions',
    saving: 'Saving...'
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    chat: 'Chat',
    history: 'History',
    settings: 'Settings',
    logout: 'Logout',
    login: 'Login'
  },

  // Authentication
  auth: {
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    email: 'Email',
    loginButton: 'Sign In',
    loginFailed: 'Login failed. Please check your credentials.',
    emailRequired: 'Email and password are required',
    invalidCredentials: 'Invalid credentials',
    accessDenied: 'Access denied. Admin privileges required.',
    sessionExpired: 'Session expired. Please login again.'
  },

  // Admin Dashboard
  admin: {
    title: 'Admin Dashboard',
    subtitle: 'Manage users, configurations, and monitor system performance',
    systemOverview: 'System Overview',
    chatHistory: 'Chat History',
    userManagement: 'User Management',
    systemSettings: 'System Settings',
    llmConfiguration: 'LLM Configuration',
    
    // User Management
    users: {
      title: 'Manage Users',
      addUser: 'Add User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      username: 'Username',
      email: 'Email',
      role: 'Role',
      created: 'Created',
      lastLogin: 'Last Login',
      admin: 'Admin',
      user: 'User'
    },

    // System Settings
    settings: {
      title: 'System Settings',
      language: 'System Language',
      theme: 'Default Theme',
      chatRetention: 'Chat History Retention (days)',
      userRegistration: 'Enable User Registration',
      maxMessageLength: 'Maximum Message Length',
      updateSettings: 'Update Settings',
      settingsUpdated: 'Settings updated successfully'
    },

    // LLM Configuration
    llm: {
      title: 'LLM Configurations',
      addConfig: 'Add Configuration',
      editConfig: 'Edit Configuration',
      deleteConfig: 'Delete Configuration',
      name: 'Configuration Name',
      type: 'Type',
      model: 'Model',
      temperature: 'Temperature',
      maxTokens: 'Max Tokens',
      active: 'Active',
      apiKey: 'API Key',
      endpoint: 'Endpoint URL',
      fetchModels: 'Fetch Models',
      testConfig: 'Test Configuration',
      testing: 'Testing...',
      testSuccess: 'Configuration test successful!',
      testFailed: 'Configuration test failed'
    }
  },

  // Chat Interface
  chat: {
    title: 'Chat Interface',
    newChat: 'New Chat',
    sendMessage: 'Send Message',
    typeMessage: 'Type your message...',
    noMessages: 'No messages yet. Start a conversation!',
    errorSending: 'Failed to send message. Please try again.',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected'
  },

  // Message Rating
  rating: {
    like: 'Like',
    dislike: 'Dislike',
    prompt: 'Rate this response:',
    ratingPrompt: 'Please rate the AI response before continuing',
    reason: 'Reason for dislike',
    reasonPlaceholder: 'Please explain why you disliked this response...',
    reasonRequired: 'Please provide a reason for your dislike',
    ratingSuccess: 'Rating submitted successfully',
    ratingError: 'Failed to submit rating',
    reasons: {
      incorrect: 'The response was incorrect or contained false information',
      irrelevant: 'The response was not relevant to my question',
      unclear: 'The response was unclear or confusing',
      incomplete: 'The response was incomplete or missing important details',
      generic: 'The response was too generic or not specific enough',
      inappropriate: 'The response was inappropriate or offensive',
      other: 'Other (specify below)'
    }
  },

  // System Metrics
  metrics: {
    title: 'System Metrics',
    totalUsers: 'Total Users',
    totalChats: 'Total Chats',
    totalMessages: 'Total Messages',
    averageRating: 'Average Rating',
    refreshMetrics: 'Refresh Metrics'
  },

  // User Profile
  profile: {
    title: 'User Profile',
    description: 'Please provide your body information to help us give you personalized recommendations.',
    height: 'Height',
    weight: 'Weight',
    bodyFat: 'Body Fat Percentage',
    bodyFatOptional: '(Optional)',
    lifestyleHabits: 'Lifestyle Habits',
    lifestyleExample: 'e.g., workout 3x/week, long sitting at work, etc.',
    heightError: 'Height must be between 1 and 300 cm',
    weightError: 'Weight must be between 1 and 500 kg',
    bodyFatError: 'Body fat must be between 0 and 50%',
    lifestyleError: 'Please describe your lifestyle habits',
    updateError: 'Failed to update profile. Please try again.',
    updateSuccess: 'Profile updated successfully!'
  },

  // Errors
  errors: {
    generic: 'An error occurred. Please try again.',
    network: 'Network error. Please check your connection.',
    unauthorized: 'You are not authorized to perform this action.',
    notFound: 'The requested resource was not found.',
    serverError: 'Server error. Please try again later.',
    validationError: 'Please check your input and try again.'
  }
};