Build a multilingual note-taking AI agent that:
● Joins or records meetings (online or in-person)
● Transcribes and summarizes spoken content
● Allows users to search, view, and share notes
● Supports English, Mandarin, and Cantonese

🧹 MVP Scope
Inputs:
● Upload recorded audio or simulate meeting recordings (Zoom/Google Meet or
offline audio is fine)

Agent Capabilities:
● Transcribe audio using Alibaba Cloud ASR or any local open-source ASR
● Summarize meeting notes using LangChain + Qwen/DeepSeek or any other llm
(avoid openai)
● Search within transcriptions (by keyword or topic)
● Export notes as PDF or shareable text

Outputs:
● Concise meeting summary with action points
● Keyword-searchable transcript
● Exportable report (PDF)


### ❄️ Tech Stack Overview (Flexible)

| Step | Tech Stack                         | Role                             | Purpose                                                                 | FE/BE             |
|------|------------------------------------|----------------------------------|-------------------------------------------------------------------------|-------------------|
| 1    | React                              | User Interface                   | For uploading audio, viewing summaries, and downloading PDFs            | Frontend          |
| 2    | FastAPI                            | API Server                       | Bridges frontend and backend, handles requests                         | Frontend ↔ Backend|
| 3    | Whisper or Alibaba ASR             | Speech Recognition               | Converts meeting audio to text, supports multilingual input             | Backend           |
| 4    | LangChain + Qwen/DeepSeek          | Summarization & Action Extraction| Extracts key points, decisions, and action items                        | Backend           |
| 5    | SQLite                             | Search Indexing & Storage        | Lightweight DB for searchable transcripts                               | Backend           |
| 6    | PDF Generator (e.g., fpdf)         | Document Output                  | Generates shareable PDF reports from summaries                          | Backend           |
| 7    | Local Deployment/Alibaba Cloud     | Deployment Option                | Supports local testing, privacy, or China-specific hosting              | Deployment Env    |
| 8    | Local Deployment                   | Testing Environment              | Enables local testing without real Meta API                             | Deployment        |


🧠 Agentic Nature
This is not just a voice-to-text tool. Your AI should:
● Understand key points
● Structure summaries logically
● Recognize action items and decisions
● Adapt to multilingual content


### 🏠 Evaluation Criteria

| Criteria                     | Weight |
|-----------------------------|--------|
| Meeting Summary Clarity     | 30%    |
| Multilingual Transcription  | 25%    |
| Search & Sharing Functions  | 20%    |
| Ease of Use                 | 15%    |
| Agentic Reasoning           | 10%    |


🔧 Deliverables
● Public GitHub repo
● Working demo (local or recorded walkthrough)
● Sample input/output files
● 1-pager summary of agent design + screenshots

💡 Tips
● Start with offline audio files to reduce complexity
● Let the agent infer who said what (e.g., via tone or pause)
● Use simple UI for non-technical users (big buttons, clear flow)

✅ Submission Checklist
● GitHub repo with README
● Demo video or deployed link
● Meeting summary output (PDF)
● Transcription + search demo screenshots
● Brief PDF with design logic

📢 Focus on clarity, structure, and the multilingual edge — not flashy UI. Let your agent
listen, think, and write smart notes.