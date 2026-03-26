import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { MessageContent } from './chat.js';

export function DraftPanel({ drafts, onPick, onClose }) {
  const [selected, setSelected] = useState(null);

  const handlePick = (idx) => {
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected !== null) onPick(selected);
  };

  return html`
    <div>
      <div class="draft-panel">
        ${drafts.map((d, i) => html`
          <div class="draft-card ${selected === i ? 'selected' : ''} ${selected !== null && selected !== i ? 'dimmed' : ''}"
               onclick=${() => handlePick(i)}>
            <div class="draft-card-header">
              <span class="provider">${d.provider}</span>
              <span class="latency">${(d.latency / 1000).toFixed(1)}s</span>
            </div>
            <div class="draft-card-body"><${MessageContent} content=${d.content} /></div>
            ${selected === i ? html`
              <div class="draft-card-actions">
                <button class="primary" onclick=${(e) => { e.stopPropagation(); handleConfirm(); }}>Pick this</button>
                <button onclick=${(e) => { e.stopPropagation(); }}>Elaborate</button>
              </div>
            ` : html`
              <div class="draft-card-actions">
                <button onclick=${(e) => { e.stopPropagation(); setSelected(i); }}>Pick this</button>
              </div>
            `}
          </div>
        `)}
      </div>
      <div class="draft-actions-bar">
        <button onclick=${onClose}>← Back to Chat</button>
        ${selected !== null ? html`<button class="primary" onclick=${handleConfirm}>Confirm Selection</button>` : null}
      </div>
    </div>
  `;
}
