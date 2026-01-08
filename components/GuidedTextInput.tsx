
import React, { useState } from 'react';
import { SendIcon, ActivityIcon, AlertTriangleIcon } from './Icons';

interface GuidedTextInputProps {
  onSubmit: (summary: string) => void;
  disabled?: boolean;
}

const APPLIANCES = [
  { id: 'ac', label: '에어컨', icon: '❄️' },
  { id: 'washer', label: '세탁기/건조기', icon: '🧺' },
  { id: 'fridge', label: '냉장고', icon: '🧊' },
  { id: 'dishwasher', label: '식기세척기', icon: '🍽️' },
  { id: 'vacuum', label: '청소기', icon: '🧹' },
  { id: 'other', label: '기타 가전', icon: '⚙️' },
];

const ONOMATOPOEIA: Record<string, string[]> = {
  ac: ['틱틱', '뚜둑', '쉬익', '졸졸', '휘오오', '웅~', '칼칼'],
  washer: ['쿵쿵', '덜컹', '끼익', '드르륵', '위잉', '탁탁', '철컥'],
  fridge: ['딱딱', '뚝뚝', '웅~', '윙~', '달그락', '졸졸'],
  dishwasher: ['위잉', '쏴아', '덜컹', '삐~', '드르륵'],
  vacuum: ['위잉', '드르륵', '파지직', '푸슉', '끼익'],
  other: ['삐~', '퍽!', '파지직', '웅~', '끼익', '드르륵', '덜컹'],
};

const GuidedTextInput: React.FC<GuidedTextInputProps> = ({ onSubmit, disabled }) => {
  const [appliance, setAppliance] = useState('');
  const [sound, setSound] = useState<string[]>([]);
  const [pattern, setPattern] = useState('연속적');
  const [intensity, setIntensity] = useState('보통');
  const [vibration, setVibration] = useState(false);
  const [when, setWhen] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [extra, setExtra] = useState('');

  const toggleSound = (s: string) => {
    setSound(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleGenerateAndSubmit = () => {
    const summary = `
[가이드 진단 요청]
- 가전제품: ${APPLIANCES.find(a => a.id === appliance)?.label || '기타'}
- 소음 종류: ${sound.length > 0 ? sound.join(', ') : '정보 없음'}
- 소음 패턴: ${pattern} / 강도: ${intensity} / 진동: ${vibration ? '있음' : '없음'}
- 발생 시점: ${when || '정보 없음'}
- 에러 코드: ${errorCode || '없음'}
- 기타 증상: ${extra || '없음'}
    `.trim();
    onSubmit(summary);
  };

  const canSubmit = appliance !== '' && !disabled;

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* 1. 가전 선택 */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3">1. 제품 선택</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {APPLIANCES.map(a => (
            <button
              key={a.id}
              disabled={disabled}
              onClick={() => setAppliance(a.id)}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 text-sm ${
                appliance === a.id 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-xl" role="img" aria-label={a.label}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. 소음 선택 (가전 선택 후 노출) */}
      <section className={`transition-opacity duration-300 ${appliance ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        <label className="block text-sm font-bold text-slate-700 mb-3">2. 들리는 소리 (중복 선택)</label>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {(ONOMATOPOEIA[appliance] || ONOMATOPOEIA.other).map(s => (
            <button
              key={s}
              disabled={disabled}
              onClick={() => toggleSound(s)}
              className={`px-4 py-2 rounded-full border transition-all text-xs sm:text-sm ${
                sound.includes(s)
                  ? 'bg-rose-500 border-rose-500 text-white font-bold shadow-md transform scale-105'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* 3. 상세 패턴 및 진동 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">소음 패턴</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {['연속적', '간헐적'].map(p => (
              <button
                key={p}
                disabled={disabled}
                onClick={() => setPattern(p)}
                className={`flex-1 py-2 text-xs rounded-md transition-all font-medium ${
                  pattern === p ? 'bg-white shadow text-indigo-600' : 'text-slate-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">진동 여부</label>
          <button
            disabled={disabled}
            onClick={() => setVibration(!vibration)}
            className={`w-full py-2 text-xs rounded-lg border-2 transition-all font-medium ${
              vibration ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-100 bg-white text-slate-500'
            }`}
          >
            {vibration ? '⚠️ 진동이 느껴짐' : '진동 없음'}
          </button>
        </div>
      </section>

      {/* 4. 상황 및 기타 */}
      <section className="space-y-3">
        <label className="block text-sm font-bold text-slate-700 mb-2">3. 추가 정보</label>
        <div className="space-y-2">
          <input
            type="text"
            disabled={disabled}
            value={when}
            onChange={e => setWhen(e.target.value)}
            placeholder="발생 시점 (예: 가동 시작 시, 탈수할 때)"
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
          />
          <div className="flex gap-2">
            <input
              type="text"
              disabled={disabled}
              value={errorCode}
              onChange={e => setErrorCode(e.target.value)}
              placeholder="에러 코드 (있다면)"
              className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            />
            <input
              type="text"
              disabled={disabled}
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="특이사항 (냄새 등)"
              className="flex-[2] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleGenerateAndSubmit}
        disabled={!canSubmit}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform hover:translate-y-[-1px] active:translate-y-0"
      >
        <ActivityIcon className="w-5 h-5" />
        가이드 진단 시작
      </button>
    </div>
  );
};

export default GuidedTextInput;
