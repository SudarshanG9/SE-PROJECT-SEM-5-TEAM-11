
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AuthPanel from './AuthPanel'

describe('AuthPanel', () => {
  const onLoginSuccess = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    onLoginSuccess.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the login form by default', () => {
    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
  })

  it('switches to registration form', () => {
    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('validates empty login fields', async () => {
    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter your email address.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('validates registration password length', async () => {
    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: '1234567' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must contain at least 8 characters.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits registration successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Registration successful.',
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'contributor',
        },
      }),
    })

    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    fireEvent.change(screen.getByLabelText('Full Name'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Registration successful! You can now log in.'
    )

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST',
    }))
    expect(onLoginSuccess).not.toHaveBeenCalled()
  })

  it('logs in successfully and returns user and token', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'contributor',
        },
      }),
    })

    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test User' }),
        'test-token'
      )
    })
  })

  it('displays backend login errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid email or password.',
      }),
    })

    render(<AuthPanel onLoginSuccess={onLoginSuccess} />)

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'WrongPassword123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password.'
    )
  })
})
