'use client';

import { useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (data.error) {
        setResponse(`Error: ${data.error}`);
      } else {
        setResponse(data.message);
        console.log('[Client] Usage:', data.usage);
        console.log('[Client] Model:', data.model);
      }
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Lumina SDK Test - Next.js RAG Example</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        This app tests the @lumina/sdk by wrapping OpenAI calls with lumina.trace()
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
      </div>

      <button
        onClick={sendMessage}
        disabled={loading || !message.trim()}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem',
        }}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>

      {response && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          <h3>Response:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
        </div>
      )}

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fffbea',
          borderRadius: '4px',
          border: '1px solid #f7dc6f',
        }}
      >
        <h3>Testing Instructions:</h3>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Send a few messages</li>
          <li>Look for [Lumina SDK] logs in console</li>
          <li>
            Expected: SDK will try to send to localhost:8080 (will fail until ingestion service is
            built)
          </li>
        </ol>
      </div>
    </main>
  );
}
