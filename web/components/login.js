import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { authState, addToast } from '../app.js';

export function Login() {
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Authentication failed (${res.status})`);
      }
      const data = await res.json();
      sessionStorage.setItem('lo-token', data.token || data.accessToken || data.access_token);
      authState.value = { isLoggedIn: true, token: data.token || data.accessToken, userId: data.userId || data.user_id };
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return html`
    <div class="login">
      <div class="login-card">
        <h1>🔐 LOG</h1>
        <p>your ai remembers</p>
        ${error && html`<div class="error">${error}</div>`}
        <form onSubmit=${handleSubmit}>
          <input
            type="password"
            placeholder="Passphrase"
            value=${passphrase}
            onInput=${e => setPassphrase(e.target.value)}
            disabled=${isLoading}
            autofocus
            autocomplete="current-password"
          />
          <button type="submit" class="primary" disabled=${isLoading || !passphrase.trim()} style="width:100%">
            ${isLoading ? html`<span class="spinner"></span>` : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  `;
}
