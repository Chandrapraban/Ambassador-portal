import { useLocation, Link } from 'react-router-dom'
import { useState } from 'react'

export default function Confirmation() {
  const { state } = useLocation()
  const requestId = state?.requestId
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(requestId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!requestId) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">No request found.</p>
        <Link to="/" className="text-duke-blue hover:underline mt-2 block">Submit a new request</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h1>
        <p className="text-gray-500 mb-8">
          A Duke MEM ambassador will reach out to you soon. Save your Request ID for reference.
        </p>

        <div className="card p-6 mb-6">
          <p className="text-sm text-gray-500 mb-2">Your Request ID</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-duke-blue tracking-wider">{requestId}</span>
            <button onClick={copy} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy">
              {copied ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="text-left card p-4 text-sm text-gray-600 space-y-2">
          <p className="font-medium text-gray-800">What happens next?</p>
          <p>1. An ambassador will review your request and reach out to schedule a call.</p>
          <p>2. If you selected preferred ambassadors, they'll be notified first.</p>
          <p>3. After your call, you'll receive a link to share your feedback.</p>
        </div>

        <Link to="/" className="block mt-6 text-duke-blue hover:underline text-sm">
          Submit another request
        </Link>
      </div>
    </div>
  )
}
