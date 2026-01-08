
import React, { useState, useRef } from 'react';
import { DiagnosisResult } from '../types';
import { CheckCircleIcon, WrenchIcon, AlertTriangleIcon, VolumeUpIcon, StopIcon, MapPinIcon, DownloadIcon, ShareIcon, ActivityIcon, SearchIcon, TrashIcon } from './Icons';
import { findServiceCenters } from '../services/geminiService';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface DiagnosisViewProps {
  result: DiagnosisResult;
  onOpenChat: () => void;
  onReset: () => void;
  onMarkSolved: () => void;
  onMarkNotSolved: () => void;
  onRecheckRequest: () => void;
}

const DiagnosisView: React.FC<DiagnosisViewProps> = ({ result, onOpenChat, onReset, onMarkSolved, onMarkNotSolved, onRecheckRequest }) => {
  const [speakingStep, setSpeakingStep] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [centerResult, setCenterResult] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const speakText = (text: string, index: number) => {
    if (speakingStep === index) {
      window.speechSynthesis.cancel();
      setSpeakingStep(null);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingStep(index);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = () => setSpeakingStep(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleFindServiceCenter = () => {
    setLocating(true);
    setCenterResult(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const brand = result.userConfirmedData?.brand || result.detectedBrand;
          const res = await findServiceCenters(result.appliance, position.coords.latitude, position.coords.longitude, brand);
          setCenterResult(res || "주변에 검색된 서비스 센터가 없습니다.");
        } catch (err) {
          setCenterResult("서비스 센터 검색 중 오류가 발생했습니다.");
        } finally {
          setLocating(false);
        }
      }, (err) => {
        setCenterResult("위치 정보를 가져올 수 없습니다.");
        setLocating(false);
      });
    } else {
      setCenterResult("위치 정보 미지원 브라우저입니다.");
      setLocating(false);
    }
  };

  const safetyStyles = {
    HIGH: {
      bg: 'bg-rose-600',
      border: 'border-rose-700',
      text: 'text-white',
      title: '위험: 즉시 중단 필요',
      icon: <AlertTriangleIcon className="w-8 h-8 text-white animate-pulse" />
    },
    MEDIUM: {
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      text: 'text-amber-900',
      title: '주의: 안전 확인 필요',
      icon: <AlertTriangleIcon className="w-8 h-8 text-amber-500" />
    },
    LOW: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-900',
      title: '안전: 일반 진단',
      icon: <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
    }
  };

  const currentSafety = safetyStyles[result.safetyLevel];

  return (
    <div className="animate-fade-in-up w-full max-w-5xl mx-auto pb-24 px-4 sm:px-0">
      <div className="flex justify-between items-center mb-4">
        {result.isRecheck && (
           <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1">
             <ActivityIcon className="w-3 h-3" /> 재점검 결과
           </span>
        )}
        <div className="flex gap-2">
          <button className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm hover:bg-slate-50 transition-colors">
            <ShareIcon className="w-4 h-4" />공유
          </button>
          <button className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-sm hover:bg-slate-50 transition-colors">
            <DownloadIcon className="w-4 h-4" />PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Sprint 7 Comparison Banner */}
        {result.isRecheck && result.beforeAfterNote && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl shadow-md">
            <h3 className="font-black text-amber-800 flex items-center gap-2 mb-2">
              <ActivityIcon className="w-5 h-5" />
              Before & After 비교 분석
            </h3>
            <p className="text-sm text-amber-900 leading-relaxed">{result.beforeAfterNote}</p>
          </div>
        )}

        {/* Safety Banner */}
        <div className={`p-6 rounded-2xl border-2 shadow-lg flex flex-col md:flex-row items-center gap-6 transition-all ${currentSafety.bg} ${currentSafety.border}`}>
           <div className="shrink-0">{currentSafety.icon}</div>
           <div className="flex-1 text-center md:text-left">
             <h2 className={`text-xl font-black mb-1 ${currentSafety.text}`}>{currentSafety.title}</h2>
             <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
               {result.safetyWarnings.map((warning, i) => (
                 <span key={i} className={`text-xs px-2 py-1 rounded-full bg-white/20 font-bold ${currentSafety.text}`}>• {warning}</span>
               ))}
             </div>
           </div>
           {result.stopAndCallService && (
             <div className="shrink-0">
               <span className="bg-white text-rose-600 font-black px-4 py-2 rounded-full text-xs shadow-sm">DO NOT DIY</span>
             </div>
           )}
        </div>

        {/* Main Result */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className={`bg-gradient-to-r ${result.safetyLevel === 'HIGH' ? 'from-rose-700 to-rose-900' : 'from-indigo-600 to-indigo-800'} p-8 text-white`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">주요 진단</span>
                <h1 className="text-4xl font-black mb-2">{result.issue}</h1>
                <p className="flex items-center gap-2 text-indigo-100">
                  <WrenchIcon className="w-4 h-4" />
                  {result.userConfirmedData?.brand || result.detectedBrand || ''} {result.appliance} 
                  {result.userConfirmedData?.model && ` (${result.userConfirmedData.model})`}
                </p>
                {result.userConfirmedData?.errorCode && (
                  <div className="mt-2 text-xs font-mono bg-black/20 p-2 rounded-lg border border-white/10">추출 에러 코드: <b>{result.userConfirmedData.errorCode}</b></div>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[120px]">
                <div className="text-4xl font-black">{result.probability}%</div>
                <div className="text-[10px] uppercase font-bold opacity-60">확률</div>
              </div>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-indigo-500" />
                현상 분석
              </h3>
              <p className="text-slate-600 leading-relaxed break-keep">{result.description}</p>
              
              <div className="mt-6">
                <button 
                  onClick={() => setShowEvidence(!showEvidence)}
                  className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline mb-3"
                >
                  <SearchIcon className="w-4 h-4" />
                  진단 근거 {showEvidence ? '숨기기' : '보기'}
                </button>
                {showEvidence && (
                  <div className="space-y-3 animate-fade-in">
                    {result.evidence.map((ev, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ev.source === 'MANUAL' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                            {ev.source === 'MANUAL' ? '공식 매뉴얼' : '일반 지식'}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{ev.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">"{ev.snippet}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {result.imageUrl && (
              <div className="md:col-span-4 rounded-xl overflow-hidden border shadow-sm h-48 bg-slate-100">
                <img src={result.imageUrl} alt="Analysis" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${result.stopAndCallService ? 'border-rose-200 bg-rose-50/20' : ''}`}>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {result.stopAndCallService ? <AlertTriangleIcon className="w-6 h-6 text-rose-500" /> : <CheckCircleIcon className="w-6 h-6 text-green-500" />}
                {result.stopAndCallService ? '권장 안전 수칙 (AS 접수 권고)' : '권장 수리 절차'}
              </h3>
              <div className="space-y-4">
                {result.steps.map((s, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${result.stopAndCallService ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{s.step}</div>
                    <div className="flex-1 pb-4 border-b border-slate-50 last:border-0">
                      <h4 className={`font-bold ${result.stopAndCallService ? 'text-rose-900' : 'text-slate-800'}`}>{s.instruction}</h4>
                      <p className="text-sm text-slate-500 mt-1">{s.detail}</p>
                    </div>
                    {!result.stopAndCallService && (
                      <button onClick={() => speakText(s.instruction, i)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        {speakingStep === i ? <StopIcon className="w-4 h-4 text-indigo-600" /> : <VolumeUpIcon className="w-4 h-4 text-slate-300" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={`p-6 rounded-2xl border-2 border-dashed transition-all ${result.stopAndCallService ? 'bg-indigo-600 text-white border-white border-4 shadow-xl scale-[1.02]' : 'bg-slate-100 border-slate-300'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className={`font-bold mb-2 ${result.stopAndCallService ? 'text-white text-xl' : 'text-slate-800'}`}>공식 서비스 센터 찾기</h3>
                  <p className={`text-sm mb-4 ${result.stopAndCallService ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {result.stopAndCallService ? "위험 상황입니다. 전문가의 도움이 즉시 필요합니다." : "자가 수리가 어렵다면 가까운 센터를 확인하세요."}
                  </p>
                </div>
                <button 
                  onClick={handleFindServiceCenter}
                  disabled={locating}
                  className={`px-8 py-4 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 ${result.stopAndCallService ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {locating ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <MapPinIcon className="w-5 h-5" />}
                  주변 센터 검색
                </button>
              </div>
              {centerResult && <div className={`mt-6 p-4 rounded-xl text-sm leading-relaxed animate-fade-in ${result.stopAndCallService ? 'bg-indigo-800/50 text-white border border-indigo-400' : 'bg-white border border-slate-200'}`}>{centerResult}</div>}
            </section>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {!result.stopAndCallService && result.alternatives && result.alternatives.length > 0 && (
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ActivityIcon className="w-5 h-5 text-indigo-500" />기타 가능성 (TOP 3)</h3>
                <div className="space-y-4">
                  {result.alternatives.map((alt, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-center mb-2"><span className="font-bold text-sm text-slate-700">{alt.issue}</span><span className="text-xs font-bold text-indigo-600">{alt.probability}%</span></div>
                      <p className="text-[11px] text-slate-500 leading-tight"><span className="text-indigo-600 font-bold">감별법:</span> {alt.howToDifferentiate}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <div className={`p-6 rounded-2xl shadow-lg ${result.stopAndCallService ? 'bg-slate-800 text-slate-300' : 'bg-indigo-900 text-white'}`}>
              <h3 className="font-bold mb-2">비서와 대화하기</h3>
              <p className="text-xs mb-6 opacity-80">추가 궁금증이 있다면 1:1 대화를 시작하세요.</p>
              <button onClick={onOpenChat} className={`w-full font-bold py-3 rounded-xl transition-all hover:scale-105 active:scale-95 ${result.stopAndCallService ? 'bg-slate-700 text-white' : 'bg-white text-indigo-900'}`}>도우미 대화 시작</button>
              <button onClick={onReset} className="w-full mt-4 text-xs opacity-60 underline">새 진단하기</button>
            </div>
          </div>
        </div>
      </div>

      {/* Sprint 7 Resolution Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] p-4 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <h4 className="text-sm font-bold text-slate-800">문제가 해결되었나요?</h4>
            <p className="text-[10px] text-slate-500">피드백은 진단 정확도 향상에 도움이 됩니다.</p>
          </div>
          <div className="flex-1 flex gap-2">
            <button 
              onClick={onMarkSolved}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${result.resolutionStatus === 'SOLVED' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700'}`}
            >
              <CheckCircleIcon className="w-4 h-4" /> 해결됨
            </button>
            <button 
              onClick={onMarkNotSolved}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${result.resolutionStatus === 'NOT_SOLVED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-rose-50'}`}
            >
              <StopIcon className="w-4 h-4" /> 안됨
            </button>
            <button 
              onClick={onRecheckRequest}
              className="flex-[1.5] bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ActivityIcon className="w-4 h-4" /> 수리 결과 재점검
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisView;
