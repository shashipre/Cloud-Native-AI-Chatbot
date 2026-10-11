import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  ArrowLeft, 
  Plus, 
  Copy, 
  Check, 
  Bot, 
  User, 
  FileText, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
      if (res.data.length > 0) {
        if (!activeConvId) setActiveConvId(res.data[0].id);
      } else {
        // Automatically create a default conversation so the input is never disabled
        await createConversation();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load conversations.');
    }
  };

  const createConversation = async () => {
    try {
      const res = await api.post('/conversations', { title: 'New Conversation' });
      setConversations((prev) => [res.data, ...prev]);
      setActiveConvId(res.data.id);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 100);
      return res.data.id;
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to create new conversation.');
      return null;
    }
  };

  const fetchMessages = async (id) => {
    try {
      const res = await api.get(`/conversations/${id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load messages.');
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    let targetConvId = activeConvId;
    if (!targetConvId) {
      targetConvId = await createConversation();
      if (!targetConvId) return;
    }

    const optimisticMsg = { role: 'user', content: trimmedInput };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.post(`/conversations/${targetConvId}/messages`, { content: trimmedInput });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || 'Failed to get answer. Please verify your connection.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans antialiased">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col transition-all">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <Link 
            to="/dashboard" 
            className="text-gray-400 hover:text-white inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button 
            onClick={() => createConversation()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-800">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">
            Chats
          </div>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveConvId(c.id);
                setErrorMessage('');
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm truncate transition-colors flex items-center gap-2.5 ${
                activeConvId === c.id 
                  ? 'bg-gray-800 text-white font-medium border border-gray-700/60 shadow-sm' 
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
              }`}
            >
              <Sparkles size={14} className={activeConvId === c.id ? 'text-blue-400' : 'text-gray-500'} />
              <span className="truncate">{c.title || 'Conversation'}</span>
            </button>
          ))}
        </div>

        {/* User Info footer */}
        <div className="p-3 border-t border-gray-800/80 text-xs text-gray-500 text-center">
          Grounding via <span className="text-blue-400 font-medium">pgvector + Gemini</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-950">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-900/30 border-b border-red-800/60 px-4 py-2.5 text-red-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button 
              onClick={() => setErrorMessage('')} 
              className="text-red-400 hover:text-red-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Ask Your Documents</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Upload PDF, DOCX, or TXT in the Dashboard, then query your proprietary knowledge base with zero hallucination.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full pt-2">
                {[
                  "What are the key points in my uploaded document?",
                  "Summarize the main architecture components.",
                  "Explain how vector similarity search works."
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-xs bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 p-2.5 rounded-lg transition-colors hover:border-blue-500/50 cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                    <Bot size={18} />
                  </div>
                )}
                
                <div className={`max-w-3xl rounded-2xl px-5 py-4 shadow-sm relative group ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-xs' 
                    : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-bl-xs'
                }`}>
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
                  ) : (
                    <div className="text-sm space-y-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-300" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-300" {...props} />,
                          li: ({node, ...props}) => <li className="text-gray-200" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold text-white mt-3 mb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-base font-bold text-white mt-2.5 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-sm font-bold text-white mt-2 mb-1" {...props} />,
                          code: ({node, inline, ...props}) => (
                            <code className="bg-gray-950 px-1.5 py-0.5 rounded text-xs font-mono text-blue-300 border border-gray-800" {...props} />
                          ),
                          pre: ({node, ...props}) => (
                            <pre className="bg-gray-950 p-3 rounded-lg overflow-x-auto text-xs my-2 border border-gray-800 text-gray-300 font-mono" {...props} />
                          )
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Sources citation section */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-400 font-medium mb-1.5">
                        <FileText size={13} className="text-blue-400" />
                        <span>Retrieved Sources ({m.sources.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((s, idx) => (
                          <span 
                            key={idx} 
                            className="bg-gray-950 text-blue-300 border border-blue-900/40 px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1"
                            title={s.content ? s.content.slice(0, 150) + '...' : ''}
                          >
                            <FileText size={10} />
                            {s.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy button for assistant responses */}
                  {m.role !== 'user' && (
                    <button
                      onClick={() => copyToClipboard(m.content, i)}
                      className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-800"
                      title="Copy response"
                    >
                      {copiedIndex === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing animation indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                <Bot size={18} />
              </div>
              <div className="bg-gray-900 border border-gray-800 text-gray-300 px-4 py-3 rounded-2xl rounded-bl-xs flex items-center gap-2">
                <span className="text-xs text-gray-400">Searching embeddings & generating response</span>
                <div className="flex items-center gap-1 ml-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-gray-800/80 bg-gray-900/60 backdrop-blur">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your uploaded documents..."
              className="w-full bg-gray-800/90 text-white placeholder-gray-500 border border-gray-700/80 rounded-2xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2.5 p-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-md transition-all cursor-pointer"
              title="Send"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="max-w-4xl mx-auto mt-2 text-center text-[11px] text-gray-500">
            Responses are strictly grounded in your PostgreSQL pgvector document chunks.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

