
import React, { useState } from 'react';
import { DiagnosisResult } from '../types';
import { CheckCircleIcon, SendIcon, WrenchIcon } from './Icons';

interface ExtractionConfirmationProps {
  extracted: DiagnosisResult;
  onConfirm: (data: { brand: string, model: string, errorCode: string }) => void;
  onCancel: () => void;
}

const ExtractionConfirmation: React.FC<ExtractionConfirmationProps> = ({ extracted, onConfirm, onCancel }) => {
  const [brand, setBrand] = useState(extracted.detectedBrand || '');
  const [model, setModel] = useState(extracted.detectedModel || '');
  const [errorCode, setErrorCode] = useState(extracted.detectedErrorCode || '');

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-indigo-600 p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <WrenchIcon className="w-6 h-6" />
          추출된 정보를 확인해주세요
        </h2>
        <p className="text-indigo-100 text-sm mt-1">사진에서 분석된 정보입니다. 틀린 내용이 있다면 수정 후 확인을 눌러주세요.</p>
      </div>

      <div className="p-6 space-y-4">
        {extracted.imageUrl && (
          <div className="w-full h-40 rounded-xl overflow-hidden mb-6 bg-slate-100 border border-slate-200">
            <img src={extracted.imageUrl} alt="Analysis Source" className="w-full h-full object-contain" />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">제조사 브랜드</label>
            <input 
              type="text" 
              value={brand} 
              onChange={e => setBrand(e.target.value)} 
              placeholder="예: 삼성전자, LG전자"
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">모델명 (기기 식별자)</label>
            <input 
              type="text" 
              value={model} 
              onChange={e => setModel(e.target.value)} 
              placeholder="예: WW10N645, AR06R1130HZN"
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">에러 코드</label>
            <input 
              type="text" 
              value={errorCode} 
              onChange={e => setErrorCode(e.target.value)} 
              placeholder="예: 4C, IE, CH05"
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
            />
          </div>
        </div>

        {extracted.imageFindings && extracted.imageFindings.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">이미지 분석 소견</label>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
              {extracted.imageFindings.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onConfirm({ brand, model, errorCode })}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow transition-all flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          이 정보로 진단 시작
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-3 px-6 rounded-xl transition-all"
        >
          취소 및 재선택
        </button>
      </div>
    </div>
  );
};

export default ExtractionConfirmation;
