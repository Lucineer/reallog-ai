import { html } from 'htm/preact';
import { MessageContent } from './chat.js';

export function Message({ message }) {
  const { role, content, model, ts } = message;
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (role === 'system') {
    return html`<div class="message system">${content}</div>`;
  }

  return html`
    <div class="message ${role}">
      <div class="message-bubble">
        <${MessageContent} content=${content} />
      </div>
      <div class="message-meta">
        ${time}
        ${model ? html`<span class="route-badge">${model.split('/').pop()}</span>` : null}
        ${role === 'assistant' ? html`
          <span class="feedback-btns">
            <button onclick=${() => {}} title="Good">👍</button>
            <button onclick=${() => {}} title="Bad">👎</button>
          </span>
        ` : null}
      </div>
    </div>
  `;
}
