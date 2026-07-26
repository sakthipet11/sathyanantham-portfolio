'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/lib/store';
import { Radio, Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Terminal } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  notes: z.string().min(5, 'Please provide a brief message or project note')
});

type ContactFormData = z.infer<typeof contactSchema>;

export function LiveHandoffSection() {
  const { isSathyananthamOnline, setChatMode, setAIDrawerOpen } = useAppStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiHost}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('Contact API offline, logging locally:', data);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      reset();
    }
  };

  const handleInitiateHandoff = () => {
    setChatMode('live_human');
    setAIDrawerOpen(true);
  };

  return (
    <section id="contact" className="py-24 px-4 sm:px-6 relative z-10 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col items-start gap-2 mb-16 border-l-2 border-cyan-400 pl-4">
        <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
          // 04. CONTACT & LIVE HANDOFF
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Initiate Direct Collaboration
        </h2>
        <p className="text-slate-400 text-sm max-w-xl">
          Connect directly for Lead Software Engineering, Frontend Architecture, or AI System design opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Info */}
        <div className="space-y-8">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
              <Radio className={`w-3.5 h-3.5 ${isSathyananthamOnline ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
              <span>{isSathyananthamOnline ? 'STATUS :: SATHYANANTHAM_ONLINE' : 'STATUS :: AI_TWIN_READY_24_7'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to Engineer Scalable Systems
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Reach out for full-stack architecture consulting, lead engineering roles, or custom RAG AI agent integrations.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 font-mono">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
              <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">// DIRECT EMAIL</span>
                <p className="text-xs sm:text-sm font-bold text-white">v.sathyanantham@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
              <Phone className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">// PHONE</span>
                <p className="text-xs sm:text-sm font-bold text-white">+91 8870956756</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800">
              <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">// LOCATION</span>
                <p className="text-xs sm:text-sm font-bold text-white">Coimbatore / Bangalore, TN, India</p>
              </div>
            </div>
          </div>

          {/* Live Takeover Button */}
          <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-mono font-bold text-white">// PREFER LIVE CHAT?</h4>
              <p className="text-xs text-slate-400">Request seamless takeover to speak with Sathyanantham in real-time.</p>
            </div>
            <button
              onClick={handleInitiateHandoff}
              className="px-4 py-2.5 rounded-lg bg-cyan-400 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-300 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Handoff</span>
            </button>
          </div>

        </div>

        {/* Right Form */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          
          <div className="flex items-center gap-2 mb-2 font-mono text-xs text-cyan-400">
            <Terminal className="w-4 h-4" />
            <span>// TRANSMIT_INQUIRY</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight mb-6">Send Direct Message</h3>

          {isSubmitted ? (
            <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center space-y-3 font-mono">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">TRANSMISSION RECEIVED</h4>
              <p className="text-xs text-emerald-300">
                Sathyanantham V has received your message and will respond shortly.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="mt-4 text-xs font-semibold text-cyan-400 underline hover:text-cyan-300"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-mono">
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">// YOUR NAME</label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">// EMAIL ADDRESS</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="alex@company.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">// PROJECT SCOPE / INQUIRY</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  placeholder="Details regarding your project, role, or collaboration..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {errors.notes && <p className="text-[11px] text-red-400 mt-1">{errors.notes.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT MESSAGE'}</span>
              </button>

            </form>
          )}

        </div>

      </div>

    </section>
  );
}
