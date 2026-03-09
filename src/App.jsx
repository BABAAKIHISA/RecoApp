import { useState, useRef } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import '@aws-amplify/ui-react/styles.css';

const client = generateClient({
  authMode: 'userPool'
});

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Helper function to encode AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
      const channel1 = buffer.getChannelData(0);
      const channel2 = buffer.getChannelData(1);
      const length = channel1.length * 2;
      result = new Float32Array(length);
      for (let i = 0; i < channel1.length; i++) {
        result[i * 2] = channel1[i];
        result[i * 2 + 1] = channel2[i];
      }
    } else {
      result = buffer.getChannelData(0);
    }

    const dataLength = result.length * (bitDepth / 8);
    const bufferArray = new ArrayBuffer(44 + dataLength);
    const view = new DataView(bufferArray);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length minus RIFF identifier length and file description length
    view.setUint32(4, 36 + dataLength, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, format, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    // bits per sample
    view.setUint16(34, bitDepth, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataLength, true);

    // write the PCM samples
    floatTo16BitPCM(view, 44, result);

    return new Blob([view], { type: 'audio/wav' });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine a supported mimeType (Safari tends to be picky)
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else {
        // Fallback to browser default
        options = {};
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Create the blob using the actual mimeType used by the recorder
        const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const webmBlob = new Blob(audioChunksRef.current, { type: actualMimeType });

        // Convert to WAV
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const fileReader = new FileReader();

          fileReader.onloadend = async () => {
            const arrayBuffer = fileReader.result;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const wavBlob = audioBufferToWav(audioBuffer);
            const url = URL.createObjectURL(wavBlob);

            setAudioURL(url);
            setAudioBlob(wavBlob);
          };

          fileReader.readAsArrayBuffer(webmBlob);
        } catch (e) {
          console.error("Failed to convert audio to wav:", e);
          // Fallback if conversion fails
          const url = URL.createObjectURL(webmBlob);
          setAudioURL(url);
          setAudioBlob(webmBlob);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioBlob(null); // Reset on new recording
      setAudioURL('');
    } catch (err) {
      console.error("Error accessing microphone or initializing recorder:", err);
      alert("Error: Microphone access denied or recording not supported on this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all microphone tracks to release the recording indicator in the browser
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    try {
      setIsUploading(true);
      // Determine file extension
      let ext = 'wav';
      if (audioBlob.type.includes('mp4')) ext = 'mp4';
      else if (audioBlob.type.includes('ogg')) ext = 'ogg';
      else if (audioBlob.type.includes('webm')) ext = 'webm';

      const filename = `audio_${Date.now()}.${ext}`;

      const { data: uploadUrl, errors } = await client.queries.generateUploadUrl({
        filename: filename
      }, {
        authMode: 'userPool'
      });

      if (errors || !uploadUrl) {
        throw new Error("Failed to generate upload URL: " + JSON.stringify(errors));
      }

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: {
          'Content-Type': audioBlob.type,
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      alert("Upload successful!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <h1>Hello, {user?.signInDetails?.loginId}</h1>
            <button
              onClick={signOut}
              style={{ padding: '0.5rem 1rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </header>

          <section style={{ textAlign: 'center', padding: '2rem', background: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h2>Audio Recorder</h2>

            <div style={{ margin: '2rem 0', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  style={{ padding: '1rem 2rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                >
                  🎙️ Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  style={{ padding: '1rem 2rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}
                >
                  ⏹️ Stop Recording
                </button>
              )}
              {isRecording && <span style={{ color: '#f44336', fontWeight: 'bold' }}>Recording in progress...</span>}
            </div>

            {audioURL && (
              <div style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '2px dashed #ccc' }}>
                <h3>Playback</h3>
                <audio src={audioURL} controls style={{ width: '100%', marginTop: '1rem' }} />

                <div style={{ marginTop: '2rem' }}>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    style={{
                      padding: '1rem 2rem',
                      background: isUploading ? '#9e9e9e' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    {isUploading ? '⏳ Uploading...' : '☁️ Upload to S3'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </Authenticator>
  );
}
