import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css'; // Keep basic global styles if needed
import './index.css'; // Ensure Tailwind directives are here or imported
import { jsPDF } from 'jspdf'; // Import jsPDF library for PDF export

// --- Icon Imports (Replace with an icon library compatible with Tailwind, e.g., Heroicons or React Icons) ---
// Assuming you'll use React Icons (install with `npm install react-icons`)
import { FaHome, FaMicrophone, FaUpload, FaVial, FaSearch, FaFilePdf, FaDownload } from 'react-icons/fa'; 

const API_URL = 'http://127.0.0.1:8000';

// Lazy load components
const AudioRecorder = React.lazy(() => import('./components/AudioRecorder'));

// --- NavBar Component (Refactored with Tailwind) ---
const NavBar: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', label: 'Home', icon: <FaHome /> },
        { path: '/record', label: 'Record', icon: <FaMicrophone /> },
        { path: '/upload', label: 'Upload', icon: <FaUpload /> },
        { path: '/test', label: 'Test', icon: <FaVial /> },
        { path: '/search', label: 'Search', icon: <FaSearch /> },
    ];

    return (
        <nav className="bg-gray-800 text-white p-4 fixed w-64 h-full shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Menu</h2>
            <ul>
                {navItems.map((item) => (
                    <li key={item.path} className="mb-2">
                        <Link
                            to={item.path}
                            className={`flex items-center p-2 rounded hover:bg-gray-700 ${location.pathname === item.path ? 'bg-gray-700 font-bold' : ''
                                }`}
                        >
                            <span className="mr-3 text-xl">{item.icon}</span>
                            {item.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
};


// --- Page Components (Placeholders - need refactoring) ---

interface Transcription {
    id: number;
    filename: string;
    language: string;
    transcription_text: string;
    created_at: string;
}

const HomePage: React.FC = () => {
    const [notes, setNotes] = useState<Transcription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState<number | null>(null);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/notes/`);
                setNotes(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching notes:', err);
                setError('Failed to load notes. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, []);
    
    // Function to generate PDF from a note
    const generatePDF = (note: Transcription) => {
        setPdfGenerating(note.id);
        try {
            const doc = new jsPDF();
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();

            // Add title
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 128); // Dark blue for title
            doc.text(`Transcription: ${note.filename}`, margin, margin);
            
            // Add metadata
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100); // Gray for metadata
            doc.text(`Language: ${note.language}`, margin, margin + 10);
            doc.text(`Date: ${new Date(note.created_at).toLocaleString()}`, margin, margin + 15);
            
            // Add horizontal line
            doc.setDrawColor(200, 200, 200); // Light gray
            doc.line(margin, margin + 20, pageWidth - margin, margin + 20);
            
            // Add transcription content
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0); // Black for content
            
            // Split text to handle line breaks and fit within page
            const textLines = doc.splitTextToSize(
                note.transcription_text || 'No transcription available.', 
                pageWidth - 2 * margin
            );
            
            // Start text 25 points below the horizontal line
            doc.text(textLines, margin, margin + 30);
            
            // Save the PDF
            doc.save(`transcription-${note.id}-${note.language}.pdf`);

        } catch (err) {
            console.error('Error generating PDF:', err);
            // Optionally show an error message to the user
        } finally {
            setPdfGenerating(null);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Recent Transcriptions</h1>
            {loading && <p className="text-gray-600">Loading notes...</p>}
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>}
            {!loading && !error && notes.length === 0 && (
                <p className="text-gray-600 italic">No transcriptions found. Try recording or uploading audio.</p>
            )}
            {!loading && !error && notes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map((note) => (
                        <div key={note.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-lg font-semibold text-gray-800 truncate" title={note.filename}>{note.filename}</h2>
                                <button 
                                    onClick={() => generatePDF(note)}
                                    className="text-indigo-600 hover:text-indigo-800 transition-colors p-1"
                                    disabled={pdfGenerating === note.id}
                                    title="Export as PDF"
                                >
                                    {pdfGenerating === note.id ? (
                                        <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <FaFilePdf className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-1">Language: <span className="font-medium text-gray-700">{note.language}</span></p>
                            <p className="text-sm text-gray-500 mb-3">Date: <span className="font-medium text-gray-700">{new Date(note.created_at).toLocaleString()}</span></p>
                            <p className="text-gray-700 text-sm h-20 overflow-hidden text-ellipsis leading-relaxed">
                                {note.transcription_text || 'No transcription available.'}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RecordPage: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Record Audio</h1>
            <Suspense fallback={<div className="text-center p-4 text-gray-500">Loading Recorder...</div>}>
                <AudioRecorder /> {/* Internal styling handled by AudioRecorder.tsx */}
            </Suspense>
        </div>
    );
};

const UploadPage: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [language, setLanguage] = useState<string>('en');
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
    const [translationResult, setTranslationResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setUploadStatus(null); // Reset status on new file selection
            setTranscriptionResult(null);
            setTranslationResult(null);
            setError(null);
        }
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(event.target.value);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            return;
        }

        setUploading(true);
        setUploadStatus('Uploading and processing...');
        setTranscriptionResult(null);
        setTranslationResult(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('language', language);

        try {
            const response = await axios.post(`${API_URL}/upload-audio/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUploadStatus('Upload successful!');
            setTranscriptionResult(response.data.transcription);
            
            // Set translation result if available
            if (response.data.translation) {
                setTranslationResult(response.data.translation);
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            setError('Upload failed. Please check the file or try again.');
            setUploadStatus(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-md border border-gray-200">
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Upload Audio File</h1>

            <div className="mb-5">
                <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1">Select Language:</label>
                <select
                    id="language-select"
                    value={language}
                    onChange={handleLanguageChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white"
                >
                    <option value="en">English</option>
                    <option value="zh">Mandarin (Simplified Chinese)</option>
                    <option value="yue">Cantonese</option>
                </select>
            </div>

            <div className="mb-5">
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">Choose Audio File:</label>
                <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {selectedFile && <p className="text-xs text-gray-600 mt-2">Selected: {selectedFile.name}</p>}
            </div>

            <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                    }`}
            >
                {uploading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </>
                 ) : 'Upload and Transcribe'}
            </button>

            {uploadStatus && !error && (
                <p className='mt-4 text-center font-medium text-green-600'>{uploadStatus}</p>
            )}

            {error && (
                 <p className="mt-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>
            )}

            {transcriptionResult && (
                <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Transcription Result:</h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{transcriptionResult}</p>
                    
                    {translationResult && language !== 'en' && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">English Translation:</h3>
                            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{translationResult}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TestPage: React.FC = () => {
    const [testResult, setTestResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>('en'); // Default language

    const runTest = async () => {
        setLoading(true);
        setError(null);
        setTestResult(null);
        try {
            const response = await axios.post(`${API_URL}/test-transcription/?language=${language}`);
            setTestResult(response.data);
        } catch (err) {
            console.error('Error running test:', err);
            setError('Failed to run test transcription. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

     const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(event.target.value);
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-4 text-gray-800">Test Transcription</h1>
            <p className="mb-6 text-gray-600">Click the button to test the transcription endpoint with a sample audio file for the selected language.</p>

            <div className="mb-5 flex items-center gap-4">
                <label htmlFor="language-select-test" className="block text-sm font-medium text-gray-700 whitespace-nowrap">Select Language for Test:</label>
                <select
                    id="language-select-test"
                    value={language}
                    onChange={handleLanguageChange}
                    className="mt-1 block w-full max-w-xs pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white"
                >
                    <option value="en">English</option>
                    <option value="zh">Mandarin (Simplified Chinese)</option>
                    <option value="yue">Cantonese</option>
                </select>
            </div>

            <button
                onClick={runTest}
                disabled={loading}
                className={`py-2 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
            >
                 {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running Test...
                    </>
                 ) : 'Run Test Transcription'}
            </button>

            {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">Error: {error}</p>}

            {testResult && (
                <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-100">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">Test Result:</h2>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(testResult, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Transcription[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState<number | null>(null);

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) {
            setError('Please enter a search term.');
            setResults([]); // Clear previous results if query is empty
            return;
        }
        setSearching(true);
        setError(null);
        setResults([]); // Clear previous results before new search

        try {
            const response = await axios.get(`${API_URL}/search/`, {
                params: { query: query }
            });
            setResults(response.data);
            if (response.data.length === 0) {
                 setError('No matching transcriptions found.');
            }
        } catch (err) {
            console.error('Error searching notes:', err);
            setError('Search failed. Please try again later.');
        } finally {
            setSearching(false);
        }
    };
    
    // Function to generate PDF from a search result
    const generatePDF = (note: Transcription) => {
        setPdfGenerating(note.id);
        try {
            const doc = new jsPDF();
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();

            // Add title with search context
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 128); // Dark blue for title
            doc.text(`Transcription: ${note.filename}`, margin, margin);
            doc.setFontSize(14);
            doc.text(`Search: "${query}"`, margin, margin + 10);
            
            // Add metadata
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100); // Gray for metadata
            doc.text(`Language: ${note.language}`, margin, margin + 20);
            doc.text(`Date: ${new Date(note.created_at).toLocaleString()}`, margin, margin + 25);
            
            // Add horizontal line
            doc.setDrawColor(200, 200, 200); // Light gray
            doc.line(margin, margin + 30, pageWidth - margin, margin + 30);
            
            // Add transcription content
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0); // Black for content
            
            // Split text to handle line breaks and fit within page
            const textLines = doc.splitTextToSize(
                note.transcription_text || 'No transcription available.', 
                pageWidth - 2 * margin
            );
            
            // Start text 25 points below the horizontal line
            doc.text(textLines, margin, margin + 40);
            
            // Save the PDF with search query in the filename
            doc.save(`search-${query.substring(0,10)}-${note.id}-${note.language}.pdf`);

        } catch (err) {
            console.error('Error generating PDF:', err);
            // Optionally show an error message to the user
        } finally {
            setPdfGenerating(null);
        }
    };

    // Function to export all search results as a single PDF
    const exportAllResults = () => {
        if (results.length === 0) return;
        
        try {
            const doc = new jsPDF();
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPosition = margin;
            
            // Title page
            doc.setFontSize(20);
            doc.setTextColor(0, 0, 128);
            doc.text("Search Results", margin, yPosition);
            
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            yPosition += 10;
            doc.text(`Query: "${query}"`, margin, yPosition);
            
            yPosition += 10;
            doc.text(`Results: ${results.length} transcriptions`, margin, yPosition);
            
            yPosition += 10;
            doc.text(`Date: ${new Date().toLocaleString()}`, margin, yPosition);
            
            // Add each result on a new page
            results.forEach((note, index) => {
                // Add a new page for each result (skip for first one as we already have a page)
                if (index > 0) {
                    doc.addPage();
                } else {
                    doc.addPage();
                }
                
                yPosition = margin;
                
                // Result title
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 128);
                doc.text(`${index + 1}. ${note.filename}`, margin, yPosition);
                
                // Metadata
                yPosition += 10;
                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text(`Language: ${note.language}`, margin, yPosition);
                
                yPosition += 6;
                doc.text(`Date: ${new Date(note.created_at).toLocaleString()}`, margin, yPosition);
                
                // Divider
                yPosition += 8;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                
                // Content
                yPosition += 10;
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                
                const textLines = doc.splitTextToSize(
                    note.transcription_text || 'No transcription available.', 
                    pageWidth - 2 * margin
                );
                
                doc.text(textLines, margin, yPosition);
            });
            
            // Save the combined PDF
            doc.save(`search-results-${query.substring(0,10)}.pdf`);
            
        } catch (err) {
            console.error('Error generating PDF for all results:', err);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Search Transcriptions</h1>
            <form onSubmit={handleSearch} className="mb-6 flex items-center gap-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (error) setError(null); // Clear error when user types
                    }}
                    placeholder="Search by keyword..."
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={searching}
                />
                <button
                    type="submit"
                    disabled={searching || !query.trim()}
                    className={`inline-flex items-center py-2 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${searching || !query.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        }`}
                >
                    {searching ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching...
                        </>
                    ) : 'Search'}
                </button>
            </form>

            {error && !results.length && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300 mb-4">{error}</p>}

            {!searching && query.trim() && !error && results.length === 0 && (
                 <p className="text-gray-600 italic">No results found for "{query}".</p>
            )}

            {results.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-gray-800">Search Results:</h2>
                        <button
                            onClick={exportAllResults}
                            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
                        >
                            <FaDownload className="mr-2" />
                            Export All Results
                        </button>
                    </div>
                    <div className="space-y-5">
                        {results.map((note) => (
                             <div key={note.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-semibold text-gray-800 truncate" title={note.filename}>{note.filename}</h3>
                                    <button
                                        onClick={() => generatePDF(note)}
                                        className="text-indigo-600 hover:text-indigo-800 transition-colors p-1"
                                        disabled={pdfGenerating === note.id}
                                        title="Export as PDF"
                                    >
                                        {pdfGenerating === note.id ? (
                                            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <FaFilePdf className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-1">Language: <span className="font-medium text-gray-700">{note.language}</span></p>
                                <p className="text-sm text-gray-500 mb-2">Date: <span className="font-medium text-gray-700">{new Date(note.created_at).toLocaleString()}</span></p>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                    {note.transcription_text || 'No transcription available.'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main App Component (Refactored Layout) ---
const App: React.FC = () => {
    return (
        <Router>
            <div className="flex h-screen bg-gray-50"> {/* Changed bg color */}
                <NavBar />
                {/* Main content area with padding to offset the fixed NavBar */}
                <main className="flex-1 p-8 ml-64 overflow-y-auto"> {/* Increased padding */}
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/record" element={<RecordPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/test" element={<TestPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        {/* Add other routes as needed */}
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;
