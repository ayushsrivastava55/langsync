// frontend/src/components/AudioRecorder.tsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

interface AudioRecorderProps {}

const AudioRecorder: React.FC<AudioRecorderProps> = () => {
    // State for recording
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [language, setLanguage] = useState('en');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ transcription: string; summary?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
            
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
        };
    }, [audioURL]);

    const startRecording = async () => {
        // Reset any previous recordings
        setAudioBlob(null);
        setAudioURL(null);
        setError(null);
        setResult(null);
        audioChunksRef.current = [];
        setRecordingTime(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            });

            mediaRecorder.addEventListener('stop', () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioURL(audioUrl);
                setAudioBlob(audioBlob);
                
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
                
                // Clear the timer
                if (timerRef.current) {
                    window.clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            });

            // Start recording
            mediaRecorder.start();
            setIsRecording(true);
            
            // Start the timer
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prevTime => prevTime + 1);
            }, 1000);
            
        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Could not access the microphone. Please check your browser permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleUpload = async () => {
        if (!audioBlob) {
            setError('No audio recorded yet.');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);
        console.log(`Uploading recording with language: ${language}`);

        try {
            const formData = new FormData();
            const filename = `recording-${Date.now()}.wav`;
            formData.append('file', audioBlob, filename);
            formData.append('language', language);

            const response = await axios.post(`${API_URL}/upload-audio/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Upload response:', response.data);
            setResult({
                transcription: response.data.transcription || 'No transcription available.',
                summary: response.data.summary
            });

        } catch (err) {
            console.error('Error uploading audio:', err);
            setError('Upload failed. Please check the backend or try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(event.target.value);
        setError(null);
    };

    return (
        <div className="p-6 border border-gray-200 rounded-lg shadow-md bg-white max-w-xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Record Audio</h2>

            <div className="mb-5">
                <label htmlFor="language-select-recorder" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Language:
                </label>
                <select
                    id="language-select-recorder"
                    value={language}
                    onChange={handleLanguageChange}
                    disabled={uploading || isRecording}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white"
                >
                    <option value="en">English</option>
                    <option value="zh">Mandarin (Simplified Chinese)</option>
                    <option value="yue">Cantonese</option>
                </select>
            </div>

            <div className="flex flex-col items-center gap-4 mb-5">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={uploading}
                    className={`px-6 py-3 rounded-full flex items-center justify-center w-48 shadow-md transition-colors ${
                        isRecording 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isRecording ? (
                        <>
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" />
                            </svg>
                            Stop Recording
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Recording
                        </>
                    )}
                </button>

                {isRecording && (
                    <div className="text-center">
                        <p className="text-red-500 font-medium">Recording: {formatTime(recordingTime)}</p>
                        <div className="flex justify-center mt-2 space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-100"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-200"></div>
                        </div>
                    </div>
                )}
            </div>

            {audioURL && !isRecording && (
                <div className="text-center mb-5 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-green-600 font-medium mb-2">Recording complete. Ready to upload.</p>
                    <audio controls src={audioURL} className="mt-2 mx-auto w-full max-w-md"></audio>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!audioBlob || uploading || isRecording}
                className={`w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition duration-150 ease-in-out ${
                    !audioBlob || uploading || isRecording
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
            >
                {uploading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                    </>
                ) : 'Upload Recording'}
            </button>

            {error && (
                <p className="mt-4 text-center text-sm text-red-600 bg-red-100 p-3 rounded-md border border-red-300">{error}</p>
            )}

            {result && (
                <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Transcription Result:</h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3 leading-relaxed">{result.transcription}</p>
                    {result.summary && (
                         <>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Summary:</h3>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{result.summary}</p>
                         </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
