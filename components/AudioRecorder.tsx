import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, SquareIcon } from './Icons';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Visualizer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyzerRef.current);
      analyzerRef.current.fftSize = 256;

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' }); // Commonly supported container
        onRecordingComplete(blob);
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      drawVisualizer();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("마이크에 접근할 수 없습니다. 권한을 확인해주세요.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const drawVisualizer = () => {
    if (!analyzerRef.current || !canvasRef.current) return;
    
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyzerRef.current!.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(248, 250, 252)'; // bg-slate-50 matches parent
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        // Gradient color for bars
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border-2 border-slate-200 border-dashed w-full max-w-md mx-auto">
      <div className="relative mb-6 w-full h-32 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
        {!isRecording ? (
          <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
            <MicIcon className="w-8 h-8 opacity-50" />
            <span>버튼을 눌러 소음을 녹음하세요</span>
          </div>
        ) : (
           <canvas ref={canvasRef} width="300" height="128" className="w-full h-full" />
        )}
      </div>

      <div className="flex items-center gap-4">
         {!isRecording ? (
           <button
             onClick={startRecording}
             disabled={disabled}
             className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <MicIcon className="w-5 h-5" />
             녹음 시작
           </button>
         ) : (
           <button
             onClick={stopRecording}
             className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all animate-pulse"
           >
             <SquareIcon className="w-5 h-5" />
             중지 ({formatTime(recordingTime)})
           </button>
         )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        정확한 진단을 위해 5~10초간 녹음해주세요.
      </p>
    </div>
  );
};

export default AudioRecorder;