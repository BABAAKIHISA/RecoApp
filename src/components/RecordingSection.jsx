import { useState, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';
import { audioBufferToWav } from '../utils/audioUtils';

const client = generateClient({
  authMode: 'userPool'
});

export default function RecordingSection() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else {
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
        const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const webmBlob = new Blob(audioChunksRef.current, { type: actualMimeType });

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
          const url = URL.createObjectURL(webmBlob);
          setAudioURL(url);
          setAudioBlob(webmBlob);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioBlob(null);
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    try {
      setIsUploading(true);
      let ext = 'wav';
      if (audioBlob.type.includes('mp4')) ext = 'mp4';
      else if (audioBlob.type.includes('ogg')) ext = 'ogg';
      else if (audioBlob.type.includes('webm')) ext = 'webm';

      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const filename = `${year}${month}${day}${hours}${minutes}${seconds}.${ext}`;

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
    <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden relative">
      <div className="p-8 sm:p-12 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-0 px-4 mb-6">
          <h3 className="text-xl font-semibold text-slate-700 mb-3 text-left flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            録音
          </h3>

          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-8 min-h-[200px]">
              <div className="relative flex flex-col items-center">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="group relative flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-full transition-opacity"></div>
                    <svg className="w-10 h-10 text-white translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C10.3 2 9 3.3 9 5v7c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3zm0 14c-2.8 0-5.3-2.1-5.8-4.9H4.1C4.7 14.8 8 18 12 18s7.3-3.2 7.9-6.9h-2.1c-.5 2.8-3 4.9-5.8 4.9z" /><path d="M11 19h2v3h-2z" /></svg>
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
            </div>
            <div className="mb-2 mt-8 space-y-3">
              <div className="h-6 flex justify-center">
                {isRecording ? (
                  <span className="text-rose-500 font-medium tracking-wide animate-pulse flex justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-2"></span>
                    録音中...
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium text-sm">ボタンを押して録音してください。</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {audioURL && (
          <div className="mt-12 pt-10 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-0 px-4">
            <h3 className="text-xl font-semibold text-slate-700 mb-3 text-left flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              再生とアップロード
            </h3>

            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-sm">
              <audio src={audioURL} controls className="w-full h-12 outline-none rounded-lg" />

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={`group relative flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 ${isUploading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-indigo-500/30 transform hover:-translate-y-0.5'
                    }`}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>アップロード中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span>アップロード</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
