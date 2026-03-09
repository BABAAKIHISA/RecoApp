import { useState, useRef } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { uploadData } from 'aws-amplify/storage';
import '@aws-amplify/ui-react/styles.css';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

      mediaRecorderRef.current.onstop = () => {
        // Create the blob using the actual mimeType used by the recorder
        const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
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
      let ext = 'webm';
      if (audioBlob.type.includes('mp4')) ext = 'mp4';
      else if (audioBlob.type.includes('ogg')) ext = 'ogg';
      else if (audioBlob.type.includes('wav')) ext = 'wav';

      const filename = `audio_${Date.now()}.${ext}`;

      await uploadData({
        path: () => `public/${filename}`,
        data: audioBlob,
        options: {
          contentType: audioBlob.type,
          bucket: {
            bucketName: 'recoding-upload-baba',
            region: 'ap-southeast-2'
          }
        }
      }).result;

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
