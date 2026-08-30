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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);
    let success = false;

    // 1. Primary transmission via Next.js server-side route (/api/contact with nodemailer)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: data.notes,
          purpose: 'Direct Portfolio Inquiry'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.status === 'success') {
        success = true;
      }
    } catch (primaryErr) {
      console.warn('Next.js contact API call failed, attempting backend fallback:', primaryErr);
    }

    // 2. Fallback to configured apiHost (FastAPI backend) if primary call didn't succeed
    if (!success) {
      try {
        const apiHost = getApiHost();
        if (apiHost && typeof window !== 'undefined' && !apiHost.includes(window.location.host)) {
          const fallbackRes = await fetch(`${apiHost}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              message: data.notes,
              purpose: 'Direct Portfolio Inquiry'
            })
          });
          const fbResult = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok && (fbResult.status === 'success' || fbResult.data)) {
            success = true;
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback backend contact API failed:', fallbackErr);
      }
    }

    setIsSubmitting(false);

    if (success) {
      trackEvent('contact_submit', { email: data.email, name: data.name });
      setIsSubmitted(true);
      reset();
    } else {
      setSubmitError('Unable to transmit message automatically. You can email Sathyanantham directly at v.sathyanantham@gmail.com');
    }
  };

  const handleInitiateHandoff = () => {
    setChatMode('live_human');
    setAIDrawerOpen(true);
  };

  return (
    <section id="contact" className="py-8 md:py-16 px-4 sm:px-6 relative z-10 max-w-6xl mx-auto">

      {/* Editorial Header */}
      <div className="flex flex-col items-start gap-4 mb-16 border-l-2 border-primary/40 pl-5">
        <span className="font-serif italic text-base text-primary tracking-wide block">
          Contact & Direct Engagement
        </span>
        <h2 className="text-3xl sm:text-5xl font-serif font-normal text-foreground tracking-tight leading-tight max-w-3xl">
          Building high-availability platforms requires <span className="text-primary italic font-serif">clear intent</span> and direct collaboration.
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl font-sans leading-relaxed pt-1">
          Connect directly for Lead Software Engineering, Frontend Architecture, or AI System design opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

        {/* Left Info */}
        <div className="space-y-6 flex flex-col justify-between">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 border border-border/80 text-xs font-mono text-primary backdrop-blur-md shadow-xs">
              <Radio className={`w-3.5 h-3.5 ${isSathyananthamOnline ? 'text-primary animate-pulse' : 'text-primary'}`} />
              <span>{isSathyananthamOnline ? 'STATUS :: SATHYANANTHAM_ONLINE' : 'STATUS :: AI_TWIN_READY_24_7'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif font-normal text-foreground tracking-tight">
              Ready to engineer scalable enterprise systems
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed font-sans">
              Reach out for full-stack architecture consulting, lead engineering roles, or custom RAG AI agent integrations.
            </p>
          </div>

          {/* Contact Details Cards */}
          <div className="space-y-3 font-mono">
            <Card className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-xl hover:border-primary/40 transition-colors shadow-xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// DIRECT EMAIL</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground">v.sathyanantham@gmail.com</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-xl hover:border-primary/40 transition-colors shadow-xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-primary shrink-0">
                <Phone className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// PHONE</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground">+91 8870956756</p>
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-xl hover:border-primary/40 transition-colors shadow-xs">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">// LOCATION</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground">Coimbatore, Tamil Nadu, India</p>
              </div>
            </Card>
          </div>

          {/* Live Takeover Card */}
          <Card className="p-6 rounded-2xl bg-card/80 border border-primary/30 backdrop-blur-xl flex items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="text-xs font-mono font-semibold text-foreground">// PREFER LIVE CHAT?</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Request seamless takeover to speak with Sathyanantham in real-time.</p>
            </div>
            <Button
              onClick={handleInitiateHandoff}
              size="sm"
              className="gap-1.5 font-mono text-xs font-semibold rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Handoff</span>
            </Button>
          </Card>

        </div>

        {/* Right Form Card */}
        <Card className="p-8 sm:p-10 rounded-3xl bg-card/60 border border-border/80 shadow-xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-primary">
              <Terminal className="w-4 h-4" />
              <span>// TRANSMIT_INQUIRY</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight mb-6">Send Direct Message</h3>

            {isSubmitted ? (
              <div className="p-8 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-4 font-mono backdrop-blur-md">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <h4 className="text-base font-bold text-foreground">TRANSMISSION RECEIVED</h4>
                <p className="text-xs text-muted-foreground">
                  Sathyanantham V has received your message and will respond shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-4 text-xs font-semibold text-primary underline hover:opacity-80 cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div>
                  <label className="block text-xs font-mono font-semibold text-muted-foreground mb-1.5">// YOUR NAME</label>
                  <Input
                    {...register('name')}
                    type="text"
                    placeholder="e.g. Alex Morgan"
                  />
                  {errors.name && <p className="text-[11px] text-destructive font-mono mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-muted-foreground mb-1.5">// EMAIL ADDRESS</label>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="alex@company.com"
                  />
                  {errors.email && <p className="text-[11px] text-destructive font-mono mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-muted-foreground mb-1.5">// PROJECT SCOPE / INQUIRY</label>
                  <Textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Details regarding your project, role, or collaboration..."
                  />
                  {errors.notes && <p className="text-[11px] text-destructive font-mono mt-1">{errors.notes.message}</p>}
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-[12px] font-mono text-destructive space-y-1">
                    <p>{submitError}</p>
                    <a
                      href="mailto:v.sathyanantham@gmail.com"
                      className="underline font-semibold inline-block text-primary hover:opacity-80"
                    >
                      Click to email directly &rarr;
                    </a>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT MESSAGE'}</span>
                </Button>

              </form>
            )}
          </div>

        </Card>

      </div>

    </section>
  );
}
