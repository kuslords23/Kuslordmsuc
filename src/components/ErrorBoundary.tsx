import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Catches any crash during rendering and shows a readable
 * message instead of an empty black screen.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            background: '#09090e',
            color: '#f5f5f7',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 34 }}>𝄞</div>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: '#8e92a8', fontSize: 14, maxWidth: 420 }}>
            {this.state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 10,
              background: 'linear-gradient(135deg, #fa2d6c, #fc6f60)',
              color: 'white',
              border: 'none',
              borderRadius: 20,
              padding: '10px 22px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}