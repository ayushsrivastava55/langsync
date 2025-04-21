import os
from datasets import load_dataset

# Directory to save sample audio files
output_dir = '../data/samples'
os.makedirs(output_dir, exist_ok=True)

# Load the mixed Cantonese and English speech dataset from Hugging Face
dataset = load_dataset('AlienKevin/mixed_cantonese_and_english_speech', split='train', streaming=True)

# Download a few samples (e.g., first 3 audio files)
for i, sample in enumerate(dataset):
    if i >= 3:  # Limit to 3 samples for now
        break
    audio = sample['audio']
    audio_path = os.path.join(output_dir, f'sample_{i}_{sample["topic"]}.wav')
    audio_data = audio['array']
    sample_rate = audio['sampling_rate']
    
    # Save audio file (requires 'soundfile' library or similar)
    try:
        import soundfile as sf
        sf.write(audio_path, audio_data, sample_rate)
        print(f'Saved {audio_path}')
    except ImportError:
        print("'soundfile' library not found. Install it with 'pip install soundfile' to save audio files.")
        print(f"Placeholder: Would save audio to {audio_path}")

print("Sample download complete. Check the '../data/samples' directory for audio files.")
