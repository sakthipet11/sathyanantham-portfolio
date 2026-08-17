'use client';

import Link from 'next/link';
import { Inbox, ArrowLeft, Send, MessageSquare, User } from 'lucide-react';

export default function AdminRecruiterInboxPage() {
  const conversations = [
    { id: 'sess-849', name: 'Lead Tech Recruiter (O\'Reilly)', lastMsg: 'Sathya, we loved your Micro Frontend architecture project on GitHub.', time: '10 mins ago', status: 'Handoff Requested' },
    { id: 'sess-850', name: 'VP Engineering (Nextuple)', lastMsg: 'When are you available for an architectural discussion?', time: '1 hour ago', status: 'AI Handled' },
    { id: 'sess-851', name: 'Talent Acquisition (Tapestry)', lastMsg: 'Shared job description link for Principal UI Role.', time: '3 hours ago', status: 'Resolved' },
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
              <Inbox className="w-5 h-5 text-amber-400" /> Recruiter Inbox & Live Visitor Handoff
            </h1>
            <p className="text-xs text-slate-400">WebSocket live streaming & OpenRouter AI fallback</p>
          </div>
        </div>
        <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors">
          Open Live Console
        </Link>
      </div>

      <div className="space-y-3">
        {conversations.map((chat) => (
          <div key={chat.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  {chat.name}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {chat.id}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{chat.lastMsg}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {chat.status}
              </span>
              <div className="text-[11px] text-slate-500 mt-1">{chat.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
