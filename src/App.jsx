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
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center sm:items-center space-y-4 sm:space-y-0 bg-white/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-white/80">
              <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                {user?.signInDetails?.loginId || 'User'}
              </h1>
              <button
                onClick={signOut}
                className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Sign out
              </button>
            </header>

            {/* Main Content */}
            <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden relative">
              <div className="p-8 sm:p-12 text-center">
                <div className="mb-10 space-y-3">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Audio Studio</h2>
                  <p className="text-slate-500 max-w-md mx-auto">Capture your voice directly from the browser with clarity and easily upload it.</p>
                </div>

                {/* Recording Controls */}
                <div className="flex flex-col items-center justify-center space-y-8 min-h-[200px]">
                  <div className="relative flex flex-col items-center">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="group relative flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-full transition-opacity"></div>
                        <svg className="w-10 h-10 text-white translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C10.3 2 9 3.3 9 5v7c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3zm0 14c-2.8 0-5.3-2.1-5.8-4.9H4.1C4.7 14.8 8 18 12 18s7.3-3.2 7.9-6.9h-2.1c-.5 2.8-3 4.9-5.8 4.9z"/><path d="M11 19h2v3h-2z" /></svg>
                      </button>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-60"></div>
                        <button
                          onClick={stopRecording}
                          className="group relative flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-rose-500 to-red-500 rounded-full shadow-lg shadow-rose-500/40 transition-all duration-300 transform hover:scale-105 z-10"
                        >
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></div>
                          <div className="w-8 h-8 bg-white rounded-sm"></div>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-6">
                    {isRecording ? (
                      <span className="text-rose-500 font-medium tracking-wide animate-pulse flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Recording in progress...
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-sm">Click the microphone to start</span>
                    )}
                  </div>
                </div>

                {/* Playback & Upload */}
                {audioURL && (
                  <div className="mt-12 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-0 px-4">
                    <h3 className="text-lg font-semibold text-slate-700 mb-6 text-left flex items-center gap-2">
                       <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       Playback & Upload
                    </h3>
                    
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <audio src={audioURL} controls className="w-full h-12 outline-none rounded-lg" />
                      
                      <div className="mt-8 flex justify-end">
                        <button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className={`group relative flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
                            isUploading 
                              ? 'bg-slate-400 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-indigo-500/30 transform hover:-translate-y-0.5'
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              <span>Upload to S3</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      )}
    </Authenticator>
  );
}
