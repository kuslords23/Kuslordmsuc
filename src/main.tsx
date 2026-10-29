import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

const rootEl = document.getElementById('root')

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>,
  )
} else {
  document.body.innerHTML =
    '<p style="color:#fff;font-family:sans-serif;padding:24px">Missing &lt;div id="root"&gt;&lt;/div&gt; in index.html</p>'
}