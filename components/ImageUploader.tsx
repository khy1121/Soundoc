
import React, { useRef, useState } from 'react';
import { UploadIcon, ImageIcon, TrashIcon } from './Icons';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  onAnalyze: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, onAnalyze }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      // Remove data url prefix for API
      const base64 = result.split(',')[1];
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {!preview ? (
        <div 
          onClick={triggerUpload}
          className="w-full h-64 bg-slate-50 rounded-xl border-2 border-slate-200 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-indigo-400 transition-all group"
        >
          <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
             <UploadIcon className="w-8 h-8 text-indigo-500" />
          </div>
          <p className="text-slate-600 font-medium">사진을 업로드하거나 드래그하세요</p>
          <p className="text-slate-400 text-sm mt-2">JPG, PNG (에러 코드, 파손 부위 등)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
            <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
            <button 
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={onAnalyze}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            사진 분석 시작
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
