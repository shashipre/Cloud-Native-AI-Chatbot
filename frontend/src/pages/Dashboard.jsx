import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileUp, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Database, 
  Cloud, 
  Sparkles, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const fileInputRef = useRef(null);
  const { logout, user } = useAuth();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents/');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch documents', 'error');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const validateFile = (f) => {
    const validExtensions = ['.pdf', '.txt', '.docx'];
    const hasValidExt = validExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      showToast('Only PDF, DOCX, and TXT files are supported.', 'error');
      return false;
    }
    // Limit to 25MB for safety
    if (f.size > 25 * 1024 * 1024) {
      showToast('File size exceeds 25MB limit.', 'error');
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(`"${file.name}" uploaded and indexed into pgvector!`, 'success');
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || 'Failed to process document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will also remove its vector embeddings.`)) return;

    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      showToast(`"${filename}" removed successfully.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete document', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const readyCount = documents.filter(d => d.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm transition-all animate-bounceIn ${
          toast.type === 'success' 
            ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700' 
            : 'bg-rose-900/90 text-rose-100 border border-rose-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles size={20} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Cloud-Native AI Chatbot</h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Multi-tenant Retrieval-Augmented Generation with AWS S3 & pgvector
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/chat" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm rounded-xl inline-flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <MessageSquare size={16} /> Open Chat
            </Link>
            <button 
              onClick={logout} 
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 rounded-xl text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* System Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{documents.length}</div>
              <div className="text-xs text-gray-400">Total Documents</div>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{readyCount}</div>
              <div className="text-xs text-gray-400">Indexed in pgvector</div>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Cloud size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">AWS RDS + S3</div>
              <div className="text-xs text-gray-400">Cloud Storage Active</div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <FileUp size={18} className="text-blue-400" />
            Upload & Index Document
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Upload PDF, DOCX, or TXT documents. The system parses text, creates 768-dim embeddings, and stores them in PostgreSQL.
          </p>

          <form onSubmit={handleUpload}>
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700/80 hover:border-gray-600 bg-gray-950/60'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.txt,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-blue-400 shadow-inner">
                  <FileUp size={24} />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-blue-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      Drag & drop your document here, or <span className="text-blue-400 font-semibold">browse files</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Supports PDF, DOCX, and TXT (up to 25MB)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                type="submit" 
                disabled={!file || uploading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 font-medium text-sm text-white rounded-xl inline-flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Chunking & Embedding...
                  </>
                ) : (
                  <>
                    <FileUp size={16} />
                    Process & Index Document
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Uploaded Documents List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database size={18} className="text-blue-400" />
              Document Knowledge Base
            </h2>
            <span className="text-xs text-gray-500 font-mono">
              {documents.length} item{documents.length === 1 ? '' : 's'}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
              <p className="text-gray-400 text-sm">No documents in knowledge base.</p>
              <p className="text-gray-500 text-xs mt-1">Upload a document above to begin asking questions.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/80">
              {documents.map((doc) => (
                <li key={doc.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{doc.filename}</p>
                      <p className="text-[11px] text-gray-500">
                        Added {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                      doc.status === 'ready' 
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' 
                        : doc.status === 'error' 
                        ? 'bg-rose-950/80 text-rose-400 border-rose-800/60' 
                        : 'bg-amber-950/80 text-amber-400 border-amber-800/60 animate-pulse'
                    }`}>
                      {doc.status === 'ready' ? '● Ready for RAG' : doc.status}
                    </span>

                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      disabled={deletingId === doc.id}
                      title="Delete document"
                      className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {deletingId === doc.id ? <Loader2 size={15} className="animate-spin text-rose-400" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


