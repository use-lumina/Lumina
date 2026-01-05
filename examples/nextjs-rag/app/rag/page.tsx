'use client';

import { useState } from 'react';
import { Send, Upload, Trash2, FileText, Database } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; content: string; metadata: any }>;
}

export default function RAGPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Array<{ content: string }>>([]);
  const [documentInput, setDocumentInput] = useState('');
  const [docsInStore, setDocsInStore] = useState(0);

  const addDocument = () => {
    if (!documentInput.trim()) return;

    setDocuments([...documents, { content: documentInput.trim() }]);
    setDocumentInput('');
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const clearVectorStore = async () => {
    try {
      await fetch('/api/rag', { method: 'DELETE' });
      setDocsInStore(0);
      alert('Vector store cleared!');
    } catch (error) {
      console.error('Failed to clear vector store:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && documents.length === 0) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    if (userMessage) {
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage || 'Tell me about the documents you have.',
          documents: documents.length > 0 ? documents : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources,
          },
        ]);
        setDocsInStore(data.documentsInStore);

        // Clear documents after uploading
        if (documents.length > 0) {
          setDocuments([]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${data.error || 'Failed to get response'}`,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Failed to connect to the server',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  RAG Demo with Lumina
                </h1>
              </div>
              <p className="text-gray-600 text-lg">
                Retrieval-Augmented Generation - Add documents and ask intelligent questions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  {docsInStore} {docsInStore === 1 ? 'document' : 'documents'}
                </span>
              </div>
              <button
                onClick={clearVectorStore}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-100 hover:shadow-md"
              >
                <Trash2 className="h-4 w-4" />
                Clear Store
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Add Knowledge Base
                  </label>
                  <textarea
                    value={documentInput}
                    onChange={(e) => setDocumentInput(e.target.value)}
                    placeholder="Paste your document text here..."
                    className="w-full h-36 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                  <button
                    onClick={addDocument}
                    disabled={!documentInput.trim()}
                    className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Add Document
                  </button>
                </div>

                {/* Document Preview */}
                {documents.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Ready to upload ({documents.length}):
                    </p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-200"
                        >
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-700 flex-1 line-clamp-2 font-medium">
                            {doc.content}
                          </p>
                          <button
                            onClick={() => removeDocument(index)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Documents */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Sample:</p>
                  <button
                    onClick={() =>
                      setDocumentInput(
                        'Lumina is an AI observability platform that helps developers monitor, analyze, and optimize their AI applications in production. It provides real-time tracing, cost analysis, and performance insights.'
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 hover:decoration-blue-700 transition-colors"
                  >
                    Load sample about Lumina
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 h-[700px] flex flex-col">
              {/* Chat Header */}
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
                <p className="text-sm text-gray-500">Ask questions about your documents</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                        <Send className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900 mb-2">
                        Welcome to RAG Demo!
                      </p>
                      <p className="text-gray-500">
                        Add documents and start asking intelligent questions
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-300/50">
                            <p className="text-xs font-semibold mb-2 opacity-90 flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              Sources ({msg.sources.length}):
                            </p>
                            <div className="space-y-1.5">
                              {msg.sources.map((source, i) => (
                                <div
                                  key={i}
                                  className="text-xs opacity-80 bg-white/20 rounded-lg p-2 backdrop-blur-sm"
                                >
                                  📄 {source.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="animate-spin h-5 w-5 border-3 border-blue-200 border-t-blue-600 rounded-full"></div>
                        </div>
                        <span className="text-gray-700 font-medium">Analyzing documents...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4 bg-gray-50/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                    placeholder="Ask a question about your documents..."
                    className="flex-1 px-5 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || (!input.trim() && documents.length === 0)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                  >
                    <Send className="h-4 w-4" />
                    {documents.length > 0 ? 'Upload & Ask' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
