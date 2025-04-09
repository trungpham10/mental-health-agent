"use client";

import { useState } from 'react';
import { ingestDocument } from '../services/knowledgeService';
import { queryKnowledge } from '../services/chromaService';

export default function KnowledgeUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentSource, setDocumentSource] = useState('confluence');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadResult(null);

    try {
      console.log("Starting document ingestion process...");
      const result = await ingestDocument(documentContent, {
        title: documentTitle,
        source: documentSource,
        uploadedAt: new Date().toISOString()
      });

      setUploadResult(result);
      
      if (result.success) {
        // Verify that the knowledge is retrievable
        setIsVerifying(true);
        
        try {
          // Use the document title as a query to verify it can be retrieved
          // Now using queryKnowledge specifically
          console.log(`Verifying knowledge retrieval with query: "${documentTitle}"`);
          const verificationResult = await queryKnowledge(documentTitle, 2);
          
          if (verificationResult.length > 0) {
            console.log("Knowledge verified! Content is retrievable:", verificationResult);
            setUploadResult({
              ...result,
              message: `${result.message} - Knowledge is ready to use!`
            });
          } else {
            console.warn("Knowledge was added but couldn't be verified with immediate query");
          }
        } catch (verifyError) {
          console.error("Error verifying knowledge:", verifyError);
        } finally {
          setIsVerifying(false);
        }
        
        // Clear form on success
        setDocumentContent('');
        setDocumentTitle('');
      }
    } catch (error) {
      console.error("Error in knowledge upload:", error);
      setUploadResult({
        success: false,
        message: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg transition-all"
        title="Upload Knowledge"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v8m0 0 3-3m-3 3-3-3" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          <path d="M16 16v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Knowledge Base Upload</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Document Title</label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-2"
                  placeholder="Enter document title"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Source</label>
                <select
                  value={documentSource}
                  onChange={(e) => setDocumentSource(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-2"
                >
                  <option value="confluence">Confluence</option>
                  <option value="documentation">Documentation</option>
                  <option value="manual">Manual Entry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Document Content</label>
                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-2 h-64"
                  placeholder="Paste document content here"
                  required
                ></textarea>
              </div>

              {uploadResult && (
                <div 
                  className={`p-3 mb-4 rounded ${
                    uploadResult.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                  }`}
                >
                  {uploadResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || isVerifying}
                className={`w-full py-2 rounded-lg font-bold ${
                  isUploading || isVerifying
                    ? 'bg-gray-700 text-gray-400' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isUploading 
                  ? 'Uploading...' 
                  : isVerifying 
                    ? 'Verifying knowledge...' 
                    : 'Upload Document'
                }
              </button>

              {uploadResult && uploadResult.success && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400">✓ Knowledge has been added to Jarvis&apos;s knowledge base</p>
                  <p className="text-sm text-gray-400 mt-1">✓ You can now ask questions about this content</p>
                  <div className="mt-3 p-2 bg-gray-800 rounded border border-gray-700">
                    <p className="text-xs text-gray-300 mb-1">To query specifically from knowledge base:</p>
                    <code className="text-xs text-purple-400 block">Type /knowledge in the chat</code>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
} 