import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MessageCircleIcon } from './Icons';
import { ChatMessage, DiagnosisResult } from '../types';
import { getChatResponseStream } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface ChatInterfaceProps {
  diagnosisContext: DiagnosisResult;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ diagnosisContext, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: `"${diagnosisContext.appliance}"에 대한 분석을 완료했습니다. "${diagnosisContext.issue}" 문제나 수리 절차에 대해 궁금한 점을 물어보세요.`,
      timestamp: Date.now(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Prepare placeholder for AI response
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev, 
      {
        id: aiMsgId,
        role: 'model',
        text: '', // Start empty for streaming
        timestamp: Date.now()
      }
    ]);

    try {
      // Prepare history for Gemini API
      // Exclude the last empty AI message we just added
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const stream = await getChatResponseStream(history, userMsg.text);

      let fullText = "";

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, text: "죄송합니다. 오류가 발생했습니다." } : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircleIcon className="w-6 h-6" />
            <h3 className="font-bold">수리 도우미</h3>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl p-3 text-sm break-keep ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}
                {msg.role === 'model' && isTyping && msg.id === messages[messages.length - 1].id && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-slate-400 align-middle animate-pulse"></span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - FIXED CONTRAST */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="질문을 입력하세요..."
              className="flex-1 bg-slate-800 text-white border-none rounded-full px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400 shadow-inner"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-full transition-colors"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;