
import { useState } from 'react'
import './AuthPanel.css'


function AuthPanel({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const endpoint =
        mode === 'register'
          ? '/api/auth/register'
          : '/api/auth/login'

      const payload =
        mode === 'register'
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      let data

      try {
        data = await response.json()
      } catch {
        setError('The server returned an invalid response.')
        return
      }

      if (!response.ok) {
        setError(data?.error || 'Authentication failed. Please try again.')
        return
      }

      if (mode === 'register') {
        setMessage('Registration successful! You can now log in.')
        setMode('login')
        setPassword('')
        setName('')
        return
      }

      if (!data.token || !data.user) {
        setError('The login response is incomplete.')
        return
      }

      onLoginSuccess(data.user, data.token)
    } catch {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-header">
        <p className="auth-eyebrow">ACCOUNT ACCESS</p>
        <h2 id="auth-heading">
          {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        </h2>
        <p>
          {mode === 'login'
            ? 'Log in to access your Code Merge Simulator account.'
            : 'Register to get started with Code Merge Simulator.'}
        </p>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          aria-pressed={mode === 'login'}
          onClick={() => switchMode('login')}
        >
          Login
        </button>

        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          aria-pressed={mode === 'register'}
          onClick={() => switchMode('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="auth-field">
            <label htmlFor="auth-name">Full Name</label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="auth-email">Email Address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
          {mode === 'register' && (
            <small>Minimum 8 characters.</small>
          )}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-success" role="status">
            {message}
          </div>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : mode === 'login'
              ? 'Log In'
              : 'Create Account'}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'login'
          ? "Don't have an account?"
          : 'Already have an account?'}
        {' '}
        <button
          type="button"
          onClick={() =>
            switchMode(mode === 'login' ? 'register' : 'login')
          }
        >
          {mode === 'login' ? 'Register here' : 'Login here'}
        </button>
      </p>
    </section>
  )
}

export default AuthPanel
