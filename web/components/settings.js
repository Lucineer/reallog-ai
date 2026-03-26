import { html } from 'htm/preact';
import { useState, useEffect } from 'preact/hooks';
import { settingsOpen, theme } from '../app.js';

export function Settings() {
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState([
    { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', key: '' },
  ]);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') settingsOpen.value = false; };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const addProvider = (name, model) => {
    setProviders(prev => [...prev, { id: name.toLowerCase(), name, model, key: '' }]);
    setShowAddProvider(false);
  };

  const removeProvider = (id) => {
    setProviders(prev => prev.filter(p => p.id !== id));
  };

  return html`
    <div class="settings-backdrop ${settingsOpen.value ? 'open' : ''}" onclick=${() => settingsOpen.value = false}></div>
    <div class="settings-overlay ${settingsOpen.value ? 'open' : ''}">
      <div class="settings-header">
        <h2>⚙ Settings</h2>
        <button onclick=${() => settingsOpen.value = false}>✕</button>
      </div>
      <div class="settings-tabs">
        ${['providers', 'preferences', 'theme'].map(t => html`
          <button class=${tab === t ? 'active' : ''} onclick=${() => setTab(t)}>
            ${t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        `)}
      </div>
      <div class="settings-body">
        ${tab === 'providers' && html`
          <div>
            <div class="settings-section">
              <h3>Configured Providers</h3>
              ${providers.map(p => html`
                <div class="provider-item">
                  <div>
                    <div class="name">${p.name}</div>
                    <div class="model">${p.model}</div>
                  </div>
                  <button onclick=${() => removeProvider(p.id)}>🗑</button>
                </div>
              `)}
            </div>
            ${showAddProvider ? html`
              <${AddProviderForm} onAdd=${addProvider} onCancel=${() => setShowAddProvider(false)} />
            ` : html`
              <button onclick=${() => setShowAddProvider(true)}>+ Add Provider</button>
            `}
          </div>
        `}
        ${tab === 'preferences' && html`
          <div>
            <div class="settings-section">
              <h3>Privacy</h3>
              <div class="toggle-row">
                <span>Privacy mode (PII detection)</span>
                <button class="toggle ${privacyMode ? 'on' : ''}" onclick=${() => setPrivacyMode(!privacyMode)}></button>
              </div>
              <div class="toggle-row">
                <span>Cache responses</span>
                <button class="toggle ${cacheEnabled ? 'on' : ''}" onclick=${() => setCacheEnabled(!cacheEnabled)}></button>
              </div>
            </div>
            <div class="settings-section">
              <h3>System Prompt Template</h3>
              <select>
                <option>Default</option>
                <option>Code Assistant</option>
                <option>Writer</option>
                <option>Analyst</option>
              </select>
            </div>
          </div>
        `}
        ${tab === 'theme' && html`
          <div>
            <div class="settings-section">
              <h3>Appearance</h3>
              <div class="toggle-row">
                <span>Dark mode</span>
                <button class="toggle ${theme.value === 'dark' ? 'on' : ''}" onclick=${() => theme.value = theme.value === 'dark' ? 'light' : 'dark'}></button>
              </div>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

function AddProviderForm({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');

  return html`
    <div class="settings-section">
      <h3>New Provider</h3>
      <div style="display:flex;flex-direction:column;gap:var(--lo-space-sm);">
        <input placeholder="Name (e.g. Groq)" value=${name} onInput=${e => setName(e.target.value)} />
        <input placeholder="Model (e.g. llama-3.1-70b)" value=${model} onInput=${e => setModel(e.target.value)} />
        <input type="password" placeholder="API Key (encrypted client-side)" value=${apiKey} onInput=${e => setApiKey(e.target.value)} />
        <div style="display:flex;gap:var(--lo-space-sm);">
          <button class="primary" onclick=${() => onAdd(name, model)} disabled=${!name || !model}>Add</button>
          <button onclick=${onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  `;
}
