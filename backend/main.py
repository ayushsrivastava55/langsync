from fastapi import FastAPI, File, UploadFile, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sqlite3
from datetime import datetime
# Import MMS model for English transcription
import torch
from transformers import Wav2Vec2ForCTC, AutoProcessor, AutoModelForCTC, AutoModelForSeq2SeqLM, MarianMTModel, MarianTokenizer
import numpy as np
import librosa
# Import ModelScope for Alibaba ASR (Cantonese and Mandarin)
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks
# Alibaba Cloud ISI API integration (using aliyun-python-sdk-core)
import os
import json
import time
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

app = FastAPI(title="Multilingual Note-Taking AI Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Alibaba Cloud ISI transcription using a public file link

def transcribe_with_alibaba(file_link, language):
    """
    file_link: public URL to the audio file (must be accessible by Alibaba ISI)
    language: 'zh' for Mandarin, 'yue' for Cantonese
    Returns: transcription string or empty string on failure
    """
    REGION_ID = "ap-southeast-1"
    PRODUCT = "nls-filetrans"
    DOMAIN = "filetrans.ap-southeast-1.aliyuncs.com"
    API_VERSION = "2019-08-23"
    POST_REQUEST_ACTION = "SubmitTask"
    GET_REQUEST_ACTION = "GetTaskResult"
    STATUS_SUCCESS = "SUCCESS"
    STATUS_RUNNING = "RUNNING"
    STATUS_QUEUEING = "QUEUEING"
    appkey = os.environ.get('ALIBABA_CLOUD_APPKEY')
    akId = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_ID')
    akSecret = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET')
    if not (appkey and akId and akSecret):
        print("Alibaba Cloud ISI credentials not set. Skipping ISI transcription.")
        return ""
    client = AcsClient(akId, akSecret, REGION_ID)
    postRequest = CommonRequest()
    postRequest.set_domain(DOMAIN)
    postRequest.set_version(API_VERSION)
    postRequest.set_product(PRODUCT)
    postRequest.set_action_name(POST_REQUEST_ACTION)
    postRequest.set_method('POST')
    task = {
        "appkey": appkey,
        "file_link": file_link,
        "version": "4.0",
        "enable_words": False
    }
    postRequest.add_body_params("Task", json.dumps(task))
    try:
        postResponse = client.do_action_with_exception(postRequest)
        postResponse = json.loads(postResponse)
        statusText = postResponse.get("StatusText", "")
        if statusText != STATUS_SUCCESS:
            print(f"Failed to submit ISI job: {postResponse}")
            return ""
        taskId = postResponse.get("TaskId", "")
    except Exception as e:
        print(f"Exception submitting ISI job: {e}")
        return ""
    # Poll for result
    getRequest = CommonRequest()
    getRequest.set_domain(DOMAIN)
    getRequest.set_version(API_VERSION)
    getRequest.set_product(PRODUCT)
    getRequest.set_action_name(GET_REQUEST_ACTION)
    getRequest.set_method('GET')
    getRequest.add_query_param("TaskId", taskId)
    statusText = ""
    resultText = ""
    for _ in range(30):  # up to 5 minutes
        try:
            getResponse = client.do_action_with_exception(getRequest)
            getResponse = json.loads(getResponse)
            statusText = getResponse.get("StatusText", "")
            if statusText == STATUS_RUNNING or statusText == STATUS_QUEUEING:
                time.sleep(10)
                continue
            elif statusText == STATUS_SUCCESS:
                resultText = getResponse.get("Result", {}).get("Transcription", "")
                break
            else:
                print(f"ISI job failed or unknown status: {getResponse}")
                break
        except Exception as e:
            print(f"Exception polling ISI result: {e}")
            break
    return resultText

# Translation function to translate non-English text to English
def translate_to_english(text, source_language):
    try:
        if not text or len(text.strip()) == 0:
            print(f"Translation skipped: Empty or invalid input text for language {source_language}")
            return "Translation skipped: No text to translate"
        
        # Map language codes to Helsinki-NLP/opus-mt model codes
        model_map = {
            "zh": "Helsinki-NLP/opus-mt-zh-en",  # Chinese to English
            "yue": "Helsinki-NLP/opus-mt-zh-en",  # Use Chinese model for Cantonese too
        }
        
        model_name = model_map.get(source_language)
        if not model_name:
            print(f"Translation not available: No model defined for language {source_language}")
            return f"Translation not available for language: {source_language}"
        
        print(f"Loading translation model: {model_name} for language {source_language}")
        # Load translation model and tokenizer
        tokenizer = MarianTokenizer.from_pretrained(model_name)
        model = MarianMTModel.from_pretrained(model_name)
        print(f"Translation model loaded successfully for language {source_language}")
        
        print(f"Translating text: '{text[:100]}...' (first 100 chars) from {source_language} to English")
        # Translate the text
        inputs = tokenizer(text, return_tensors="pt", padding=True)
        with torch.no_grad():
            translated_ids = model.generate(**inputs)
        translated_text = tokenizer.batch_decode(translated_ids, skip_special_tokens=True)[0]
        print(f"Translation successful: '{translated_text[:100]}...' (first 100 chars)")
        
        return translated_text
    except Exception as e:
        error_msg = f"Translation error for language {source_language}: {str(e)}"
        print(error_msg)
        return error_msg

# Audio transcription using MMS (for English) or Alibaba ASR (for Mandarin/Cantonese)
def transcribe_audio(file_path, language):
    try:
        print(f"Starting transcription for file: {file_path}, language: {language}")
        # Check if Alibaba Cloud credentials are set for Chinese languages
        if language in ['zh', 'yue'] and all(os.environ.get(key) for key in ['ALIBABA_CLOUD_ACCESS_KEY_ID', 'ALIBABA_CLOUD_ACCESS_KEY_SECRET', 'ALIBABA_CLOUD_APPKEY']):
            print(f"Using Alibaba Cloud ISI API for language: {language}")
            transcription = transcribe_with_alibaba(file_path, language)
            if transcription:
                print(f"Transcription (Alibaba): {transcription[:100]}... (first 100 chars)")
                translation = translate_to_english(transcription, language) if language != "en" else ""
                return transcription, translation
            else:
                print(f"Alibaba transcription failed, falling back to MMS model")
                # Fall back to MMS if Alibaba fails
        
        # Load audio file
        audio, sr = librosa.load(file_path, sr=16000)
        
        # Load MMS model based on language
        model_name = MODEL_ID
        print(f"Loading MMS model: {model_name} for language {language}")
        processor = AutoProcessor.from_pretrained(model_name)
        model = AutoModelForCTC.from_pretrained(model_name)
        print(f"MMS model loaded successfully for language {language}")
        
        # Process audio
        inputs = processor(audio, sampling_rate=sr, return_tensors="pt", padding=True)
        
        # Perform transcription
        with torch.no_grad():
            logits = model(**inputs).logits
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)[0]
        print(f"Transcription (MMS): {transcription[:100]}... (first 100 chars)")
        
        # Translate if not English
        translation = translate_to_english(transcription, language) if language != "en" else ""
        return transcription, translation
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return f"Transcription error: {str(e)}", f"Translation error due to transcription failure: {str(e)}"

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
        # This now returns both transcription and translation (if applicable)
        transcript, translation = transcribe_audio(file_path, language)
        
        # Placeholder for summarization logic
        summary = f"Summary of {file.filename}"

        # Store in database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Update database schema if needed to store translations
        cursor.execute("PRAGMA table_info(notes)")
        columns = [column[1] for column in cursor.fetchall()]
        if "translation" not in columns:
            cursor.execute("ALTER TABLE notes ADD COLUMN translation TEXT")
            conn.commit()
        
        cursor.execute("INSERT INTO notes (title, transcript, translation, summary, language) VALUES (?, ?, ?, ?, ?)",
                       (file.filename, transcript, translation, summary, language))
        conn.commit()
        note_id = cursor.lastrowid
        conn.close()

        # Return both transcription and translation in the response
        response_data = {
            "id": note_id, 
            "filename": file.filename, 
            "transcription": transcript, 
            "summary": summary
        }
        
        # Add translation to response if available
        if translation:
            response_data["translation"] = translation
            
        return JSONResponse(content=response_data)
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
