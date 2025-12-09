
import React from 'react';
import { DiagnosisResult } from '../types';
import { CheckCircleIcon, WrenchIcon, AlertTriangleIcon } from './Icons';

interface DiagnosisViewProps {
  result: DiagnosisResult;
  onOpenChat: () => void;
  onReset: () => void;
}

const DiagnosisView: React.FC<DiagnosisViewProps> = ({ result, onOpenChat, onReset }) => {
  return (
    <div className="animate-fade-in-up w-full max-w-4xl mx-auto">
      
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
              <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-1 break-keep">{step.instruction}</h4>
                    <p className="text-slate-600 text-sm break-keep">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-1 space-y-4">
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
  );
};

export default DiagnosisView;
