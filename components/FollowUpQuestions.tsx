
import React, { useState } from 'react';
import { DiagnosisResult, FollowUpQuestion } from '../types';
import { CheckCircleIcon, SendIcon } from './Icons';

interface FollowUpQuestionsProps {
  diagnosis: DiagnosisResult;
  onSubmit: (answers: Record<string, string | string[]>) => void;
  onSkip: () => void;
}

const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({ diagnosis, onSubmit, onSkip }) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const questions = diagnosis.followUpQuestions || [];

  const handleSelect = (qId: string, val: string, type: 'single' | 'multi') => {
    if (type === 'single') {
      setAnswers(prev => ({ ...prev, [qId]: val }));
    } else {
      const current = (answers[qId] as string[]) || [];
      const updated = current.includes(val) 
        ? current.filter(v => v !== val) 
        : [...current, val];
      setAnswers(prev => ({ ...prev, [qId]: updated }));
    }
  };

  const handleText = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const isComplete = questions.every(q => !!answers[q.id]);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-indigo-600 p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CheckCircleIcon className="w-6 h-6" />
          정확한 진단을 위한 추가 확인
        </h2>
        <p className="text-indigo-100 text-sm mt-1">몇 가지 질문에 답해주시면 더 정확한 해결책을 찾을 수 있습니다.</p>
      </div>

      <div className="p-6 space-y-8">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <h3 className="font-semibold text-slate-800">
              {idx + 1}. {q.question}
            </h3>
            
            {q.type === 'single' && q.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(q.id, opt, 'single')}
                    className={`text-left p-3 rounded-xl border transition-all text-sm ${
                      answers[q.id] === opt 
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-600' 
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'multi' && q.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map(opt => {
                  const isChecked = (answers[q.id] as string[] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt, 'multi')}
                      className={`text-left p-3 rounded-xl border transition-all text-sm flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700' 
                          : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                      {isChecked && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === 'text' && (
              <textarea
                onChange={(e) => handleText(q.id, e.target.value)}
                placeholder="답변을 입력해주세요..."
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px]"
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onSubmit(answers)}
          disabled={!isComplete}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow transition-all flex items-center justify-center gap-2"
        >
          <SendIcon className="w-5 h-5" />
          진단 완료하기
        </button>
        <button
          onClick={onSkip}
          className="flex-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-3 px-6 rounded-xl transition-all"
        >
          건너뛰기 (정확도 낮아짐)
        </button>
      </div>
    </div>
  );
};

export default FollowUpQuestions;
