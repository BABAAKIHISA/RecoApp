import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';

const client = generateClient({
  authMode: 'userPool'
});

export default function AudioList({ onClose }) {
  const [recordedFiles, setRecordedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [searchInput, setSearchInput] = useState('')
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUploadedFiles = async () => {
      try {
        const { data, errors } = await client.queries.listUploadedFiles({}, { authMode: 'userPool' });
        if (errors) throw new Error(errors.map(e => e.message).join(', '));
        if (isMounted) {
          setRecordedFiles(data || []);
        }
      } catch (err) {
        console.error("ファイルの取得に失敗しました", err);
        if (isMounted) {
          alert("音声ファイルの取得に失敗しました。");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    };

    fetchUploadedFiles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (searchInput.length > 0) {
      setFilteredFiles(recordedFiles.filter((file) => file.key.includes(searchInput)));
    } else {
      setFilteredFiles(recordedFiles);
    }
  }, [searchInput, recordedFiles]);

  const executeDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await client.mutations.deleteUploadedFiles({ filename: fileToDelete });
      setRecordedFiles(recordedFiles.filter((file) => file.key !== fileToDelete));
    } catch (err) {
      console.error(err);
      alert("音声ファイルの削除に失敗しました。");
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* 背景のオーバーレイ */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            過去の録音音声一覧
          </h3>
          <input type='text' placeholder='音声を検索' className='ml-auto px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          {isLoadingFiles ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-500 font-medium">音声を読み込んでいます...</p>
            </div>
          ) : recordedFiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-slate-500 font-medium">アップロードされた音声はありません。</p>
            </div>
          ) : (
            <ul className="space-y-4 text-left">
              {filteredFiles.map((file) => (
                <li key={file.key} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col space-y-3 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center text-sm text-slate-600">
                    <span className="font-semibold text-slate-700 truncate mr-2" title={file.key}>{file.key.split('/').pop()}</span>
                    {file.lastModified && (
                      <span className="text-indigo-500 text-xs shrink-0 font-semibold bg-indigo-100 px-2 py-1 rounded-md">
                        {new Date(file.lastModified).toLocaleString('ja-JP')}
                      </span>
                    )}
                  </div>
                  <audio src={file.url} controls className="w-full h-10 outline-none rounded" />
                  <div className="flex justify-end">
                    <button
                      onClick={() => setFileToDelete(file.key)}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 削除確認モーダル */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeleting && setFileToDelete(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h4 className="text-lg font-bold text-slate-800">削除の確認</h4>
            </div>
            <p className="text-slate-600 mb-6 text-sm">
              <span className="font-semibold text-slate-700">{fileToDelete.split('/').pop()}</span> <br />を本当に削除しますか？<br />この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
