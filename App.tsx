import React, { useState, useEffect } from 'react';
import AudioRecorder from './components/AudioRecorder';
import ImageUploader from './components/ImageUploader';
import DiagnosisView from './components/DiagnosisView';
import ChatInterface from './components/ChatInterface';
import { analyzeProblem } from './services/geminiService';
import { saveDiagnosis, getAllHistory, clearHistoryDB } from './services/storageService';
import { AnalysisStatus, DiagnosisResult, InputMode } from './types';
import { ActivityIcon, SearchIcon, WrenchIcon, ImageIcon, HistoryIcon, UploadIcon, TrashIcon } from './components/Icons';

function App() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.AUDIO);
  const [textInput, setTextInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  // History State
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load History on Mount (IndexedDB)
  useEffect(() => {
    const loadHistory = async () => {
      const storedHistory = await getAllHistory();
      setHistory(storedHistory);
    };
    loadHistory();
  }, []);

  // Helper to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAudioAnalysis = async (audioBlob: Blob) => {
    try {
      setStatus('analyzing');
      const base64Audio = await blobToBase64(audioBlob);
      const result = await analyzeProblem(base64Audio, null, "");
      finishAnalysis(result);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        setStatus('analyzing');
        const base64Audio = await blobToBase64(file);
        const result = await analyzeProblem(base64Audio, null, "사용자가 업로드한 오디오 파일입니다.");
        finishAnalysis(result);
    } catch(error) {
        console.error(error);
        setStatus('error');
    }
  };

  const handleTextAnalysis = async () => {
    if (!textInput.trim()) return;
    try {
      setStatus('analyzing');
      const result = await analyzeProblem(null, null, textInput);
      finishAnalysis(result);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleImageAnalysis = async () => {
    if (!imageBase64) return;
    try {
        setStatus('analyzing');
        const result = await analyzeProblem(null, imageBase64, "");
        finishAnalysis(result);
    } catch (error) {
        console.error(error);
        setStatus('error');
    }
  };

  const finishAnalysis = async (result: DiagnosisResult) => {
    setDiagnosisResult(result);
    await saveDiagnosis(result);
    const updatedHistory = await getAllHistory();
    setHistory(updatedHistory);
    setStatus('complete');
  };

  const resetApp = () => {
    setStatus('idle');
    setDiagnosisResult(null);
    setTextInput('');
    setImageBase64(null);
    setShowChat(false);
  };

  const loadFromHistory = (item: DiagnosisResult) => {
    setDiagnosisResult(item);
    setStatus('complete');
    setShowHistory(false);
  };

  const clearHistory = async () => {
    if(confirm('모든 진단 기록을 삭제하시겠습니까?')) {
        await clearHistoryDB();
        setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 relative">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <WrenchIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-900">Fix It Now</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Pro</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors relative"
                title="진단 기록"
               >
                 <HistoryIcon className="w-6 h-6" />
                 {history.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                 )}
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* History Sidebar/Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
            <div className="relative bg-white w-80 h-full shadow-2xl p-6 overflow-y-auto animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-lg text-slate-800">진단 기록</h2>
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="text-red-500 hover:text-red-700 text-xs">전체 삭제</button>
                    )}
                </div>
                {history.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center mt-10">저장된 기록이 없습니다.</p>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div 
                                key={item.id} 
                                onClick={() => loadFromHistory(item)}
                                className="p-3 rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all shadow-sm"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-slate-700 text-sm">{item.appliance}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.probability > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {item.probability}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.issue}</p>
                                <p className="text-[10px] text-slate-400 mt-2 text-right">
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Intro / Hero (Only show when idle) */}
        {status === 'idle' && (
          <div className="text-center max-w-2xl mx-auto mb-12 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight break-keep">
              가전제품 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">자가 수리</span>의 시작
            </h1>
            <p className="text-lg text-slate-600 mb-8 break-keep">
              소음, 사진, 텍스트 무엇이든 입력하세요. 실제 매뉴얼 데이터를 기반으로 AI가 정확한 해결책을 찾아드립니다.
            </p>
          </div>
        )}

        {/* Input Section (Only show when idle) */}
        {status === 'idle' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setInputMode(InputMode.AUDIO)}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  inputMode === InputMode.AUDIO 
                    ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ActivityIcon className="w-4 h-4" />
                소리
              </button>
              <button
                onClick={() => setInputMode(InputMode.IMAGE)}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  inputMode === InputMode.IMAGE 
                    ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                사진
              </button>
              <button
                onClick={() => setInputMode(InputMode.TEXT)}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  inputMode === InputMode.TEXT 
                    ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SearchIcon className="w-4 h-4" />
                검색
              </button>
            </div>

            <div className="p-6">
              {inputMode === InputMode.AUDIO && (
                <div className="animate-fade-in flex flex-col gap-4">
                   <AudioRecorder onRecordingComplete={handleAudioAnalysis} />
                   <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">또는 파일 업로드</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                   </div>
                   <label className="flex items-center justify-center w-full p-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors text-sm">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        MP3/WAV 파일 선택
                        <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
                   </label>
                </div>
              )}

              {inputMode === InputMode.IMAGE && (
                <div className="animate-fade-in">
                    <ImageUploader 
                        onImageSelected={setImageBase64}
                        onAnalyze={handleImageAnalysis}
                    />
                </div>
              )}

              {inputMode === InputMode.TEXT && (
                <div className="animate-fade-in space-y-4">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="증상을 자세히 설명해주세요 (예: 에러 코드 E4가 깜빡여요)"
                    className="w-full h-40 p-4 rounded-xl bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-white placeholder:text-slate-500 break-keep shadow-inner"
                  />
                  <button
                    onClick={handleTextAnalysis}
                    disabled={!textInput.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                  >
                    증상 분석하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="mt-8 text-2xl font-bold text-slate-800">Gemini AI가 분석 중...</h2>
            <p className="text-slate-500 mt-2">매뉴얼 데이터베이스(RAG) 검색 및 패턴 매칭</p>
          </div>
        )}

        {/* Results State */}
        {status === 'complete' && diagnosisResult && (
          <DiagnosisView 
            result={diagnosisResult} 
            onOpenChat={() => setShowChat(true)}
            onReset={resetApp}
          />
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-fade-in">
            <h3 className="text-red-800 font-bold text-lg mb-2">분석 실패</h3>
            <p className="text-red-600 mb-6 break-keep">요청을 처리할 수 없습니다. 인터넷 연결을 확인하거나 다시 시도해 주세요.</p>
            <button 
              onClick={resetApp}
              className="bg-white border border-red-200 text-red-700 hover:bg-red-50 font-medium py-2 px-6 rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Chat Overlay */}
        {showChat && diagnosisResult && (
          <ChatInterface 
            diagnosisContext={diagnosisResult} 
            onClose={() => setShowChat(false)} 
          />
        )}

      </main>
    </div>
  );
}

export default App;