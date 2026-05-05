import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

const STATUSES = ['Open', 'Waiting for Preferred', 'Claimed', 'Call Scheduled', 'Call Completed', 'Follow-up Needed']
const CONCENTRATIONS = [
  'Business Fundamentals', 'Finance', 'Marketing & Sales',
  'Operations & Supply Chain Management', 'Strategy & Leadership',
  'Technology Development & Commercialization', 'Data Analytics & Decision Making',
  'Energy & Environment', 'Other / Undecided',
]
const STATUS_COLORS = {
  'Open': '#6B7280',
  'Waiting for Preferred': '#8B5CF6',
  'Claimed': '#3B82F6',
  'Call Scheduled': '#F59E0B',
  'Call Completed': '#10B981',
  'Follow-up Needed': '#F97316',
}
const CHART_COLORS = ['#003087', '#0680CD', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value ?? '–'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    api.get('/requests/analytics').then(res => setAnalytics(res.data))
  }, [])

  if (!analytics) return <p className="text-gray-400 text-sm">Loading...</p>

  const t = analytics.totals || {}
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Program Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Requests" value={t.total} />
        <StatCard label="Open" value={t.open} color="text-gray-600" />
        <StatCard label="In Progress" value={(t.claimed || 0) + (t.scheduled || 0)} color="text-blue-600" />
        <StatCard label="Completed" value={t.completed} color="text-green-600" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Waiting for Preferred" value={t.waiting} color="text-purple-600" />
        <StatCard label="Follow-up Needed" value={t.followup} color="text-orange-600" />
        <StatCard
          label="Avg Feedback Rating"
          value={analytics.avgRating ? `${Number(analytics.avgRating).toFixed(1)} / 5` : 'No ratings yet'}
          color="text-yellow-600"
        />
        <StatCard label="Ambassadors" value={analytics.ambassadorLoad?.length} />
      </div>

      {analytics.statusCounts?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Request Status Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {analytics.statusCounts.map(s => (
              <div key={s.status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[s.status] || '#ccc' }} />
                <span className="text-sm text-gray-600">{s.status}: <strong>{s.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Request Management Tab ───────────────────────────────────────────────────

function RequestManagementTab() {
  const [requests, setRequests] = useState([])
  const [ambassadors, setAmbassadors] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterConc, setFilterConc] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState({})

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterConc) params.set('concentration', filterConc)
    api.get('/requests?' + params).then(res => setRequests(res.data))
    api.get('/ambassadors').then(res => setAmbassadors(res.data))
  }, [filterStatus, filterConc])

  function updateEdit(id, field, val) {
    setEdits(e => ({ ...e, [id]: { ...e[id], [field]: val } }))
  }

  async function save(req) {
    setSaving(s => ({ ...s, [req.request_id]: true }))
    try {
      await api.put(`/requests/${req.request_id}`, edits[req.request_id])
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterConc) params.set('concentration', filterConc)
      const res = await api.get('/requests?' + params)
      setRequests(res.data)
    } catch {}
    setSaving(s => ({ ...s, [req.request_id]: false }))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={filterConc} onChange={e => setFilterConc(e.target.value)}>
          <option value="">All concentrations</option>
          {CONCENTRATIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center">{requests.length} requests</span>
      </div>

      <div className="space-y-2">
        {requests.map(req => {
          const edit = edits[req.request_id] || {}
          const isOpen = expanded === req.request_id

          return (
            <div key={req.request_id} className="card overflow-hidden">
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : req.request_id)
                  if (!edits[req.request_id]) {
                    setEdits(e => ({
                      ...e,
                      [req.request_id]: {
                        status: req.status,
                        notes: req.notes || '',
                        scheduled_call_datetime: req.scheduled_call_datetime || '',
                        claimed_by: req.claimed_by || '',
                      }
                    }))
                  }
                }}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-gray-900">{req.prospect_name}</span>
                  <span className="text-sm text-gray-400">{req.prospect_email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
                    style={{ background: STATUS_COLORS[req.status] + '20', color: STATUS_COLORS[req.status] }}>
                    {req.status}
                  </span>
                  {req.ambassador_name && (
                    <span className="text-xs text-gray-500">→ {req.ambassador_name}</span>
                  )}
                  {req.feedback_rating && (
                    <span className="text-xs text-yellow-600">{'★'.repeat(req.feedback_rating)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{req.concentration}</span>
                  <span>{formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}</span>
                  <span className="text-gray-300">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                  {req.message && (
                    <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100">
                      "{req.message}"
                    </div>
                  )}

                  {req.availability_slots?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Availability:</p>
                      <div className="flex flex-wrap gap-1">
                        {req.availability_slots.map((slot, i) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-1">
                            {format(new Date(slot.date + 'T12:00:00'), 'MMM d')}
                            {slot.times?.length > 0 && `: ${slot.times.join(', ')}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={edit.status || req.status}
                        onChange={e => updateEdit(req.request_id, 'status', e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Assigned Ambassador</label>
                      <select className="input" value={edit.claimed_by || req.claimed_by || ''}
                        onChange={e => updateEdit(req.request_id, 'claimed_by', e.target.value || null)}>
                        <option value="">Unassigned</option>
                        {ambassadors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Scheduled Call</label>
                      <input type="datetime-local" className="input"
                        value={edit.scheduled_call_datetime || ''}
                        onChange={e => updateEdit(req.request_id, 'scheduled_call_datetime', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input resize-none min-h-16" value={edit.notes || ''}
                      onChange={e => updateEdit(req.request_id, 'notes', e.target.value)} />
                  </div>

                  {req.feedback_rating !== null && req.feedback_rating !== undefined && (
                    <div className="bg-green-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-green-800">Feedback:</span>{' '}
                      {'★'.repeat(req.feedback_rating)}{'☆'.repeat(5 - req.feedback_rating)}
                      {req.feedback_text && <p className="text-gray-600 mt-1">"{req.feedback_text}"</p>}
                    </div>
                  )}

                  <button onClick={() => save(req)} disabled={saving[req.request_id]} className="btn-primary text-sm">
                    {saving[req.request_id] ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {requests.length === 0 && (
          <div className="card p-12 text-center text-gray-400">No requests match this filter.</div>
        )}
      </div>
    </div>
  )
}

// ─── Ambassador Management Tab ────────────────────────────────────────────────

function AmbassadorManagementTab() {
  const [ambassadors, setAmbassadors] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [newForm, setNewForm] = useState({ name: '', email: '', concentration: '', availability_status: 'Active' })
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    api.get('/ambassadors').then(res => setAmbassadors(res.data))
  }, [])

  async function addAmbassador() {
    if (!newForm.name || !newForm.email) return
    setSaving(true)
    try {
      await api.post('/ambassadors', newForm)
      const res = await api.get('/ambassadors')
      setAmbassadors(res.data)
      setShowAdd(false)
      setNewForm({ name: '', email: '', concentration: '', availability_status: 'Active' })
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add ambassador')
    }
    setSaving(false)
  }

  function startEdit(a) {
    setEditing(a.id)
    setEditForm({
      name: a.name, email: a.email, concentration: a.concentration || '',
      linkedin_url: a.linkedin_url || '', scheduling_link: a.scheduling_link || '',
      availability_status: a.availability_status || 'Active',
      tags: (a.tags || []).join(', '),
    })
  }

  async function saveEdit(id) {
    setSaving(true)
    const tags = editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    try {
      await api.put(`/ambassadors/${id}`, { ...editForm, tags })
      const res = await api.get('/ambassadors')
      setAmbassadors(res.data)
      setEditing(null)
    } catch {}
    setSaving(false)
  }

  async function deleteAmbassador(id) {
    if (!confirm('Delete this ambassador?')) return
    await api.delete(`/ambassadors/${id}`)
    setAmbassadors(a => a.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Ambassadors ({ambassadors.length})</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Ambassador</button>
      </div>

      {showAdd && (
        <div className="card p-4 mb-4 border-duke-blue border">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Ambassador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Duke Email *</label>
              <input className="input" type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Concentration</label>
              <select className="input" value={newForm.concentration} onChange={e => setNewForm(f => ({ ...f, concentration: e.target.value }))}>
                <option value="">Select...</option>
                {CONCENTRATIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={newForm.availability_status} onChange={e => setNewForm(f => ({ ...f, availability_status: e.target.value }))}>
                {['Active', 'Busy', 'On Break'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addAmbassador} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Adding...' : 'Add Ambassador'}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ambassadors.map(a => (
          <div key={a.id} className="card overflow-hidden">
            {editing === a.id ? (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="label">Name</label>
                    <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="label">Email</label>
                    <input className="input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="label">Concentration</label>
                    <select className="input" value={editForm.concentration} onChange={e => setEditForm(f => ({ ...f, concentration: e.target.value }))}>
                      <option value="">Select...</option>
                      {CONCENTRATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                  <div><label className="label">Status</label>
                    <select className="input" value={editForm.availability_status} onChange={e => setEditForm(f => ({ ...f, availability_status: e.target.value }))}>
                      {['Active', 'Busy', 'On Break'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  <div><label className="label">LinkedIn URL</label>
                    <input className="input" value={editForm.linkedin_url} onChange={e => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))} /></div>
                  <div><label className="label">Scheduling Link</label>
                    <input className="input" value={editForm.scheduling_link} onChange={e => setEditForm(f => ({ ...f, scheduling_link: e.target.value }))} /></div>
                </div>
                <div><label className="label">Tags (comma-separated)</label>
                  <input className="input" value={editForm.tags} placeholder="e.g. International Student, PM Track"
                    onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} /></div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(a.id)} disabled={saving} className="btn-primary text-sm">Save</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-duke-blue flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm">{a.name?.[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.availability_status === 'Active' ? 'bg-green-100 text-green-700' :
                      a.availability_status === 'Busy' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.availability_status}</span>
                    {a.tags?.map(t => <span key={t} className="text-xs bg-blue-50 text-duke-blue px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                  <p className="text-sm text-gray-500">{a.email}</p>
                  {a.concentration && <p className="text-xs text-gray-400">{a.concentration}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(a)} className="text-sm text-duke-blue hover:underline">Edit</button>
                  <button onClick={() => deleteAmbassador(a.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    api.get('/requests/analytics').then(res => setAnalytics(res.data))
  }, [])

  if (!analytics) return <p className="text-gray-400 text-sm">Loading...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.concentrationCounts?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Requests by Concentration</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.concentrationCounts} margin={{ left: -20 }}>
                <XAxis dataKey="concentration" tick={{ fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n, p) => [v, p.payload.concentration]} />
                <Bar dataKey="count" fill="#003087" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics.statusCounts?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analytics.statusCounts}
                  dataKey="count"
                  nameKey="status"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ status, percent }) => `${status.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {analytics.statusCounts.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics.ambassadorLoad?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Ambassador Load</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.ambassadorLoad} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" name="Active" fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics.feedbackStats?.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Feedback Ratings</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[1,2,3,4,5].map(r => ({
                rating: '★'.repeat(r),
                count: analytics.feedbackStats.find(f => f.feedback_rating === r)?.count || 0,
              }))} margin={{ left: -20 }}>
                <XAxis dataKey="rating" tick={{ fontSize: 14 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {analytics.avgRating && (
              <p className="text-center text-sm text-gray-500 mt-2">
                Average: <strong className="text-yellow-600">{Number(analytics.avgRating).toFixed(1)} / 5</strong>
              </p>
            )}
          </div>
        )}

        {analytics.volumeByDay?.length > 0 && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Request Volume (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={analytics.volumeByDay} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#003087" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {!analytics.concentrationCounts?.length && !analytics.statusCounts?.length && (
        <div className="card p-12 text-center text-gray-400">No data yet. Submit some requests to see analytics.</div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS = ['Overview', 'Request Management', 'Ambassador Management', 'Analytics']

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Admin Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm whitespace-nowrap transition-colors ${tab === t ? 'tab-active' : 'tab-inactive'}`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'Overview' && <OverviewTab />}
        {tab === 'Request Management' && <RequestManagementTab />}
        {tab === 'Ambassador Management' && <AmbassadorManagementTab />}
        {tab === 'Analytics' && <AnalyticsTab />}
      </div>
    </div>
  )
}
