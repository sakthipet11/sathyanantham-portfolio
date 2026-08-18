'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Eye,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Send,
  Calendar,
  User,
  Building,
  Mail,
  Edit3,
  Paperclip,
  Check
} from 'lucide-react';
import { getApiHost } from '@/lib/utils';

export default function AdminRecruiterInboxPage() {
  const apiHost = getApiHost();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [metrics, setMetrics] = useState({
    total_emails: 16,
    interview_requests: 5,
    resume_requests: 4,
    pending_review: 6,
    offers: 1,
    rejections: 2,
    replies_sent: 7
  });

  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [draftBody, setDraftBody] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const [emailsRes, metricsRes] = await Promise.all([
        fetch(`${apiHost}/api/v2/recruiter-inbox?limit=100`),
        fetch(`${apiHost}/api/v2/recruiter-inbox/metrics`)
      ]);

      if (emailsRes.ok) {
        const eData = await emailsRes.json();
        if (eData.emails && eData.emails.length > 0) {
          setEmails(eData.emails);
        } else {
          loadFallbackData();
        }
      } else {
        loadFallbackData();
      }

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }
    } catch (err) {
      console.warn("Using demo data for recruiter inbox:", err);
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    const demoEmails = [
      {
        id: "em-figma-inv-01",
        gmail_message_id: "msg-figma-88910",
        thread_id: "th-figma-88910",
        sender: "sarah.connor@figma.com",
        sender_name: "Sarah Connor (Staff Tech Recruiter)",
        company: "Figma",
        job_title: "Lead UI Platform Architect",
        subject: "Invitation to connect: Lead UI Platform Architect at Figma",
        body_raw: "Hi Sathyanantham,\n\nI came across your portfolio and extensive work leading Module Federation and Micro Frontend architecture. Our UI platform engineering team is expanding and we'd love to set up a 30-minute introductory call this week to discuss our architectural roadmap.\n\nAre you available Tuesday or Thursday afternoon?",
        body_summary: "Inviting candidate for 30-min intro chat regarding Lead UI Platform Architect role...",
        classification: "INTERVIEW_REQUEST",
        confidence: 0.96,
        action: "Confirm availability and accept interview invitation",
        requires_human_review: true,
        risk_reasons: [],
        draft_reply_subject: "Re: Invitation to connect: Lead UI Platform Architect at Figma",
        draft_reply_body: "Hi Sarah,\n\nThank you for reaching out! I would be delighted to speak with you and the Figma platform engineering team.\n\nI am available this week during the following windows:\n• Tuesday: 10:00 AM – 1:00 PM EST\n• Thursday: 2:00 PM – 5:00 PM EST\n\nPlease let me know what time works best.\n\nBest regards,\nSathyanantham V\nhttps://sathyanantham.dev",
        status: "DRAFT_READY",
        received_at: "2026-08-17T18:20:00Z"
      },
      {
        id: "em-stripe-res-02",
        gmail_message_id: "msg-stripe-77123",
        thread_id: "th-stripe-77123",
        sender: "alex.kumar@stripe.com",
        sender_name: "Alex Kumar (Principal Engineering Recruiter)",
        company: "Stripe",
        job_title: "Principal Frontend Engineer - Micro Frontends",
        subject: "Stripe Micro Frontend Leadership — Updated Resume Request",
        body_raw: "Hello Sathyanantham,\n\nOur hiring director reviewed your initial profile for the Principal Frontend Engineer opening. Could you please share an updated copy of your resume in PDF highlighting your experience with high-scale payment portals and distributed micro frontend pipelines?\n\nThanks,\nAlex",
        body_summary: "Requesting updated tailored PDF resume highlighting micro frontend scalability...",
        classification: "RESUME_REQUEST",
        confidence: 0.98,
        action: "Attach tailored Lead Architect resume and reply",
        requires_human_review: true,
        risk_reasons: [],
        draft_reply_subject: "Re: Stripe Micro Frontend Leadership — Updated Resume Request",
        draft_reply_body: "Hi Alex,\n\nThank you for following up! I have attached my updated resume tailored to the Principal Frontend Engineer role at Stripe, detailing my 13.5+ years leading large-scale React platforms, Module Federation, and sub-second UI performance optimizations.\n\nLooking forward to next steps!\n\nBest regards,\nSathyanantham V\nLead Frontend Architect",
        attached_resume_id: "resume-v2026-sathya-architect-stripe",
        status: "DRAFT_READY",
        received_at: "2026-08-17T17:50:00Z"
      },
      {
        id: "em-fintech-sal-03",
        gmail_message_id: "msg-fintech-66441",
        thread_id: "th-fintech-66441",
        sender: "recruiting@fintechdynamics.com",
        sender_name: "Talent Acquisition Team",
        company: "FinTech Dynamics",
        job_title: "Staff Micro Frontend Architect",
        subject: "Compensation expectation & visa status check",
        body_raw: "Hi Sathya,\n\nBefore we schedule the technical panel, could you please confirm your base salary expectation and whether you require visa sponsorship for this remote role?",
        body_summary: "Inquiring about base salary expectation and work authorization...",
        classification: "ADDITIONAL_INFORMATION_REQUEST",
        confidence: 0.91,
        action: "Human review required for compensation & work auth disclosure",
        requires_human_review: true,
        risk_reasons: ["Compensation/Salary negotiation detected", "Legal / Work authorization inquiry detected"],
        draft_reply_subject: "Re: Compensation expectation & visa status check",
        draft_reply_body: "Hi Recruiting Team,\n\nRegarding compensation, my expectation for a Staff Architect leadership role is in the $180k - $220k USD range, depending on total rewards structure.\n\nI am legally authorized to work and do not require immediate sponsorship for remote engagements.\n\nBest regards,\nSathyanantham V",
        status: "DRAFT_READY",
        received_at: "2026-08-17T16:40:00Z"
      }
    ];
    setEmails(demoEmails);
  };

  useEffect(() => {
    fetchInboxData();
  }, [apiHost]);

  const handleSelectEmail = (email: any) => {
    setSelectedEmail(email);
    setDraftBody(email.draft_reply_body || '');
  };

  const handleApproveReply = async (emailId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/approve-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: "HUMAN_ADMIN", custom_reply_body: draftBody })
      });
      if (res.ok) {
        showToast("Human approval granted. Reply dispatched via Gmail MCP!");
      }
    } catch {
      showToast("Reply sent in local demo mode!");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, status: "SENT", draft_reply_body: draftBody } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, status: "SENT", draft_reply_body: draftBody }));
    }
  };

  const handleSaveDraft = async (emailId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/edit-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_reply_body: draftBody })
      });
      showToast("Draft reply saved successfully!");
    } catch {
      showToast("Draft updated locally.");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, draft_reply_body: draftBody } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, draft_reply_body: draftBody }));
    }
  };

  const handleReject = async (emailId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/reject`, {
        method: 'POST'
      });
      showToast("Email reply declined and archived.");
    } catch {
      showToast("Declined reply locally.");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, status: "REJECTED" } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, status: "REJECTED" }));
    }
  };

  const filteredEmails = emails.filter((em) => {
    const matchesSearch =
      (em.sender || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (em.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (em.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassification === 'ALL' || em.classification === selectedClassification;
    const matchesStat = selectedStatus === 'ALL' || em.status === selectedStatus;
    return matchesSearch && matchesClass && matchesStat;
  });

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'INTERVIEW_REQUEST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">INTERVIEW_REQUEST</span>;
      case 'RESUME_REQUEST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1"><Paperclip className="w-2.5 h-2.5" /> RESUME_REQUEST</span>;
      case 'OFFER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">OFFER</span>;
      case 'REJECTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">REJECTION</span>;
      case 'RECRUITER_CONTACT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">RECRUITER_CONTACT</span>;
      case 'ADDITIONAL_INFORMATION_REQUEST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">INFO_REQUEST</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">{classification}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT_READY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold animate-pulse">DRAFT_READY</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> SENT</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">DECLINED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs shadow-2xl animate-fade-in font-mono">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-cyan-400" /> Recruiter Inbox & Gmail Automation Center
            </h1>
            <p className="text-xs text-slate-400">
              Intelligent email classification, risk evaluation, auto-drafting & approval gateway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInboxData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Inbound Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            Open Gmail Client
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Inbound</span>
          <span className="text-xl font-bold text-slate-100 mt-1 block">{metrics.total_emails}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 bg-cyan-500/5">
          <span className="text-[10px] text-cyan-400 font-mono uppercase block">Interview Requests</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">{metrics.interview_requests}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/20 bg-purple-500/5">
          <span className="text-[10px] text-purple-400 font-mono uppercase block">Resume Requests</span>
          <span className="text-xl font-bold text-purple-300 mt-1 block">{metrics.resume_requests}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] text-amber-400 font-mono uppercase block">Requires Review</span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{metrics.pending_review}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] text-emerald-400 font-mono uppercase block">Job Offers</span>
          <span className="text-xl font-bold text-emerald-300 mt-1 block">{metrics.offers}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/20 bg-blue-500/5">
          <span className="text-[10px] text-blue-400 font-mono uppercase block">Replies Sent</span>
          <span className="text-xl font-bold text-blue-300 mt-1 block">{metrics.replies_sent}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by sender, company, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedClassification}
          onChange={(e) => setSelectedClassification(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Classifications</option>
          <option value="INTERVIEW_REQUEST">Interview Request</option>
          <option value="RESUME_REQUEST">Resume Request</option>
          <option value="RECRUITER_CONTACT">Recruiter Contact</option>
          <option value="OFFER">Offer</option>
          <option value="ADDITIONAL_INFORMATION_REQUEST">Info Request</option>
          <option value="REJECTION">Rejection</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT_READY">Draft Ready</option>
          <option value="SENT">Sent</option>
          <option value="REJECTED">Declined</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="px-5 py-3.5">Sender & Company</th>
                <th className="px-4 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-4 py-3.5">Confidence</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Received</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No recruiter messages found in this view.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((em) => (
                  <tr
                    key={em.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleSelectEmail(em)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100 text-sm">{em.company || "Enterprise Recruiter"}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>{em.sender_name || em.sender}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 max-w-xs truncate">
                      <span className="text-slate-200 font-medium">{em.subject}</span>
                      <span className="block text-[11px] text-slate-400 truncate mt-0.5">{em.body_summary}</span>
                    </td>

                    <td className="px-4 py-4">
                      {getClassificationBadge(em.classification)}
                    </td>

                    <td className="px-4 py-4 font-mono font-bold text-xs text-slate-200">
                      {(em.confidence * 100).toFixed(0)}%
                    </td>

                    <td className="px-4 py-4">
                      {getStatusBadge(em.status)}
                    </td>

                    <td className="px-4 py-4 text-slate-400">
                      {new Date(em.received_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSelectEmail(em)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" /> Details
                        </button>

                        {em.status === 'DRAFT_READY' && (
                          <button
                            onClick={() => {
                              setSelectedEmail(em);
                              setDraftBody(em.draft_reply_body || '');
                              handleApproveReply(em.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-md shadow-cyan-900/30"
                            title="Approve Draft & Send"
                          >
                            <Send className="w-3.5 h-3.5" /> Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedEmail.company}
                  </span>
                  {getClassificationBadge(selectedEmail.classification)}
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-2">{selectedEmail.subject}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  From: <span className="text-slate-200 font-mono">{selectedEmail.sender}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Risk / Safety Assessment Banner */}
            {selectedEmail.requires_human_review && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="w-4 h-4" /> Safety Guardrail: Human Review Gate Active
                </span>
                <p>Outbound email will NOT be dispatched without explicit human administrator approval.</p>
                {selectedEmail.risk_reasons && selectedEmail.risk_reasons.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90 pt-1">
                    {selectedEmail.risk_reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Original Inbound Body */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" /> Inbound Message Content
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {selectedEmail.body_raw}
              </div>
            </div>

            {/* Attached Resume Notification if RESUME_REQUEST */}
            {selectedEmail.attached_resume_id && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono">
                  <Paperclip className="w-4 h-4 text-purple-400" />
                  Attached Resume: <strong className="text-purple-200">{selectedEmail.attached_resume_id}</strong>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  PDF Ready
                </span>
              </div>
            )}

            {/* Draft Reply Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" /> Contextual Draft Reply (Gemini 2.0)
                </h3>
                <span className="text-[10px] font-mono text-cyan-400">Editable</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={selectedEmail.draft_reply_subject || `Re: ${selectedEmail.subject}`}
                  readOnly
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />
                <textarea
                  rows={8}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Type draft reply..."
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 leading-relaxed font-sans focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => handleSaveDraft(selectedEmail.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Save Draft Changes
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(selectedEmail.id)}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
                >
                  Decline / Archive
                </button>
                {selectedEmail.status !== 'SENT' && (
                  <button
                    onClick={() => handleApproveReply(selectedEmail.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all"
                  >
                    <Send className="w-4 h-4" /> Approve & Send via Gmail
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
