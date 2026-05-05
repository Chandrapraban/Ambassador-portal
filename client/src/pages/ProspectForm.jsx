import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import AvailabilityPicker from '../components/AvailabilityPicker'

const CONCENTRATIONS = [
  'Business Fundamentals',
  'Finance',
  'Marketing & Sales',
  'Operations & Supply Chain Management',
  'Strategy & Leadership',
  'Technology Development & Commercialization',
  'Data Analytics & Decision Making',
  'Energy & Environment',
  'Other / Undecided',
]

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map(step => (
        <div key={step} className="flex items-center gap-2">
          <div className={[
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
            step < current ? 'bg-duke-blue text-white' :
            step === current ? 'bg-duke-blue text-white ring-4 ring-blue-100' :
            'bg-gray-200 text-gray-400'
          ].join(' ')}>
            {step < current ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : step}
          </div>
          {step < total && <div className={`h-px w-8 ${step < current ? 'bg-duke-blue' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function AmbassadorCard({ ambassador, selected, onToggle, disabled }) {
  const photoSrc = ambassador.photo_url || null

  return (
    <div
      onClick={() => !disabled && onToggle(ambassador.id)}
      className={[
        'card p-4 cursor-pointer transition-all',
        selected ? 'border-duke-blue ring-2 ring-duke-blue ring-opacity-50' : 'hover:border-gray-300',
        disabled && !selected ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-duke-blue flex-shrink-0 overflow-hidden flex items-center justify-center">
          {photoSrc ? (
            <img src={photoSrc} alt={ambassador.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{ambassador.name?.[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">{ambassador.name}</span>
            {selected && (
              <span className="text-duke-blue">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          {ambassador.concentration && (
            <p className="text-xs text-gray-500 mt-0.5">{ambassador.concentration}</p>
          )}
          {ambassador.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {ambassador.tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-50 text-duke-blue px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
          <span className={`inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded font-medium ${
            ambassador.availability_status === 'Active' ? 'bg-green-100 text-green-700' :
            ambassador.availability_status === 'Busy' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {ambassador.availability_status}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ProspectForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [ambassadors, setAmbassadors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    prospect_name: '',
    prospect_email: '',
    concentration: '',
    message: '',
    availability_slots: [],
    match_anyone: false,
    preferred_ambassadors: [],
  })

  useEffect(() => {
    api.get('/ambassadors').then(res => setAmbassadors(res.data))
  }, [])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleAmbassador(id) {
    const current = form.preferred_ambassadors
    if (current.includes(id)) {
      update('preferred_ambassadors', current.filter(x => x !== id))
    } else if (current.length < 3) {
      update('preferred_ambassadors', [...current, id])
    }
  }

  function validateStep1() {
    if (!form.prospect_name.trim()) return 'Please enter your name'
    if (!form.prospect_email.trim() || !form.prospect_email.includes('@')) return 'Please enter a valid email'
    if (!form.concentration) return 'Please select a concentration'
    return null
  }

  function validateStep2() {
    if (form.availability_slots.length === 0) return 'Please add at least one available date'
    const noTime = form.availability_slots.find(s => s.times.length === 0)
    if (noTime) return 'Please select at least one time slot for each selected date'
    return null
  }

  function validateStep3() {
    if (!form.match_anyone && form.preferred_ambassadors.length === 0) {
      return 'Please select at least one ambassador or choose "Match me with anyone"'
    }
    return null
  }

  function handleNext() {
    setError('')
    const validators = [null, validateStep1, validateStep2]
    const err = validators[step]?.()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    setError('')
    const err = validateStep3()
    if (err) { setError(err); return }
    setSubmitting(true)
    try {
      const { data } = await api.post('/requests', form)
      navigate('/confirmation', { state: { requestId: data.request_id } })
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.')
      setSubmitting(false)
    }
  }

  const activeAmbassadors = ambassadors.filter(a => a.availability_status !== 'On Break')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-duke-blue text-white py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">Duke MEM Ambassador Connect</h1>
          <p className="text-blue-200 text-sm mt-1">Connect with a current MEM student ambassador</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} total={3} />

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us about yourself</h2>
            <p className="text-sm text-gray-500 mb-6">We'll use this to match you with the right ambassador.</p>

            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Jane Smith" value={form.prospect_name}
                  onChange={e => update('prospect_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input className="input" type="email" placeholder="jane@example.com" value={form.prospect_email}
                  onChange={e => update('prospect_email', e.target.value)} />
              </div>
              <div>
                <label className="label">MEM Concentration of Interest *</label>
                <select className="input" value={form.concentration}
                  onChange={e => update('concentration', e.target.value)}>
                  <option value="">Select a concentration...</option>
                  {CONCENTRATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">What would you like to discuss? <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea className="input min-h-24 resize-none" placeholder="e.g. Career outcomes, day-to-day student life, concentration advice..."
                  value={form.message} onChange={e => update('message', e.target.value)} maxLength={500} />
                <p className="text-xs text-gray-400 text-right mt-1">{form.message.length}/500</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Availability */}
        {step === 2 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">When are you available?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Select multiple dates and time slots so your ambassador can find a time that works.
            </p>
            <AvailabilityPicker
              value={form.availability_slots}
              onChange={v => update('availability_slots', v)}
            />
          </div>
        )}

        {/* Step 3: Ambassador Preference */}
        {step === 3 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Choose your ambassador</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select up to 3 ambassadors you'd like to connect with, or let us match you automatically.
            </p>

            <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer mb-4 hover:bg-blue-50 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 accent-duke-blue"
                checked={form.match_anyone}
                onChange={e => {
                  update('match_anyone', e.target.checked)
                  if (e.target.checked) update('preferred_ambassadors', [])
                }}
              />
              <div>
                <span className="font-medium text-gray-900">Match me with anyone</span>
                <p className="text-xs text-gray-500">Fastest option — we'll assign you the first available ambassador</p>
              </div>
            </label>

            {!form.match_anyone && (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {form.preferred_ambassadors.length}/3 selected
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAmbassadors.map(a => (
                    <AmbassadorCard
                      key={a.id}
                      ambassador={a}
                      selected={form.preferred_ambassadors.includes(a.id)}
                      onToggle={toggleAmbassador}
                      disabled={form.preferred_ambassadors.length >= 3 && !form.preferred_ambassadors.includes(a.id)}
                    />
                  ))}
                  {activeAmbassadors.length === 0 && (
                    <p className="text-gray-400 text-sm col-span-2">No ambassadors available right now.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button onClick={() => { setStep(s => s - 1); setError('') }} className="btn-secondary">
              Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button onClick={handleNext} className="btn-primary">
              Continue
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
