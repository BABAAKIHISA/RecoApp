import { useState, useRef } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');

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
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
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
              </div>
            )}
          </section>
        </main>
      )}
    </Authenticator>
  );
}
