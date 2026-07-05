'use client';

import React, { useState } from 'react';
import { api } from '../../../services/api';
import { 
  Bot, 
  Send, 
  Loader2, 
  HelpCircle, 
  ArrowRight,
  MessageSquare,
  Sparkles,
  Volume2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function AIMentorPage() {
  const { plan, role } = useAuth();
  const [messages, setMessages] = useState<any[]>([
    {
      sender: 'ai',
      text: 'Hello! I am Loomie, your AI systems architecture and NetAcad learning mentor. Feel free to ask me questions regarding CIDR subnet calculations, Python algorithm runtimes, or client-server socket programming.',
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  const suggestionPrompts = [
    'Explain VLSM Subnet calculations',
    'How does BGP routing work?',
    'What is a proctored assessment lock?',
  ];

  const handleSendChat = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg = {
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSending(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text.trim(),
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.data.reply,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Sorry, I encountered an error checking standard API parameters. Please retry.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans select-none text-slate-100 p-6 sm:p-12 relative overflow-hidden flex flex-col justify-between">
      {/* Visual Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 items-stretch">
        
        {/* Left Side: Suggestion prompts & Reference cards */}
        <section className="w-full md:w-80 flex flex-col gap-4 shrink-0">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Quick Topics
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">AI Practice Prompts</h2>
            
            <div className="space-y-2">
              {suggestionPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(p)}
                  className="w-full text-left p-3 bg-slate-950/40 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition flex items-center justify-between group"
                >
                  <span className="truncate pr-3">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Documentation reference</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Active contextual reference mapping points to Cisco NetAcad standard outlines and RFC specifications.
            </p>
          </div>
        </section>

        {/* Right Side: Chat Panel Container */}
        <section className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex flex-col justify-between overflow-hidden relative">
          
          {plan === 'BASIC' && role === 'STUDENT' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-8 space-y-6">
              <Bot className="w-16 h-16 text-indigo-500 animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-white">Upgrade to PRO Plan</h3>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Gain access to Loomie AI systems learning mentor, custom subnet interactive solvers, and advanced algorithms practice.
                </p>
              </div>
              <button
                onClick={() => alert("Redirecting to plans configuration page...")}
                className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-indigo-500/20"
              >
                Unlock Pro Membership
              </button>
            </div>
          )}
          
          {/* Header */}
          <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/20">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" /> Loomie AI Systems Mentor
            </span>
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition" title="Voice output enabled">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bubbles List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
            {messages.map((m, idx) => (
              <div 
                key={idx}
                className={`flex gap-3 max-w-[85%] ${m.sender === 'ai' ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'ai' 
                    ? 'bg-slate-900 border border-slate-850 text-slate-300' 
                    : 'bg-indigo-500 text-white'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {sending && (
              <div className="flex gap-2 items-center text-xs text-slate-500 font-semibold italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                Loomie is contemplating...
              </div>
            )}
          </div>

          {/* Text Input area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendChat(chatInput); }}
            className="p-4 border-t border-slate-850 bg-slate-950/40 flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask a conceptual systems question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-indigo-500 text-white p-3 rounded-2xl hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-indigo-500/10 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </section>

      </div>
    </div>
  );
}
