import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../api'
import { formatDistanceToNow, format, parseISO, differenceInHours } from 'date-fns'

const STATUSES = ['Claimed', 'Call Scheduled', 'Call Completed', 'Follow-up Needed']
const CONCENTRATIONS = [
  'Business Fundamentals', 'Finance', 'Marketing & Sales',
  'Operations & Supply Chain Management', 'Strategy & Leadership',
  'Technology Development & Commercialization', 'Data Analytics & Decision Making',
  'Energy & Environment', 'Other / Undecided',
]

// ─── Profile Tab ────────────────────────────────────────────────────────────

function ProfileTab({ ambassador, onSave }) {
  const [form, setForm] = useState({
    name: ambassador.name || '',
    undergrad_background: ambassador.undergrad_background || '',
    concentration: ambassador.concentration || '',
    linkedin_url: ambassador.linkedin_url || '',
    scheduling_link: ambassador.scheduling_link || '',
    tags: ambassador.tags?.length ? ambassador.tags : ['', '', ''],
    availability_status: ambassador.availability_status || 'Active',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(ambassador.photo_url || '')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function updateTag(i, value) {
    const tags = [...form.tags]
    while (tags.length < 3) tags.push('')
    tags[i] = value
    update('tags', tags)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const cleanTags = form.tags.filter(t => t.trim())
      await api.put('/ambassadors/me', { ...form, tags: cleanTags })
      setSaved(true)
      onSave()
    } catch {}
    setSaving(false)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const fd = new FormData()
    fd.append('photo', file)
    try {
      const { data } = await api.post('/ambassadors/me/photo', fd)
      setPhotoUrl(data.photo_url)
    } catch {}
    setPhotoUploading(false)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-gray-900 mb-6">My Profile</h2>

      {/* Photo */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-duke-blue overflow-hidden flex items-center justify-center flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-2xl font-bold">{form.name?.[0]}</span>
          )}
        </div>
        <div>
          <label className="btn-secondary cursor-pointer text-sm inline-block">
            {photoUploading ? 'Uploading...' : 'Upload Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={ambassador.email} readOnly />
          </div>
        </div>

        <div>
          <label className="label">Undergraduate Background</label>
          <input className="input" placeholder="e.g. Computer Science, UNC Chapel Hill" value={form.undergrad_background}
            onChange={e => update('undergrad_background', e.target.value)} />
        </div>

        <div>
          <label className="label">MEM Concentration</label>
          <select className="input" value={form.concentration} onChange={e => update('concentration', e.target.value)}>
            <option value="">Select...</option>
            {CONCENTRATIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">LinkedIn URL</label>
            <input className="input" placeholder="https://linkedin.com/in/..." value={form.linkedin_url}
              onChange={e => update('linkedin_url', e.target.value)} />
          </div>
          <div>
            <label className="label">Scheduling Link</label>
            <input className="input" placeholder="Calendly / Zcal / Topmate link" value={form.scheduling_link}
              onChange={e => update('scheduling_link', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Tags <span className="text-gray-400 font-normal">(up to 3, e.g. "International Student", "PM Track")</span></label>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <input key={i} className="input" placeholder={`Tag ${i + 1}`}
                value={form.tags[i] || ''} onChange={e => updateTag(i, e.target.value)} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Availability Status</label>
          <div className="flex gap-3">
            {['Active', 'Busy', 'On Break'].map(s => (
              <label key={s} className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors text-sm font-medium',
                form.availability_status === s
                  ? s === 'Active' ? 'bg-green-50 border-green-400 text-green-700'
                    : s === 'Busy' ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                    : 'bg-gray-100 border-gray-400 text-gray-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              ].join(' ')}>
                <input type="radio" name="status" value={s} checked={form.availability_status === s}
                  onChange={() => update('availability_status', s)} className="sr-only" />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          {saved && <span className="text-green-600 text-sm">Saved!</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Request Board Tab ────────────────────────────────────────────────────────

function RequestBoardTab({ ambassador }) {
  const [requests, setRequests] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [claimingId, setClaimingId] = useState(null)
  const [confirmOvercap, setConfirmOvercap] = useState(null)
  const [postClaim, setPostClaim] = useState(null)

  const fetchRequests = useCallback(async () => {
    const [boardRes, mineRes] = await Promise.all([
      api.get('/requests'),
      api.get('/requests/mine'),
    ])
    setRequests(boardRes.data)
    setMyRequests(mineRes.data)
  }, [])

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 15000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const activeCount = myRequests.filter(r =>
    ['Claimed', 'Call Scheduled', 'Follow-up Needed'].includes(r.status)
  ).length

  function isPriority(req) {
    return (req.preferred_ambassadors || []).includes(ambassador.id)
  }

  function isUrgent(req) {
    return differenceInHours(new Date(), parseISO(req.created_at)) >= 48
  }

  const sorted = [...requests].sort((a, b) => {
    if (isPriority(a) && !isPriority(b)) return -1
    if (!isPriority(a) && isPriority(b)) return 1
    return new Date(a.created_at) - new Date(b.created_at)
  })

  async function doClaim(requestId) {
    setClaimingId(requestId)
    try {
      const { data } = await api.post(`/requests/${requestId}/claim`)
      setPostClaim(data)
      fetchRequests()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not claim request')
    }
    setClaimingId(null)
    setConfirmOvercap(null)
  }

  function handleClaim(req) {
    if (activeCount >= 3) {
      setConfirmOvercap(req)
    } else {
      doClaim(req.request_id)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Open Requests</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          Auto-refreshes every 15s
        </span>
      </div>

      {activeCount >= 3 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-4">
          You have {activeCount} active requests. Consider completing some before claiming more.
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No open requests right now.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map(req => {
            const priority = isPriority(req)
            const urgent = isUrgent(req)
            return (
              <div key={req.request_id} className={[
                'card p-4 transition-all',
                priority ? 'border-duke-blue border-l-4' : '',
                urgent ? 'border-red-300' : '',
              ].join(' ')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{req.prospect_name}</span>
                      {priority && (
                        <span className="text-xs bg-duke-blue text-white px-2 py-0.5 rounded-full">Preferred pick</span>
                      )}
                      {req.status === 'Waiting for Preferred' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Waiting for preferred</span>
                      )}
                      {urgent && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Urgent</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{req.prospect_email}</p>
                    {req.concentration && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Concentration:</span> {req.concentration}
                      </p>
                    )}
                    {req.message && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.message}</p>
                    )}
                    {req.availability_slots?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Available:</p>
                        <div className="flex flex-wrap gap-1">
                          {req.availability_slots.slice(0, 4).map((slot, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {format(new Date(slot.date + 'T12:00:00'), 'MMM d')}
                              {slot.times?.length > 0 && ` (${slot.times.length} slots)`}
                            </span>
                          ))}
                          {req.availability_slots.length > 4 && (
                            <span className="text-xs text-gray-400">+{req.availability_slots.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(parseISO(req.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaim(req)}
                    disabled={claimingId === req.request_id}
                    className="btn-primary text-sm flex-shrink-0"
                  >
                    {claimingId === req.request_id ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Overcap confirmation modal */}
      {confirmOvercap && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">You have {activeCount} active requests</h3>
            <p className="text-sm text-gray-500 mb-4">
              Claiming more requests may affect your ability to give each prospect proper attention. Continue anyway?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOvercap(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => doClaim(confirmOvercap.request_id)} className="btn-primary flex-1">Claim Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Post-claim panel */}
      {postClaim && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 mb-1">Request Claimed!</h3>
            <p className="text-sm text-gray-500 mb-4">Here are the prospect's details.</p>

            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Name:</span> {postClaim.prospect_name}</div>
              <div><span className="font-medium">Email:</span> {postClaim.prospect_email}</div>
              {postClaim.concentration && <div><span className="font-medium">Concentration:</span> {postClaim.concentration}</div>}
              {postClaim.message && (
                <div>
                  <span className="font-medium">Message:</span>
                  <p className="text-gray-600 mt-0.5">{postClaim.message}</p>
                </div>
              )}
              {postClaim.availability_slots?.length > 0 && (
                <div>
                  <span className="font-medium">Availability:</span>
                  <div className="mt-1 space-y-1">
                    {postClaim.availability_slots.map((slot, i) => (
                      <div key={i} className="bg-gray-50 rounded px-3 py-1.5">
                        <span className="font-medium">{format(new Date(slot.date + 'T12:00:00'), 'EEEE, MMMM d')}</span>
                        {slot.times?.length > 0 && (
                          <span className="text-gray-500 ml-2">{slot.times.join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ambassador.scheduling_link && (
                <div>
                  <span className="font-medium">Your scheduling link:</span>
                  <a href={ambassador.scheduling_link} target="_blank" rel="noopener noreferrer"
                    className="text-duke-blue hover:underline block truncate mt-0.5">
                    {ambassador.scheduling_link}
                  </a>
                </div>
              )}
            </div>

            <button onClick={() => setPostClaim(null)} className="btn-primary w-full mt-5">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── My Requests Tab ──────────────────────────────────────────────────────────

function MyRequestsTab() {
  const [requests, setRequests] = useState([])
  const [saving, setSaving] = useState({})
  const [edits, setEdits] = useState({})

  useEffect(() => {
    api.get('/requests/mine').then(res => {
      setRequests(res.data)
      const initial = {}
      res.data.forEach(r => {
        initial[r.request_id] = {
          status: r.status,
          notes: r.notes || '',
          scheduled_call_datetime: r.scheduled_call_datetime || '',
        }
      })
      setEdits(initial)
    })
  }, [])

  function updateEdit(requestId, field, value) {
    setEdits(e => ({ ...e, [requestId]: { ...e[requestId], [field]: value } }))
  }

  async function saveRequest(requestId) {
    setSaving(s => ({ ...s, [requestId]: true }))
    try {
      await api.put(`/requests/${requestId}`, edits[requestId])
      setRequests(prev => prev.map(r =>
        r.request_id === requestId ? { ...r, ...edits[requestId] } : r
      ))
    } catch {}
    setSaving(s => ({ ...s, [requestId]: false }))
  }

  if (requests.length === 0) return (
    <div className="card p-12 text-center text-gray-400">You haven't claimed any requests yet.</div>
  )

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">My Requests</h2>
      <div className="space-y-4">
        {requests.map(req => {
          const edit = edits[req.request_id] || {}
          const statusColor = {
            'Claimed': 'bg-blue-100 text-blue-700',
            'Call Scheduled': 'bg-purple-100 text-purple-700',
            'Call Completed': 'bg-green-100 text-green-700',
            'Follow-up Needed': 'bg-orange-100 text-orange-700',
          }[req.status] || 'bg-gray-100 text-gray-600'

          return (
            <div key={req.request_id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{req.prospect_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{req.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{req.prospect_email}</p>
                  {req.concentration && <p className="text-sm text-gray-500">{req.concentration}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{req.request_id}</span>
              </div>

              {req.message && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-sm text-gray-600">
                  {req.message}
                </div>
              )}

              {req.availability_slots?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">Prospect availability:</p>
                  <div className="flex flex-wrap gap-1">
                    {req.availability_slots.map((slot, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-duke-blue px-2 py-1 rounded">
                        {format(new Date(slot.date + 'T12:00:00'), 'MMM d')}
                        {slot.times?.length > 0 && `: ${slot.times.join(', ')}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={edit.status || req.status}
                    onChange={e => updateEdit(req.request_id, 'status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Scheduled Call Date & Time</label>
                  <input type="datetime-local" className="input"
                    value={edit.scheduled_call_datetime || ''}
                    onChange={e => updateEdit(req.request_id, 'scheduled_call_datetime', e.target.value)} />
                </div>
              </div>

              <div className="mb-3">
                <label className="label">Notes</label>
                <textarea className="input resize-none min-h-20" placeholder="Add notes about this request..."
                  value={edit.notes || ''}
                  onChange={e => updateEdit(req.request_id, 'notes', e.target.value)} />
              </div>

              {req.feedback_rating && (
                <div className="bg-green-50 rounded-lg px-3 py-2 mb-3 text-sm">
                  <span className="font-medium text-green-800">Feedback received:</span>{' '}
                  {'★'.repeat(req.feedback_rating)}{'☆'.repeat(5 - req.feedback_rating)}{' '}
                  {req.feedback_text && <span className="text-gray-600 ml-1">"{req.feedback_text}"</span>}
                </div>
              )}

              <button onClick={() => saveRequest(req.request_id)} disabled={saving[req.request_id]}
                className="btn-primary text-sm">
                {saving[req.request_id] ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

const TABS = ['Request Board', 'My Requests', 'Profile']

export default function AmbassadorPortal() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Request Board')
  const [ambassador, setAmbassador] = useState(user?.ambassador)

  async function refreshAmbassador() {
    const { data } = await api.get('/ambassadors/me')
    setAmbassador(data)
  }

  if (!ambassador) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Ambassador Portal" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Status badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-duke-blue flex items-center justify-center overflow-hidden">
            {ambassador.photo_url ? (
              <img src={ambassador.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold">{ambassador.name?.[0]}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{ambassador.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ambassador.availability_status === 'Active' ? 'bg-green-100 text-green-700' :
              ambassador.availability_status === 'Busy' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {ambassador.availability_status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm transition-colors ${tab === t ? 'tab-active' : 'tab-inactive'}`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'Request Board' && <RequestBoardTab ambassador={ambassador} />}
        {tab === 'My Requests' && <MyRequestsTab />}
        {tab === 'Profile' && <ProfileTab ambassador={ambassador} onSave={refreshAmbassador} />}
      </div>
    </div>
  )
}
