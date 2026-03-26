import { Authenticator } from '@aws-amplify/ui-react';
import Header from '../components/Header';
import UserInfo from './components/UserInfo';
import RecordingSection from './components/RecordingSection';
import AudioList from './components/AudioList';
import '@aws-amplify/ui-react/styles.css';
import { useState } from 'react';

export default function App() {
  const [showAudioList, setShowAudioList] = useState(false);
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <>
          <Header onToggleAudioList={() => setShowAudioList(true)} />
          <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
            <div className="max-w-3xl mx-auto space-y-10">
              <UserInfo user={user} signOut={signOut} />
              <RecordingSection />
            </div>
          </main>
          {showAudioList && <AudioList onClose={() => setShowAudioList(false)} />}
        </>
      )}
    </Authenticator>
  );
}