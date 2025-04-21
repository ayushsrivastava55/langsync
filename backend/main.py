from fastapi import FastAPI, File, UploadFile, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import sqlite3
from datetime import datetime
# Import MMS model for English transcription
import torch
from transformers import Wav2Vec2ForCTC, AutoProcessor, AutoModelForCTC
import numpy as np
import librosa
# Import ModelScope for Alibaba ASR (Cantonese and Mandarin)
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks

app = FastAPI(title="Multilingual Note-Taking AI Agent API")

# MMS Model ID for English transcription
MODEL_ID = "facebook/mms-1b-all"

# Supported languages
SUPPORTED_LANGUAGES = {
    "en": "English",
    "zh": "Mandarin",
    "yue": "Cantonese"
}

# Database setup
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data/notes.db")
if not os.path.exists(os.path.dirname(db_path)):
    os.makedirs(os.path.dirname(db_path))
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("""CREATE TABLE IF NOT EXISTS notes
                (id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                transcript TEXT,
                summary TEXT,
                action_items TEXT,
                language TEXT,
                created_at TIMESTAMP)""")
conn.commit()

# Load MMS model for the specified language (used for English)
def load_mms_model(language="en"):
    # Map language codes to MMS supported codes
    lang_map = {
        "en": "eng",
        "zh": "cmn-script_simplified",  # Mandarin Chinese as per MMS ISO 639-3 code with script
        "yue": "cmn-script_simplified",  # Cantonese mapped to Mandarin Chinese code as MMS may not distinctly support 'yue'
    }
    target_lang = lang_map.get(language, "eng")  # Default to English if not found
    try:
        processor = AutoProcessor.from_pretrained(MODEL_ID, target_lang=target_lang)
        model = AutoModelForCTC.from_pretrained(MODEL_ID)
        return processor, model
    except KeyError as e:
        print(f"Language {language} (mapped to {target_lang}) not supported by MMS model. Defaulting to English. Error: {str(e)}")
        processor = AutoProcessor.from_pretrained(MODEL_ID, target_lang="eng")
        model = AutoModelForCTC.from_pretrained(MODEL_ID)
        return processor, model

# Load Alibaba ASR model from ModelScope (used for Cantonese and Mandarin)
def load_alibaba_asr_model(language="zh"):
    # Map language to Alibaba ASR model IDs
    model_map = {
        "zh": "damo/speech_paraformer-large_asr_nat-zh-cn-16k-aishell-vocab5212-pytorch",  # Mandarin model
        "yue": "damo/speech_paraformer-large-vad-punc_asr_nat-cantonese-16k-vocab1000-pytorch"  # Cantonese model
    }
    model_id = model_map.get(language, model_map["zh"])  # Default to Mandarin if not found
    asr_pipeline = pipeline(
        task=Tasks.auto_speech_recognition,
        model=model_id
    )
    return asr_pipeline

# Audio transcription using MMS (for English) or Alibaba ASR (for Mandarin/Cantonese)
def transcribe_audio(file_path, language="en"):
    if language == "en":
        # Use MMS for English
        processor, model = load_mms_model(language)
        try:
            # Load audio file
            audio, sr = librosa.load(file_path, sr=16000)  # MMS model expects 16kHz sample rate
            
            # Process audio input for the model
            inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
            
            # Generate transcription
            with torch.no_grad():
                outputs = model(**inputs)
                ids = torch.argmax(outputs.logits, dim=-1)[0]
                transcription = processor.decode(ids)
            
            return transcription
        except Exception as e:
            print(f"Error during MMS transcription: {str(e)}")
            return f"Simulated transcript of {os.path.basename(file_path)} in {SUPPORTED_LANGUAGES.get(language, 'English')}. Error occurred: {str(e)}"
    else:
        # Use Alibaba ASR for Mandarin or Cantonese
        asr_pipeline = load_alibaba_asr_model(language)
        try:
            # Perform transcription
            result = asr_pipeline(file_path)
            transcription = result.get("text", "")
            return transcription if transcription else f"No transcription output for {os.path.basename(file_path)} in {SUPPORTED_LANGUAGES.get(language, 'Unknown')}"
        except Exception as e:
            print(f"Error during Alibaba ASR transcription: {str(e)}")
            return f"Simulated transcript of {os.path.basename(file_path)} in {SUPPORTED_LANGUAGES.get(language, 'Unknown')}. Error occurred: {str(e)}"

class NoteResponse(BaseModel):
    id: int
    filename: str
    summary: str

@app.post("/upload-audio/")
async def upload_audio(file: UploadFile = File(...), language: str = "en"):
    try:
        # Save uploaded file
        file_path = f"../data/{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Perform transcription using MMS model or Alibaba ASR
        transcript = transcribe_audio(file_path, language)
        # Placeholder for summarization logic
        summary = f"Summary of {file.filename}"

        # Store in database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO notes (title, transcript, summary, language) VALUES (?, ?, ?, ?)",
                       (file.filename, transcript, summary, language))
        conn.commit()
        note_id = cursor.lastrowid
        conn.close()

        return JSONResponse(content={"id": note_id, "filename": file.filename, "summary": summary})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notes/", response_model=list[NoteResponse])
async def get_notes():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, summary FROM notes")
        notes = [{"id": row[0], "filename": row[1], "summary": row[2]} for row in cursor.fetchall()]
        conn.close()
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search/")
async def search_notes(query: str):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, summary FROM notes WHERE transcript LIKE ? OR summary LIKE ?",
                       (f"%{query}%", f"%{query}%"))
        notes = [{"id": row[0], "filename": row[1], "summary": row[2]} for row in cursor.fetchall()]
        conn.close()
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-transcription/")
async def test_transcription():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data/samples")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)  # Create data directory if it doesn't exist
    sample_files = [f for f in os.listdir(data_dir) if f.endswith(".wav")]
    if not sample_files:
        return {"error": "No sample audio files found in data/samples directory."}
    
    # Cycle through all sample files to test transcription
    results = []
    for sample_file in sample_files:
        sample_audio_path = os.path.join(data_dir, sample_file)
        # Determine language based on filename or default to Cantonese for testing
        if "天氣" in sample_file or "香港" in sample_file:
            language = "yue"  # Cantonese
        elif "zh" in sample_file.lower():
            language = "zh"  # Mandarin
        else:
            language = "en"  # Default to English
        transcript = transcribe_audio(sample_audio_path, language)
        results.append({"filename": sample_file, "language": language, "transcript": transcript})
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
