
import React, { useState, useEffect } from 'react';
import AudioRecorder from './components/AudioRecorder';
import ImageUploader from './components/ImageUploader';
import DiagnosisView from './components/DiagnosisView';
import ChatInterface from './components/ChatInterface';
import FollowUpQuestions from './components/FollowUpQuestions';
import GuidedTextInput from './components/GuidedTextInput';
import ExtractionConfirmation from './components/ExtractionConfirmation';
import { analyzeProblem } from './services/geminiService';
import { saveDiagnosis, getAllHistory, clearHistoryDB } from './services/storageService';
import { AnalysisStatus, DiagnosisResult, InputMode, MediaInput } from './types';
import { ActivityIcon, SearchIcon, WrenchIcon, ImageIcon, HistoryIcon, UploadIcon } from './components/Icons';

function App() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.AUDIO);
  const [textSubMode, setTextSubMode] = useState<'free' | 'guided'>('free');
  const [textInput, setTextInput] = useState('');
  
  // Stored inputs for multi-stage analysis
  const [lastAudio, setLastAudio] = useState<MediaInput | null>(null);
  const [lastImage, setLastImage] = useState<MediaInput | null>(null);
  const [lastText, setLastText] = useState('');

  // Local state for image uploader selection
  const [selectedImage, setSelectedImage] = useState<MediaInput | null>(null);

  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [pendingDiagnosis, setPendingDiagnosis] = useState<DiagnosisResult | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isApiKeyMissing = !process.env.API_KEY || process.env.API_KEY === '';

  useEffect(() => {
    const loadHistory = async () => {
      const storedHistory = await getAllHistory();
      setHistory(storedHistory);
    };
    loadHistory();
  }, []);

  const blobToMediaInput = (blob: Blob, mimeOverride?: string): Promise<MediaInput> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          base64: base64String,
          mimeType: mimeOverride || blob.type || 'application/octet-stream'
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processAnalysis = async (audio: MediaInput | null, image: MediaInput | null, text: string) => {
    try {
      setStatus('analyzing');
      setLastAudio(audio);
      setLastImage(image);
      setLastText(text);

      const result = await analyzeProblem(audio, image, text);
      
      // Sprint 5: If it's an image input and we found extraction details, ask for confirmation
      const hasExtraction = result.detectedBrand || result.detectedModel || result.detectedErrorCode;
      if (image && hasExtraction && status !== 'confirm-extraction') {
        setPendingDiagnosis(result);
        setStatus('confirm-extraction');
        return;
      }

      if (result.needsFollowUp && result.followUpQuestions && result.followUpQuestions.length > 0) {
        setPendingDiagnosis(result);
        setStatus('follow-up');
      } else {
        finishAnalysis(result);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleConfirmExtraction = async (confirmedData: { brand: string; model: string; errorCode: string }) => {
    try {
      setStatus('analyzing');
      const finalResult = await analyzeProblem(lastAudio, lastImage, lastText, undefined, undefined, confirmedData);
      
      if (finalResult.needsFollowUp && finalResult.followUpQuestions && finalResult.followUpQuestions.length > 0) {
        setPendingDiagnosis(finalResult);
        setStatus('follow-up');
      } else {
        finishAnalysis(finalResult);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleFinalize = async (answers: Record<string, string | string[]>) => {
    if (!pendingDiagnosis) return;
    try {
      setStatus('analyzing');
      const finalResult = await analyzeProblem(lastAudio, lastImage, lastText, pendingDiagnosis, answers);
      finishAnalysis(finalResult);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const finishAnalysis = async (result: DiagnosisResult) => {
    setDiagnosisResult(result);
    setPendingDiagnosis(null);
    await saveDiagnosis(result);
    const updatedHistory = await getAllHistory();
    setHistory(updatedHistory);
    setStatus('complete');
  };

  const resetApp = () => {
    setStatus('idle');
    setDiagnosisResult(null);
    setPendingDiagnosis(null);
    setTextInput('');
    setLastAudio(null);
    setLastImage(null);
    setSelectedImage(null);
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

  if (isApiKeyMissing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md space-y-4">
          <div className="bg-rose-500/10 p-4 rounded-full inline-block">
             <WrenchIcon className="w-12 h-12 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold">API 키가 필요합니다</h1>
          <p className="text-slate-400">앱을 실행하기 위해 Google AI Studio에서 발급받은 API 키가 환경 변수로 설정되어야 합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12 relative">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <WrenchIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">Fix It Now</span>
            </div>
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-slate-500 hover:text-indigo-600 transition-colors relative"
               >
                 <HistoryIcon className="w-6 h-6" />
                 {history.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative bg-white w-80 h-full shadow-2xl p-6 overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">진단 기록</h2>
              {history.length > 0 && <button onClick={clearHistory} className="text-red-500 text-xs">전체 삭제</button>}
            </div>
            {history.length === 0 ? <p className="text-slate-400 text-sm text-center">기록이 없습니다.</p> : (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} onClick={() => loadFromHistory(item)} className="p-3 border rounded-lg cursor-pointer hover:bg-indigo-50 transition-all">
                    <span className="font-semibold text-sm">{item.appliance}</span>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {(status === 'idle' || status === 'too-short') && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="flex border-b">
              <button onClick={() => setInputMode(InputMode.AUDIO)} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${inputMode === InputMode.AUDIO ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
                <ActivityIcon className="w-4 h-4" /> 소음
              </button>
              <button onClick={() => setInputMode(InputMode.IMAGE)} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${inputMode === InputMode.IMAGE ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
                <ImageIcon className="w-4 h-4" /> 사진
              </button>
              <button onClick={() => setInputMode(InputMode.TEXT)} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${inputMode === InputMode.TEXT ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
                <SearchIcon className="w-4 h-4" /> 증상
              </button>
            </div>
            <div className="p-6">
              {status === 'too-short' && <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">3초 이상 녹음해주세요.</div>}
              
              {inputMode === InputMode.AUDIO && (
                <AudioRecorder onRecordingComplete={(b, m) => blobToMediaInput(b, m).then(i => processAnalysis(i, null, ""))} onDurationError={() => setStatus('too-short')} />
              )}
              
              {inputMode === InputMode.IMAGE && (
                <ImageUploader 
                  onImageSelected={(d) => setSelectedImage(d ? {base64: d.base64, mimeType: d.mimeType} : null)} 
                  onAnalyze={() => selectedImage && processAnalysis(null, selectedImage, "")} 
                />
              )}
              
              {inputMode === InputMode.TEXT && (
                <div className="space-y-6">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setTextSubMode('free')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${textSubMode === 'free' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                      자유 입력
                    </button>
                    <button 
                      onClick={() => setTextSubMode('guided')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${textSubMode === 'guided' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                      가이드 입력
                    </button>
                  </div>
                  
                  {textSubMode === 'free' ? (
                    <div className="animate-fade-in space-y-4">
                      <textarea 
                        value={textInput} 
                        onChange={e => setTextInput(e.target.value)} 
                        placeholder="증상을 자유롭게 설명해주세요 (예: 에어컨에서 틱틱 소리가 나요)" 
                        className="w-full h-40 p-4 rounded-xl bg-slate-800 text-white outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500" 
                      />
                      <button 
                        onClick={() => processAnalysis(null, null, textInput)} 
                        disabled={!textInput.trim()}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg"
                      >
                        진단하기
                      </button>
                    </div>
                  ) : (
                    <GuidedTextInput onSubmit={(summary) => processAnalysis(null, null, summary)} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="mt-6 text-xl font-bold">AI가 매뉴얼 데이터를 분석 중입니다...</h2>
          </div>
        )}

        {status === 'confirm-extraction' && pendingDiagnosis && (
          <ExtractionConfirmation 
            extracted={pendingDiagnosis} 
            onConfirm={handleConfirmExtraction} 
            onCancel={resetApp} 
          />
        )}
        
        {status === 'follow-up' && pendingDiagnosis && (
          <FollowUpQuestions 
            diagnosis={pendingDiagnosis} 
            onSubmit={handleFinalize} 
            onSkip={() => finishAnalysis(pendingDiagnosis)} 
          />
        )}

        {status === 'complete' && diagnosisResult && (
          <DiagnosisView result={diagnosisResult} onOpenChat={() => setShowChat(true)} onReset={resetApp} />
        )}

        {status === 'error' && (
          <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-700 font-bold mb-4">분석 중 오류가 발생했습니다.</p>
            <button onClick={resetApp} className="bg-white border border-red-200 px-6 py-2 rounded-lg text-red-600">다시 시도</button>
          </div>
        )}

        {showChat && diagnosisResult && <ChatInterface diagnosisContext={diagnosisResult} onClose={() => setShowChat(false)} />}
      </main>
    </div>
  );
}

export default App;
