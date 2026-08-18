'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/lib/store';
import { useAnalytics } from '@/components/providers';
import { Radio, Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { getApiHost } from '@/lib/utils';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  notes: z.string().min(5, 'Please provide a brief message or project note')
});

type ContactFormData = z.infer<typeof contactSchema>;

export function LiveHandoffSection() {
  const { isSathyananthamOnline, setChatMode, setAIDrawerOpen } = useAppStore();
  const { trackEvent } = useAnalytics();
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
      const apiHost = getApiHost();
      await fetch(`${apiHost}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: data.notes
        })
      });
      trackEvent('contact_submit', { email: data.email, name: data.name });
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
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-primary pl-4">
        <Badge variant="outline" className="font-mono text-xs tracking-widest uppercase text-primary border-primary/30 bg-primary/10">
          // 05. CONTACT & LIVE HANDOFF
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight">
          Initiate Direct Collaboration
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
          Connect directly for Lead Software Engineering, Frontend Architecture, or AI System design opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        
        {/* Left Info */}
        <div className="space-y-6 flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 border border-border/80 text-xs font-mono text-primary backdrop-blur-md">
              <Radio className={`w-3.5 h-3.5 ${isSathyananthamOnline ? 'text-emerald-500 animate-pulse' : 'text-primary'}`} />
              <span>{isSathyananthamOnline ? 'STATUS :: SATHYANANTHAM_ONLINE' : 'STATUS :: AI_TWIN_READY_24_7'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Ready to Engineer Scalable Systems
            </h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Reach out for full-stack architecture consulting, lead engineering roles, or custom RAG AI agent integrations.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 font-mono">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl hover:border-primary/40 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/80 text-primary">
                <Mail className="w-5 h-5 shrink-0" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// DIRECT EMAIL</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">v.sathyanantham@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl hover:border-indigo-500/40 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/80 text-indigo-500">
                <Phone className="w-5 h-5 shrink-0" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// PHONE</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">+91 8870956756</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl hover:border-purple-500/40 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/80 text-purple-500">
                <MapPin className="w-5 h-5 shrink-0" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// LOCATION</span>
                <p className="text-xs sm:text-sm font-bold text-foreground">Coimbatore / Bangalore, TN, India</p>
              </div>
            </div>
          </div>

          {/* Live Takeover Card */}
          <div className="p-6 rounded-2xl bg-card/80 border border-primary/40 backdrop-blur-xl flex items-center justify-between gap-4 shadow-lg">
            <div>
              <h4 className="text-xs font-mono font-bold text-foreground">// PREFER LIVE CHAT?</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Request seamless takeover to speak with Sathyanantham in real-time.</p>
            </div>
            <Button
              onClick={handleInitiateHandoff}
              size="sm"
              className="gap-1.5 font-mono text-xs font-bold rounded-xl shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Handoff</span>
            </Button>
          </div>

        </div>

        {/* Right Form */}
        <div className="p-8 sm:p-10 rounded-3xl bg-card/60 border border-border/80 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-primary">
              <Terminal className="w-4 h-4" />
              <span>// TRANSMIT_INQUIRY</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight mb-6">Send Direct Message</h3>

            {isSubmitted ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 font-mono backdrop-blur-md">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-foreground">TRANSMISSION RECEIVED</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  Sathyanantham V has received your message and will respond shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-xs font-semibold text-primary underline hover:opacity-80"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 font-mono">
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">// YOUR NAME</label>
                  <input
                    {...register('name')}
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-muted/60 border border-border/80 rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors backdrop-blur-sm"
                  />
                  {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">// EMAIL ADDRESS</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="alex@company.com"
                    className="w-full bg-muted/60 border border-border/80 rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors backdrop-blur-sm"
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">// PROJECT SCOPE / INQUIRY</label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Details regarding your project, role, or collaboration..."
                    className="w-full bg-muted/60 border border-border/80 rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors backdrop-blur-sm"
                  />
                  {errors.notes && <p className="text-[11px] text-rose-500 mt-1">{errors.notes.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT MESSAGE'}</span>
                </Button>

              </form>
            )}
          </div>

        </div>

      </div>

    </section>
  );
}
