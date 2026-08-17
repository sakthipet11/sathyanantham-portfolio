'use client';

import Link from 'next/link';
import { Users, ArrowLeft, Send, UserCheck, MessageSquare } from 'lucide-react';

export default function AdminReferralsPage() {
  const referralOutreach = [
    { id: 1, name: 'Alex Rivera', title: 'Senior Tech Recruiter', company: 'Meta / Enterprise', status: 'Outreach Sent', agent: 'referral_agent' },
    { id: 2, name: 'Sarah Chen', title: 'Director of Engineering', company: 'FinTech Hub', status: 'Connected', agent: 'referral_agent' },
    { id: 3, name: 'David Miller', title: 'Staff Engineer', company: 'NextGen Systems', status: 'Referral Submitted', agent: 'referral_agent' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Referral & Outreach Network
            </h1>
            <p className="text-xs text-slate-400">Automated candidate networking via referral_agent & email_agent</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors">
          <Send className="w-3.5 h-3.5" /> Launch Referral Campaign
        </button>
      </div>

      <div className="space-y-3">
        {referralOutreach.map((contact) => (
          <div key={contact.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-100 text-sm">{contact.name}</div>
                <div className="text-xs text-slate-400">{contact.title} @ {contact.company}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {contact.status}
              </span>
              <button className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
