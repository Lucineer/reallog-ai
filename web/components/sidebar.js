import { html } from 'htm/preact';
import { useState, useEffect } from 'preact/hooks';
import { sidebarOpen, sessions, currentSessionId, addToast } from '../app.js';

export function Sidebar() {
  const [sessionList, setSessionList] = useState([
    { id: 'demo-1', title: 'Welcome chat', ts: Date.now() - 3600000 },
  ]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleNewSession = () => {
    currentSessionId.value = crypto.randomUUID();
    addToast('New session created');
  };

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      setSessionList(prev => prev.filter(s => s.id !== id));
      setConfirmDelete(null);
      addToast('Session deleted');
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return html`
    <div class="sidebar ${sidebarOpen.value ? '' : 'collapsed'}">
      <div class="sidebar-header">
        <h2>📋 Sessions</h2>
        <button onclick=${() => sidebarOpen.value = false}>✕</button>
      </div>
      <div class="session-list">
        ${sessionList.map(s => html`
          <div class="session-item ${currentSessionId.value === s.id ? 'active' : ''}"
               onclick=${() => currentSessionId.value = s.id}>
            <span class="title">${s.title}</span>
            <button class="delete-btn" onclick=${(e) => { e.stopPropagation(); handleDelete(s.id); }}>
              ${confirmDelete === s.id ? '✓' : '🗑'}
            </button>
          </div>
        `)}
      </div>
      <div class="sidebar-footer">
        <button class="primary" onclick=${handleNewSession} style="flex:1">+ New Session</button>
      </div>
    </div>
  `;
}
