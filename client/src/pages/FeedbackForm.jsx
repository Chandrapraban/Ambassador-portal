import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

function Star({ filled, onClick, onHover }) {
  return (
    <button type="button" onClick={onClick} onMouseEnter={onHover} className="focus:outline-none">
      <svg className={`w-10 h-10 transition-colors ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  )
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export default function FeedbackForm() {
  const { requestId } = useParams()
  const [request, setRequest] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/requests/${requestId}`)
      .then(res => {
        setRequest(res.data)
        if (res.data.feedback_rating !== null) setSubmitted(true)
      })
      .catch(() => setLoadError('Request not found.'))
  }, [requestId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setError('Please select a rating'); return }
    setSubmitting(true)
    try {
      await api.post(`/requests/${requestId}/feedback`, { rating, text })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">{loadError}</p>
    </div>
  )

  if (!request) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-duke-blue">Duke MEM</div>
          <div className="text-gray-500 text-sm">Ambassador Connect</div>
        </div>

        <div className="card p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you for your feedback!</h2>
              <p className="text-gray-500 text-sm">
                Your response helps us improve the Duke MEM ambassador program.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">How was your ambassador call?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your feedback is anonymous and helps us improve the program.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label mb-3">Overall Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        filled={n <= (hover || rating)}
                        onClick={() => setRating(n)}
                        onHover={() => setHover(n)}
                      />
                    ))}
                    <span className="ml-3 text-sm text-gray-500 w-16">
                      {LABELS[hover || rating]}
                    </span>
                  </div>
                  <div onMouseLeave={() => setHover(0)} />
                </div>

                <div>
                  <label className="label">Additional Comments (optional)</label>
                  <textarea
                    className="input min-h-28 resize-none"
                    placeholder="What did you find most helpful? Any suggestions?"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{text.length}/1000</p>
                </div>

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                <button type="submit" disabled={submitting || !rating} className="btn-primary w-full">
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
