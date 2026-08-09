import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { Search, Loader2, RefreshCw, Shield } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  STATUS_CHANGE: 'bg-amber-100 text-amber-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  EXPORT: 'bg-gray-100 text-gray-600',
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, size: 20 }
      if (search) params.search = search
      const res = await axiosInstance.get('/api/v1/admin/audit-logs', { params })
      const d = res.data.data
      setLogs(d.content || [])
      setTotalPages(d.totalPages || 0)
      setTotalElements(d.totalElements || 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <>
      <Helmet><title>Audit Logs | Admin</title></Helmet>
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">{totalElements.toLocaleString('en-IN')} total entries</p>
          </div>
          <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search by action, entity, admin..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-blue" /></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Shield size={14} className="text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                        <span className="text-sm font-medium text-gray-800 truncate">{log.entityType} · {log.entityId?.substring(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-gray-500 truncate">{log.description}</p>
                        <p className="text-xs text-gray-400 flex-shrink-0">{log.adminEmail}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
                  </div>
                  {expanded === log.id && log.changes && (
                    <div className="mt-3 ml-11 bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Changes:</p>
                      <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">{typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Shield size={40} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">No audit logs found.</p>
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {page * 20 + 1}–{Math.min((page + 1) * 20, totalElements)} of {totalElements}</p>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Previous</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
