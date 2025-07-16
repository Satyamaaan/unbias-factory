interface LogLevel {
  DEBUG: 0
  INFO: 1
  WARN: 2
  ERROR: 3
}

interface LogEntry {
  timestamp: string
  level: keyof LogLevel
  category: string
  message: string
  data?: Record<string, unknown>
  userId?: string
  sessionId?: string
  source?: string
  correlationId?: string
}

interface LoggerConfig {
  maxLogs: number
  logLevel: keyof LogLevel
  enableConsole: boolean
  enableStorage: boolean
  enableRemoteLogging: boolean
  remoteEndpoint?: string
}

class Logger {
  private logs: LogEntry[] = []
  private config: LoggerConfig = {
    maxLogs: 2000,
    logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO',
    enableConsole: process.env.NODE_ENV === 'development',
    enableStorage: true,
    enableRemoteLogging: false
  }
  
  private levels: LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }

  private correlationId: string = ''
  private isClient: boolean = false

  constructor(config?: Partial<LoggerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    // Only initialize client-side features if running in browser
    if (typeof window !== 'undefined') {
      this.isClient = true
      this.correlationId = this.generateCorrelationId()
      this.loadPersistedLogs()
      
      // Set up periodic cleanup
      setInterval(() => this.cleanup(), 60000) // Every minute
    } else {
      // Server-side: use a static correlation ID
      this.correlationId = 'server-' + Date.now()
    }
  }

  private generateCorrelationId(): string {
    if (typeof window === 'undefined') {
      return 'server-' + Date.now()
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return this.levels[level] >= this.levels[this.config.logLevel]
  }

  private createLogEntry(
    level: keyof LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    userId?: string,
    sessionId?: string,
    source?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userId,
      sessionId,
      source: source || this.getCallerInfo(),
      correlationId: this.correlationId
    }
  }

  private getCallerInfo(): string {
    try {
      const stack = new Error().stack
      if (!stack) return 'unknown'
      
      const lines = stack.split('\n')
      // Skip the first few lines (Error, this function, addLog, public method)
      const callerLine = lines[4] || lines[3] || lines[2]
      
      // Extract file and line number
      const match = callerLine.match(/at\s+(?:.*\s+)?\(?([^)]+)\)?$/)
      if (match) {
        const location = match[1]
        // Simplify the path for readability
        return location.replace(process.cwd?.() || '', '').replace(/^\//, '')
      }
      
      return 'unknown'
    } catch {
      return 'unknown'
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)
    
    // Keep only the most recent logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs)
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry)
    }

    // Persist to storage
    if (this.config.enableStorage) {
      this.persistLogs()
    }

    // Send to remote logging service
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(entry)
    }
  }

  private outputToConsole(entry: LogEntry) {
    const style = this.getConsoleStyle(entry.level)
    const prefix = `[${entry.level}] ${entry.category}`
    const suffix = entry.source ? ` (${entry.source})` : ''
    
    console.log(
      `%c${prefix}: ${entry.message}${suffix}`,
      style,
      entry.data || ''
    )
  }

  private getConsoleStyle(level: keyof LogLevel): string {
    switch (level) {
      case 'DEBUG': return 'color: #6b7280; font-size: 11px'
      case 'INFO': return 'color: #3b82f6; font-weight: normal'
      case 'WARN': return 'color: #f59e0b; font-weight: bold'
      case 'ERROR': return 'color: #ef4444; font-weight: bold; background: #fef2f2; padding: 2px 4px'
      default: return ''
    }
  }

  private persistLogs() {
    if (typeof window === 'undefined') return
    
    try {
      // Only persist recent logs to avoid localStorage bloat
      const recentLogs = this.logs.slice(-500)
      localStorage.setItem('app_logs', JSON.stringify(recentLogs))
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  private loadPersistedLogs() {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('app_logs')
      if (stored) {
        const parsedLogs = JSON.parse(stored)
        if (Array.isArray(parsedLogs)) {
          this.logs = parsedLogs
        }
      }
    } catch {
      // Silently fail if localStorage is not available or data is corrupted
    }
  }

  private async sendToRemote(entry: LogEntry) {
    try {
      if (!this.config.remoteEndpoint) return
      
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      })
    } catch {
      // Silently fail for remote logging to avoid infinite loops
    }
  }

  private cleanup() {
    // Remove logs older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    this.logs = this.logs.filter(log => log.timestamp > oneDayAgo)
    
    // Persist cleaned logs
    if (this.config.enableStorage) {
      this.persistLogs()
    }
  }

  // Public logging methods
  debug(category: string, message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    if (!this.shouldLog('DEBUG')) return
    this.addLog(this.createLogEntry('DEBUG', category, message, data, userId, sessionId))
  }

  info(category: string, message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    if (!this.shouldLog('INFO')) return
    this.addLog(this.createLogEntry('INFO', category, message, data, userId, sessionId))
  }

  warn(category: string, message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    if (!this.shouldLog('WARN')) return
    this.addLog(this.createLogEntry('WARN', category, message, data, userId, sessionId))
  }

  error(category: string, message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    if (!this.shouldLog('ERROR')) return
    this.addLog(this.createLogEntry('ERROR', category, message, data, userId, sessionId))
  }

  // Specialized logging methods
  authDebug(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.debug('AUTH', message, data, userId, sessionId)
  }

  authInfo(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.info('AUTH', message, data, userId, sessionId)
  }

  authWarn(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.warn('AUTH', message, data, userId, sessionId)
  }

  authError(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.error('AUTH', message, data, userId, sessionId)
  }

  apiDebug(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.debug('API', message, data, userId, sessionId)
  }

  apiInfo(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.info('API', message, data, userId, sessionId)
  }

  apiWarn(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.warn('API', message, data, userId, sessionId)
  }

  apiError(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.error('API', message, data, userId, sessionId)
  }

  uiDebug(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.debug('UI', message, data, userId, sessionId)
  }

  uiInfo(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.info('UI', message, data, userId, sessionId)
  }

  uiWarn(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.warn('UI', message, data, userId, sessionId)
  }

  uiError(message: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
    this.error('UI', message, data, userId, sessionId)
  }

  // Query and analysis methods
  getLogs(category?: string, level?: keyof LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category)
    }

    if (level) {
      const minLevel = this.levels[level]
      filteredLogs = filteredLogs.filter(log => this.levels[log.level] >= minLevel)
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit)
    }

    return filteredLogs
  }

  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.category.toLowerCase().includes(lowerQuery) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerQuery))
    )
  }

  getLogsByTimeRange(startTime: string, endTime: string): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    )
  }

  getLogsByUser(userId: string): LogEntry[] {
    return this.logs.filter(log => log.userId === userId)
  }

  getLogsBySession(sessionId: string): LogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId)
  }

  getLogsByCorrelation(correlationId: string): LogEntry[] {
    return this.logs.filter(log => log.correlationId === correlationId)
  }

  // Export and analysis
  exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'csv':
        const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'sessionId', 'source']
        const csvRows = [
          headers.join(','),
          ...this.logs.map(log => [
            log.timestamp,
            log.level,
            log.category,
            `"${log.message.replace(/"/g, '""')}"`,
            log.userId || '',
            log.sessionId || '',
            log.source || ''
          ].join(','))
        ]
        return csvRows.join('\n')
      
      case 'txt':
        return this.logs.map(log => 
          `[${log.timestamp}] ${log.level} ${log.category}: ${log.message}${
            log.data ? '\n  Data: ' + JSON.stringify(log.data) : ''
          }${log.source ? '\n  Source: ' + log.source : ''}`
        ).join('\n\n')
      
      case 'json':
      default:
        return JSON.stringify(this.logs, null, 2)
    }
  }

  clearLogs() {
    this.logs = []
    this.info('SYSTEM', 'Logs cleared')
    if (this.config.enableStorage) {
      localStorage.removeItem('app_logs')
    }
  }

  // Session and user analysis
  getSessionSummary(sessionId: string): {
    totalLogs: number
    errorCount: number
    warnCount: number
    lastActivity: string
    categories: string[]
    duration: number
    correlationIds: string[]
  } {
    const sessionLogs = this.logs.filter(log => log.sessionId === sessionId)
    
    const firstLog = sessionLogs[0]
    const lastLog = sessionLogs[sessionLogs.length - 1]
    const duration = firstLog && lastLog ? 
      new Date(lastLog.timestamp).getTime() - new Date(firstLog.timestamp).getTime() : 0
    
    return {
      totalLogs: sessionLogs.length,
      errorCount: sessionLogs.filter(log => log.level === 'ERROR').length,
      warnCount: sessionLogs.filter(log => log.level === 'WARN').length,
      lastActivity: lastLog?.timestamp || 'No activity',
      categories: [...new Set(sessionLogs.map(log => log.category))],
      duration,
      correlationIds: [...new Set(sessionLogs.map(log => log.correlationId).filter((id): id is string => Boolean(id)))]
    }
  }

  getUserActivity(userId: string): {
    totalSessions: number
    totalLogs: number
    errorRate: number
    mostActiveCategory: string
    lastSeen: string
  } {
    const userLogs = this.logs.filter(log => log.userId === userId)
    const sessions = new Set(userLogs.map(log => log.sessionId).filter((id): id is string => Boolean(id)))
    
    const categoryCount = userLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostActiveCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    
    return {
      totalSessions: sessions.size,
      totalLogs: userLogs.length,
      errorRate: userLogs.filter(log => log.level === 'ERROR').length / userLogs.length,
      mostActiveCategory,
      lastSeen: userLogs[userLogs.length - 1]?.timestamp || 'Never'
    }
  }

  // Performance monitoring
  startTimer(label: string): () => void {
    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      this.info('PERFORMANCE', `${label} completed`, { duration: `${duration.toFixed(2)}ms` })
      return duration
    }
  }

  // Configuration
  updateConfig(newConfig: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.info('SYSTEM', 'Logger configuration updated', newConfig)
  }

  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  // Health check
  getHealth(): {
    totalLogs: number
    oldestLog: string
    newestLog: string
    memoryUsage: number
    categoriesCount: number
    errorsInLastHour: number
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentErrors = this.logs.filter(log => 
      log.level === 'ERROR' && log.timestamp > oneHourAgo
    )
    
    return {
      totalLogs: this.logs.length,
      oldestLog: this.logs[0]?.timestamp || 'None',
      newestLog: this.logs[this.logs.length - 1]?.timestamp || 'None',
      memoryUsage: JSON.stringify(this.logs).length,
      categoriesCount: new Set(this.logs.map(log => log.category)).size,
      errorsInLastHour: recentErrors.length
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export types
export type { LogEntry, LoggerConfig }

// Utility functions for common logging patterns
export function logAuthFlow(step: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
  logger.authInfo(`Auth flow: ${step}`, data, userId, sessionId)
}

export function logApiCall(endpoint: string, method: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
  logger.apiInfo(`${method} ${endpoint}`, data, userId, sessionId)
}

export function logError(category: string, error: Error, context?: Record<string, unknown>, userId?: string, sessionId?: string) {
  logger.error(category, error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  }, userId, sessionId)
}

export function logPerformance(operation: string, duration: number, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
  logger.info('PERFORMANCE', `${operation} completed in ${duration}ms`, data, userId, sessionId)
}

export function logUserAction(action: string, data?: Record<string, unknown>, userId?: string, sessionId?: string) {
  logger.uiInfo(`User action: ${action}`, data, userId, sessionId)
}

export function withLogging<T extends (...args: unknown[]) => unknown>(
  fn: T,
  category: string,
  operation: string
): T {
  return ((...args: unknown[]) => {
    const timer = logger.startTimer(`${category}:${operation}`)
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result
          .then(res => {
            timer()
            logger.debug(category, `${operation} completed successfully`)
            return res
          })
          .catch(err => {
            timer()
            logger.error(category, `${operation} failed`, { error: err.message })
            throw err
          })
      } else {
        timer()
        logger.debug(category, `${operation} completed successfully`)
        return result
      }
    } catch (error: unknown) {
      timer()
      logger.error(category, `${operation} failed`, { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }) as T
}