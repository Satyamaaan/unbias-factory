'use client'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { logger, type LogEntry } from "@/lib/logger"

interface LogViewerProps {
  isOpen: boolean
  onClose: () => void
  maxHeight?: string
  showExportOptions?: boolean
}

export function LogViewer({ 
  isOpen, 
  onClose, 
  maxHeight = "400px",
  showExportOptions = true 
}: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      refreshLogs()
    }
  }, [isOpen])

  useEffect(() => {
    if (!autoRefresh || !isOpen) return

    const interval = setInterval(refreshLogs, 2000) // Refresh every 2 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, isOpen])

  const refreshLogs = () => {
    const allLogs = logger.getLogs()
    setLogs(allLogs)
  }

  const filteredLogs = useMemo(() => {
    let filtered = logs

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(log => log.category === selectedCategory)
    }

    // Filter by level
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(log => log.level === selectedLevel)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.category.toLowerCase().includes(term) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(term))
      )
    }

    return filtered.slice(-100) // Show last 100 logs
  }, [logs, selectedCategory, selectedLevel, searchTerm])

  const categories = useMemo(() => {
    const cats = ['ALL', ...new Set(logs.map(log => log.category))]
    return cats.sort()
  }, [logs])

  const levels = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'DEBUG': return 'bg-gray-100 text-gray-800'
      case 'INFO': return 'bg-blue-100 text-blue-800'
      case 'WARN': return 'bg-yellow-100 text-yellow-800'
      case 'ERROR': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  }

  const exportLogs = (format: 'json' | 'csv' | 'txt') => {
    let content = ''
    let filename = `logs-${new Date().toISOString().split('T')[0]}`
    let mimeType = 'text/plain'

    switch (format) {
      case 'json':
        content = JSON.stringify(filteredLogs, null, 2)
        filename += '.json'
        mimeType = 'application/json'
        break
      case 'csv':
        const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'sessionId']
        const csvRows = [
          headers.join(','),
          ...filteredLogs.map(log => [
            log.timestamp,
            log.level,
            log.category,
            `"${log.message.replace(/"/g, '""')}"`,
            log.userId || '',
            log.sessionId || ''
          ].join(','))
        ]
        content = csvRows.join('\n')
        filename += '.csv'
        mimeType = 'text/csv'
        break
      case 'txt':
        content = filteredLogs.map(log => 
          `[${log.timestamp}] ${log.level} ${log.category}: ${log.message}${
            log.data ? '\n  Data: ' + JSON.stringify(log.data) : ''
          }`
        ).join('\n\n')
        filename += '.txt'
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    logger.clearLogs()
    refreshLogs()
    setExpandedLogs(new Set())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <span>Log Viewer</span>
            <Badge variant="outline">{filteredLogs.length} logs</Badge>
            {autoRefresh && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            
            <Button size="sm" onClick={refreshLogs} variant="outline">
              Refresh
            </Button>
            
            <Button size="sm" onClick={clearLogs} variant="destructive">
              Clear
            </Button>
          </div>

          {/* Export Options */}
          {showExportOptions && (
            <div className="flex gap-2">
              <span className="text-sm text-gray-600">Export:</span>
              <Button size="sm" variant="outline" onClick={() => exportLogs('json')}>
                JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportLogs('csv')}>
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportLogs('txt')}>
                TXT
              </Button>
            </div>
          )}

          {/* Logs Display */}
          <div 
            className="space-y-2 overflow-auto border rounded-lg p-4"
            style={{ maxHeight }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs match the current filters
              </div>
            ) : (
              filteredLogs.reverse().map((log, index) => {
                const isExpanded = expandedLogs.has(index)
                
                return (
                  <Card key={index} className="p-3 hover:bg-gray-50 transition-colors">
                    <div 
                      className="cursor-pointer"
                      onClick={() => toggleLogExpansion(index)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          <Badge className={getLevelColor(log.level)}>
                            {log.level}
                          </Badge>
                          <Badge variant="outline">{log.category}</Badge>
                          <span className="text-xs text-gray-500">
                            {formatTime(log.timestamp)}
                          </span>
                          {log.data && (
                            <Badge variant="secondary" className="text-xs">
                              +data
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {log.userId && (
                            <span className="text-xs font-mono text-gray-500">
                              {log.userId.slice(0, 8)}...
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm font-medium">{log.message}</div>
                      
                      {isExpanded && log.data && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <pre className="overflow-auto max-h-32">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Total: {logs.length}</span>
            <span>Errors: {logs.filter(l => l.level === 'ERROR').length}</span>
            <span>Warnings: {logs.filter(l => l.level === 'WARN').length}</span>
            <span>Categories: {categories.length - 1}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}