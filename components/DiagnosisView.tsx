import React, { useState, useRef } from 'react';
import { DiagnosisResult } from '../types';
import { CheckCircleIcon, WrenchIcon, AlertTriangleIcon, VolumeUpIcon, StopIcon, MapPinIcon, DownloadIcon, ShareIcon } from './Icons';
import { findServiceCenters } from '../services/geminiService';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface DiagnosisViewProps {
  result: DiagnosisResult;
  onOpenChat: () => void;
  onReset: () => void;
}

const DiagnosisView: React.FC<DiagnosisViewProps> = ({ result, onOpenChat, onReset }) => {
  // TTS State
  const [speakingStep, setSpeakingStep] = useState<number | null>(null);
  
  // Service Center Finder State
  const [locating, setLocating] = useState(false);
  const [centerResult, setCenterResult] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  // PDF Ref
  const printRef = useRef<HTMLDivElement>(null);

  // TTS Handler
  const speakText = (text: string, index: number) => {
    // Stop if currently speaking the same index
    if (speakingStep === index) {
      window.speechSynthesis.cancel();
      setSpeakingStep(null);
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();
    setSpeakingStep(index);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.onend = () => setSpeakingStep(null);
    utterance.onerror = () => setSpeakingStep(null);
    
    window.speechSynthesis.speak(utterance);
  };

  // Maps Handler
  const handleFindCenters = () => {
    if (!('geolocation' in navigator)) {
      alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setLocating(true);
    setCenterResult(null);
    setMapUrl(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Set Map URL for Iframe
          const query = encodeURIComponent(`${result.appliance} 서비스센터`);
          const embedUrl = `https://maps.google.com/maps?q=${query}&sll=${latitude},${longitude}&hl=ko&output=embed`;
          setMapUrl(embedUrl);

          // Get Text Summary from Gemini
          const textResponse = await findServiceCenters(result.appliance, latitude, longitude);
          setCenterResult(textResponse);
        } catch (error) {
          console.error(error);
          setCenterResult("서비스 센터 정보를 가져오는 데 실패했습니다.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("위치 정보를 가져올 수 없습니다. 위치 권한을 허용해주세요.");
        setLocating(false);
      }
    );
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FixItNow_진단결과_${result.appliance}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  // Share Functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fix It Now 진단 결과',
          text: `[Fix It Now] ${result.appliance} 진단 결과: ${result.issue} (확률: ${result.probability}%)`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share canceled or failed", err);
      }
    } else {
      // Fallback: Copy text
      const text = `[Fix It Now] ${result.appliance} 문제: ${result.issue}\n해결책: ${result.description}`;
      navigator.clipboard.writeText(text);
      alert("진단 내용이 클립보드에 복사되었습니다.");
    }
  };

  return (
    <div className="animate-fade-in-up w-full max-w-4xl mx-auto pb-10">
      
      {/* Header Actions */}
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={handleShare} className="bg-white text-slate-600 hover:text-indigo-600 border border-slate-300 hover:border-indigo-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
          <ShareIcon className="w-4 h-4" />
          공유
        </button>
        <button onClick={handleDownloadPDF} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
          <DownloadIcon className="w-4 h-4" />
          리포트 저장 (PDF)
        </button>
      </div>

      <div ref={printRef} className="bg-slate-50 p-1"> {/* Wrapper for PDF capture */}
        
        {/* Header Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border border-slate-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wider opacity-80 mb-1">진단 결과</h2>
                <h1 className="text-3xl font-bold break-keep">{result.issue}</h1>
                <p className="mt-2 text-blue-100 flex items-center gap-2">
                  <WrenchIcon className="w-4 h-4" />
                  제품명: {result.appliance}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg p-3 min-w-[100px]">
                <span className="text-3xl font-bold">{result.probability}%</span>
                <span className="text-xs uppercase tracking-wide">확률</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Preview if available */}
              {result.imageUrl && (
                  <div className="w-full md:w-1/3 shrink-0">
                      <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <img src={result.imageUrl} alt="Analyzed Input" className="w-full h-auto object-cover" />
                      </div>
                      <p className="text-xs text-center text-slate-500 mt-2">분석된 이미지</p>
                  </div>
              )}

              <div className="flex-1 flex items-start gap-4">
                  <div className="bg-amber-100 p-3 rounded-full text-amber-600 shrink-0 mt-1">
                  <AlertTriangleIcon className="w-6 h-6" />
                  </div>
                  <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">분석 내용</h3>
                  <p className="text-slate-600 leading-relaxed break-keep">{result.description}</p>
                  <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded text-xs text-slate-500 font-mono">
                      출처/근거: {result.manualReference}
                  </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
              추천 수리 방법
            </h3>
            
            <div className="space-y-4">
              {result.steps.map((step, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800 mb-1 break-keep">{step.instruction}</h4>
                      <p className="text-slate-600 text-sm break-keep">{step.detail}</p>
                    </div>
                    {/* TTS Button */}
                    <button 
                      onClick={() => speakText(`${step.instruction}. ${step.detail}`, idx)}
                      className={`p-2 rounded-full transition-colors self-start ${speakingStep === idx ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                      title="음성으로 듣기"
                      data-html2canvas-ignore
                    >
                      {speakingStep === idx ? <StopIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AS Center Finder Section */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6" data-html2canvas-ignore>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                <MapPinIcon className="w-5 h-5 text-indigo-500" />
                주변 서비스 센터 찾기
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                자가 수리가 어려우신가요? 현재 위치를 기반으로 가까운 {result.appliance} 공식 서비스 센터를 지도에서 확인하세요.
              </p>
              
              {!locating && !centerResult ? (
                <button 
                  onClick={handleFindCenters}
                  className="bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 font-medium py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <MapPinIcon className="w-4 h-4" />
                  내 주변 AS 센터 지도 보기
                </button>
              ) : null}

              {locating && (
                 <div className="flex items-center gap-2 text-slate-600 text-sm py-4">
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin"></span>
                    위치를 확인하고 지도를 불러오는 중입니다...
                 </div>
              )}

              {mapUrl && (
                <div className="mt-4 animate-fade-in">
                    <iframe
                        title="Service Centers Map"
                        width="100%"
                        height="400"
                        frameBorder="0"
                        src={mapUrl}
                        className="rounded-lg shadow-sm mb-4 border border-slate-200"
                        allowFullScreen
                    ></iframe>
                </div>
              )}

              {centerResult && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed animate-fade-in shadow-sm">
                  <h4 className="font-bold text-indigo-600 mb-2">💡 AI 요약 정보</h4>
                  {centerResult}
                  <div className="mt-3 text-right">
                    <button onClick={() => { setCenterResult(null); setMapUrl(null); }} className="text-xs text-slate-400 underline">닫기</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-1 space-y-4" data-html2canvas-ignore>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
              <h3 className="font-semibold text-slate-800 mb-4">아직 해결되지 않았나요?</h3>
              <p className="text-sm text-slate-500 mb-6 break-keep">
                AI 비서가 도구, 부품 또는 구체적인 수리 방법에 대한 추가 질문에 답변해 드립니다.
              </p>
              <button 
                onClick={onOpenChat}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2 mb-3"
              >
                AI와 상담하기
              </button>
              <button 
                onClick={onReset}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                새로운 진단하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisView;