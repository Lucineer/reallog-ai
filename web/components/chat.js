import { html } from 'htm/preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { Message } from './message.js';
import { DraftPanel } from './draft-panel.js';
import { authState, theme, sidebarOpen, sessions, currentSessionId, addToast } from '../app.js';
import { dehydrateClient, rehydrateClient } from '../crypto.js';

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const listRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streamingContent]);

  // Resize textarea
  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const getToken = () => sessionStorage.getItem('lo-token') || authState.value.token;

  const sendMessage = async (text) => {
    if (!text.trim() || isStreaming) return;
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let model = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) full += delta.content;
            if (parsed.model) model = parsed.model;
            setStreamingContent(full);
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full, model, ts: Date.now() }]);
    } catch (err) {
      addToast(err.message, 'error');
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}`, ts: Date.now() }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    currentSessionId.value = crypto.randomUUID();
    setMessages([]);
    setDrafts([]);
    setDraftMode(false);
  };

  const sendDraft = async (text) => {
    if (!text.trim()) return;
    setDraftMode(true);
    setDrafts([]);
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // For draft mode, we'd ideally query multiple providers.
    // For now, send once and show as a single draft card.
    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '', model = '', startTime = Date.now();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) full += parsed.choices[0].delta.content;
            if (parsed.model) model = parsed.model;
          } catch {}
        }
      }
      setDrafts([{ provider: model || 'default', content: full, latency: Date.now() - startTime }]);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsStreaming(false);
    }
  };

  const pickDraft = (idx) => {
    const draft = drafts[idx];
    if (!draft) return;
    setMessages(prev => [...prev, { role: 'assistant', content: draft.content, model: draft.provider, ts: Date.now() }]);
    setDraftMode(false);
    setDrafts([]);
  };

  return html`
    <div class="chat-area">
      <div class="chat-header">
        <button onclick=${() => sidebarOpen.value = !sidebarOpen.value}>☰</button>
        <div class="actions">
          <button onclick=${() => setDraftMode(!draftMode)} title="Draft mode (Ctrl+D)">${draftMode ? '✕' : '🎯'} Draft</button>
          <button onclick=${handleNewChat} title="New chat (Ctrl+N)">+ New</button>
          <button onclick=${() => theme.value = theme.value === 'dark' ? 'light' : 'dark'}>${theme.value === 'dark' ? '☀️' : '🌙'}</button>
          <button onclick=${() => { import('./settings.js').then(() => { /* settings imported via App */ }); settingsOpen.value = true; }}>⚙</button>
        </div>
      </div>

      ${draftMode && drafts.length > 0 ? html`
        <${DraftPanel} drafts=${drafts} onPick=${pickDraft} onClose=${() => setDraftMode(false)} />
      ` : html`
        <div class="message-list" ref=${listRef}>
          ${messages.map((m, i) => html`<${Message} key=${i} message=${m} />`)}
          ${isStreaming && streamingContent ? html`
            <div class="message assistant">
              <div class="message-bubble">
                <${MessageContent} content=${streamingContent} />
                <span class="streaming-cursor"></span>
              </div>
            </div>
          ` : null}
        </div>
      `}

      <div class="input-area">
        <div class="input-row">
          <textarea
            ref=${textareaRef}
            placeholder="Type a message…"
            value=${input}
            onInput=${handleInput}
            onKeyDown=${handleKeyDown}
            disabled=${isStreaming}
            rows="1"
          />
          <button class="primary" onclick=${() => draftMode ? sendDraft(input) : sendMessage(input)} disabled=${isStreaming || !input.trim()}>
            ${isStreaming ? html`<span class="spinner"></span>` : '➤'}
          </button>
        </div>
        <div class="input-hint">Ctrl+Enter to send${draftMode ? ' • Draft mode active' : ''}</div>
      </div>
    </div>
  `;
}

// Basic markdown renderer
export function MessageContent({ content }) {
  if (!content) return html``;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);
  return html`<div>${parts.map(part => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3);
      const firstNewline = lines.indexOf('\n');
      const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : '';
      const code = firstNewline > 0 ? lines.slice(firstNewline + 1) : lines;
      return html`<pre><code>${code}</code></pre>`;
    }
    // Inline markdown
    return html`<span dangerouslySetInnerHTML=${{ __html: renderInlineMarkdown(part) }}></span>`;
  })}</div>`;
}

function renderInlineMarkdown(text) {
  let html = text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>');
  return html;
}
