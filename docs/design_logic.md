# Design Logic for Multilingual Note-Taking AI Agent

## Overview
This document outlines the design logic behind our multilingual note-taking AI agent, developed for the Holon KBI Hackathon. The agent is designed to transcribe and summarize meetings in English, Mandarin, and Cantonese, with features for search and PDF export.

## Architecture
- **Frontend (React)**: Provides an intuitive interface for uploading audio, viewing summaries, searching transcripts, and downloading PDFs. Designed for non-technical users with clear, large buttons and simple navigation.
- **Backend (FastAPI)**: Serves as the API bridge between frontend and backend logic, handling audio uploads, transcription requests, summarization, and database operations.
- **Transcription Module**: Utilizes Whisper or Alibaba Cloud ASR to convert audio to text, supporting multilingual input. Fine-tuning may be applied for accuracy in Mandarin and Cantonese.
- **Summarization Module**: Employs LangChain with Qwen or DeepSeek models to extract key points, action items, and decisions from transcripts. Training focuses on logical structuring across languages.
- **Database (SQLite)**: Stores transcripts and summaries for efficient keyword search and retrieval.
- **PDF Generation**: Uses `fpdf` to create shareable meeting summary reports.

## Agentic Nature
The AI goes beyond transcription by:
- Inferring speakers based on tone or pauses in audio.
- Structuring summaries logically with action items and decisions highlighted.
- Adapting to multilingual content through targeted model training.

## MCP Compliance
The project aligns with Model Context Protocol (MCP) principles to ensure context-aware model interactions. Specific implementation details will be updated as development progresses.

## Development Priorities
- **Clarity of Summaries (30% weight)**: Focus on structured, concise outputs.
- **Multilingual Accuracy (25% weight)**: Fine-tune models for English, Mandarin, and Cantonese.
- **Search & Sharing (20% weight)**: Implement robust search with SQLite and easy export options.
- **Ease of Use (15% weight)**: Simplify user interactions in the frontend.
- **Agentic Reasoning (10% weight)**: Enhance AI's contextual understanding through training.

## Future Iterations
- Real-time meeting integration with Zoom/Google Meet.
- Advanced speaker diarization for more accurate speaker inference.
- Expanded language support based on user feedback.

This design logic serves as the foundation for our submission, ensuring alignment with hackathon criteria and MCP guidelines.
