# Multilingual Note-Taking AI Agent

This project is a submission for the Holon KBI Hackathon, aimed at building a multilingual note-taking AI agent that transcribes and summarizes meetings in English, Mandarin, and Cantonese. The agent supports audio upload, transcription, summarization, search, and PDF export functionalities.

## Overview
- **Frontend**: React for user interface
- **Backend**: FastAPI for API services
- **Transcription**: Alibaba Cloud ASR for multilingual support (English, Mandarin, Cantonese)
- **Summarization**: LangChain with Qwen/DeepSeek for meeting summaries
- **Storage**: SQLite for searchable transcripts
- **Output**: PDF generation for shareable reports

## Project Structure
```
├── frontend/            # React app for user interface
├── backend/             # FastAPI server and AI logic
│   ├── main.py          # FastAPI application with transcription endpoints
│   └── requirements.txt # Python dependencies
├── data/                # Sample audio files and database
│   ├── samples/         # Sample audio files for testing
│   └── notes.db         # SQLite database for storing transcriptions
├── docs/                # Design logic and submission materials
└── README.md            # Project overview
```

## Setup Instructions

### Prerequisites
- Python 3.8+ with pip
- Node.js 14+ with npm
- Git

### Backend Setup
1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd holon-kbi-hack
   ```

2. **Create and Activate a Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Backend Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
   Note: This will install all necessary packages including ModelScope for Alibaba ASR.

4. **Download Sample Audio Files** (optional):
   ```bash
   python download_samples.py
   ```
   This will download sample audio files in English, Mandarin, and Cantonese for testing.

5. **Start the Backend Server**:
   ```bash
   python -m uvicorn main:app --reload
   ```
   The server will start on http://127.0.0.1:8000

### Testing Transcription

1. **Test with Sample Audio Files**:
   - Open your browser and navigate to http://127.0.0.1:8000/test-transcription/
   - This endpoint will automatically transcribe all sample audio files in the data/samples directory
   - The results will show the filename, detected language, and transcription

2. **Upload Your Own Audio**:
   - Use the /upload-audio/ endpoint with a POST request
   - Specify the language parameter (en, zh, or yue for English, Mandarin, or Cantonese)
   - The API will return the transcription and store it in the database

### Frontend Setup (Coming Soon)
1. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Frontend Development Server**:
   ```bash
   npm start
   ```
   The frontend will be available at http://localhost:3000

## Features

- **Multilingual Transcription**: Supports English, Mandarin, and Cantonese using Alibaba ASR
- **Automatic Language Detection**: Identifies language from audio content
- **Searchable Database**: Store and retrieve transcriptions
- **PDF Export**: Generate shareable PDF reports (coming soon)
- **Summarization**: AI-powered meeting summaries with action items (coming soon)

## Troubleshooting

- **ModelScope Installation Issues**: If you encounter errors with ModelScope, try installing specific versions: `pip install modelscope==1.10.0 datasets==2.11.0`
- **Audio Processing Errors**: Ensure audio files are in WAV format with 16kHz sample rate for best results
- **Port Already in Use**: If port 8000 is already in use, specify a different port: `uvicorn main:app --reload --port 8001`

## Demo
A working demo will be provided showcasing transcription, summarization, and search features across supported languages.

## License
MIT
