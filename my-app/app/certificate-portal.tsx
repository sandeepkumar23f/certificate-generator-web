"use client";

import QRCode from "qrcode";
import Image from "next/image";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileClock,
  LayoutDashboard,
  Mail,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type RequestStatus = "pending" | "approved" | "rejected";
type InternshipMode = "Remote" | "Hybrid" | "On-site";
type PortalTab = "apply" | "certificates" | "admin" | "verify";

type CertificateRequest = {
  requestId: string;
  name: string;
  email: string;
  domain: string;
  duration: string;
  mode: InternshipMode;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  appliedAt: string;
  certificateId?: string;
  issuedAt?: string;
};

type ApplicationForm = Omit<
  CertificateRequest,
  "requestId" | "status" | "appliedAt" | "certificateId" | "issuedAt"
>;

const STORAGE_KEY = "meridian-internship-requests";
const DOMAINS = [
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "UI/UX Design",
  "Data Science",
  "Machine Learning & AI",
  "Mobile App Development",
  "Cloud Computing & DevOps",
];
const DURATIONS = ["1 month", "2 months", "3 months", "6 months"];
const MODES: InternshipMode[] = ["Remote", "Hybrid", "On-site"];
const EMPTY_FORM: ApplicationForm = {
  name: "",
  email: "",
  domain: DOMAINS[0],
  duration: DURATIONS[2],
  mode: "Remote",
  startDate: "",
  endDate: "",
};

function makeCertificateId() {
  return `INT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function QRCodeImage({ value, size = 112 }: { value: string; size?: number }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#20243a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setImage(url);
      })
      .catch(() => {
        if (!cancelled) setError("QR code could not be generated.");
      });
    return () => {
      cancelled = true;
    };
  }, [size, value]);

  if (error) return <span className="qr-error">{error}</span>;
  if (!image) return <span className="qr-loading">Creating QR code…</span>;
  return <Image src={image} width={size} height={size} alt="Scan to verify this certificate" unoptimized />;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const labels: Record<RequestStatus, string> = {
    pending: "In review",
    approved: "Approved",
    rejected: "Not approved",
  };
  return (
    <span className={`status-badge status-${status}`}>
      {status === "approved" ? <CheckCircle2 size={14} /> : null}
      {status === "pending" ? <Clock3 size={14} /> : null}
      {status === "rejected" ? <XCircle size={14} /> : null}
      {labels[status]}
    </span>
  );
}

export default function CertificatePortal() {
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<PortalTab>("apply");
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedCertificate, setSelectedCertificate] =
    useState<CertificateRequest | null>(null);
  const [verificationId, setVerificationId] = useState("");
  const [queryId, setQueryId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!Array.isArray(parsed)) {
            throw new Error("Saved request data is not a list.");
          }
          setRequests(parsed as CertificateRequest[]);
        }
      } catch (error) {
        console.error("Could not load saved internship requests.", error);
        setStorageError(
          "Saved requests could not be loaded. Your changes may not persist on this device.",
        );
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persistRequests(nextRequests: CertificateRequest[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRequests));
      setStorageError("");
    } catch (error) {
      console.error("Could not save internship requests.", error);
      setStorageError(
        "Changes could not be saved in this browser. Check your storage settings.",
      );
    }
  }

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get("verify");
      if (!id) return;
      setVerificationId(id);
      setQueryId(id);
      setActiveTab("verify");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const issuedCertificates = requests.filter(
    (request) => request.status === "approved" && request.certificateId,
  );
  const verifiedCertificate = issuedCertificates.find(
    (request) => request.certificateId?.toLowerCase() === verificationId.trim().toLowerCase(),
  );

  function showTab(tab: PortalTab) {
    setActiveTab(tab);
    setNotice("");
    if (tab !== "verify") {
      setVerificationId("");
      setQueryId("");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.endDate <= form.startDate) {
      setNotice("Choose an end date that is after your start date.");
      return;
    }

    const request: CertificateRequest = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      requestId: crypto.randomUUID(),
      status: "pending",
      appliedAt: new Date().toISOString(),
    };
    const nextRequests = [request, ...requests];
    setRequests(nextRequests);
    persistRequests(nextRequests);
    setForm(EMPTY_FORM);
    setNotice("Application submitted. You can track its status under My certificates.");
    setActiveTab("certificates");
  }

  function reviewRequest(requestId: string, status: "approved" | "rejected") {
    const nextRequests = requests.map((request) => {
        if (request.requestId !== requestId) return request;
        if (status === "approved") {
          return {
            ...request,
            status,
            certificateId: request.certificateId ?? makeCertificateId(),
            issuedAt: request.issuedAt ?? new Date().toISOString().slice(0, 10),
          };
        }
        return { ...request, status };
      });
    setRequests(nextRequests);
    persistRequests(nextRequests);
  }

  function verifyCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedId = queryId.trim();
    setVerificationId(cleanedId);
    const nextUrl = new URL(window.location.href);
    if (cleanedId) nextUrl.searchParams.set("verify", cleanedId);
    else nextUrl.searchParams.delete("verify");
    window.history.replaceState(null, "", nextUrl);
  }

  function openCertificate(request: CertificateRequest) {
    setSelectedCertificate(request);
  }

  const pageTitle: Record<PortalTab, string> = {
    apply: "Start your application",
    certificates: "Your applications",
    admin: "Review applications",
    verify: "Verify a certificate",
  };

  return (
    <div className="portal">
      <header className="topbar no-print">
        <div className="topbar-inner">
          <button className="brand" onClick={() => showTab("apply")} aria-label="Meridian home">
            <span className="brand-mark"><Award size={21} strokeWidth={2.2} /></span>
            <span className="brand-name">meridian<span>.</span></span>
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={activeTab === "apply" ? "nav-link active" : "nav-link"} onClick={() => showTab("apply")}>
              Apply
            </button>
            <button className={activeTab === "certificates" ? "nav-link active" : "nav-link"} onClick={() => showTab("certificates")}>
              My certificates
              {approvedCount > 0 ? <span className="nav-count">{approvedCount}</span> : null}
            </button>
            <button className={activeTab === "admin" ? "nav-link active" : "nav-link"} onClick={() => showTab("admin")}>
              <LayoutDashboard size={15} /> Admin
              {pendingCount > 0 ? <span className="nav-count">{pendingCount}</span> : null}
            </button>
            <button className={activeTab === "verify" ? "nav-link active" : "nav-link"} onClick={() => showTab("verify")}>
              <ShieldCheck size={15} /> Verify
            </button>
          </nav>
        </div>
      </header>

      <main className="page-shell">
        <section className="welcome-row no-print">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> INTERNSHIP CREDENTIALS</div>
            <h1>Good work deserves <span>proof.</span></h1>
            <p>Apply for your internship certificate, track its review, and share a credential anyone can verify.</p>
          </div>
          <div className="welcome-note">
            <ShieldCheck size={20} />
            <span><strong>Verified credentials</strong><br />Every approved certificate gets a unique ID and scannable QR.</span>
          </div>
        </section>

        <div className="workspace">
          <aside className="side-panel no-print">
            <div className="side-panel-title">WORKSPACE</div>
            <button className={activeTab === "apply" ? "side-link active" : "side-link"} onClick={() => showTab("apply")}>
              <FileCheck2 size={17} /> New application
            </button>
            <button className={activeTab === "certificates" ? "side-link active" : "side-link"} onClick={() => showTab("certificates")}>
              <Award size={17} /> My certificates <span>{approvedCount}</span>
            </button>
            <div className="side-divider" />
            <div className="side-panel-title">ADMINISTRATION</div>
            <button className={activeTab === "admin" ? "side-link active" : "side-link"} onClick={() => showTab("admin")}>
              <LayoutDashboard size={17} /> Review queue
              {pendingCount > 0 ? <span className="queue-count">{pendingCount}</span> : null}
            </button>
            <button className={activeTab === "verify" ? "side-link active" : "side-link"} onClick={() => showTab("verify")}>
              <QrCode size={17} /> Verify a credential
            </button>
            <div className="side-help">
              <div className="help-icon"><ShieldCheck size={17} /></div>
              <strong>Need a hand?</strong>
              <p>Certificates are issued after an admin reviews your internship details.</p>
              <button onClick={() => showTab("certificates")}>Check your status <span>→</span></button>
            </div>
          </aside>

          <section className="content-panel">
            <div className="content-heading no-print">
              <div>
                <span className="section-kicker">YOUR WORKSPACE</span>
                <h2>{pageTitle[activeTab]}</h2>
              </div>
              <div className="review-summary">
                <div className="summary-icon"><FileClock size={17} /></div>
                <span><strong>{pendingCount}</strong> pending review</span>
              </div>
            </div>

            {storageError ? <div className="alert alert-error no-print" role="alert">{storageError}</div> : null}
            {notice ? <div className="alert alert-success no-print" role="status"><CheckCircle2 size={17} />{notice}</div> : null}

            {activeTab === "apply" ? (
              <div className="apply-layout no-print">
                <form className="application-form" onSubmit={submitApplication}>
                  <div className="form-intro">
                    <div className="form-icon"><FileCheck2 size={19} /></div>
                    <div><h3>Internship details</h3><p>Fill in your details exactly as they should appear on the certificate.</p></div>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Full name</span>
                      <div className="input-with-icon"><UserRound size={16} /><input required minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Jordan Lee" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
                    </label>
                    <label className="field">
                      <span>Email address</span>
                      <div className="input-with-icon"><Mail size={16} /><input required type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
                    </label>
                    <label className="field">
                      <span>Internship domain</span>
                      <div className="select-wrap"><BriefcaseBusiness size={16} /><select value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })}>{DOMAINS.map((domain) => <option key={domain}>{domain}</option>)}</select></div>
                    </label>
                    <label className="field">
                      <span>Duration</span>
                      <div className="select-wrap"><Clock3 size={16} /><select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })}>{DURATIONS.map((duration) => <option key={duration}>{duration}</option>)}</select></div>
                    </label>
                    <label className="field">
                      <span>Internship mode</span>
                      <div className="select-wrap"><MapPin size={16} /><select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as InternshipMode })}>{MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div>
                    </label>
                    <div className="field date-field">
                      <span>Internship dates</span>
                      <div className="date-inputs">
                        <label><CalendarDays size={15} /><input required aria-label="Start date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /><small>Start date</small></label>
                        <span className="date-arrow">→</span>
                        <label><CalendarDays size={15} /><input required aria-label="End date" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /><small>End date</small></label>
                      </div>
                    </div>
                  </div>
                  <div className="form-footer">
                    <span><ShieldCheck size={15} /> Your email is only used for application follow-up.</span>
                    <button className="button button-primary" type="submit">Submit for review <span>→</span></button>
                  </div>
                </form>

                <aside className="process-card">
                  <div className="process-art"><div className="art-circle"><Award size={30} /></div><span className="art-spark">✦</span><span className="art-dot" /></div>
                  <span className="section-kicker">HOW IT WORKS</span>
                  <h3>One application.<br />A credential for life.</h3>
                  <ol className="process-list">
                    <li><span>1</span><div><strong>Submit your details</strong><small>Tell us about your internship.</small></div></li>
                    <li><span>2</span><div><strong>Admin review</strong><small>We verify your information.</small></div></li>
                    <li><span>3</span><div><strong>Get your certificate</strong><small>Download and share your QR code.</small></div></li>
                  </ol>
                </aside>
              </div>
            ) : null}

            {activeTab === "certificates" ? (
              <div className="list-panel no-print">
                <div className="list-toolbar"><div><strong>Applications & certificates</strong><span>Track every request you have submitted.</span></div><button className="button button-secondary" onClick={() => showTab("apply")}>+ New application</button></div>
                {requests.length === 0 ? (
                  <div className="empty-state"><div><FileCheck2 size={25} /></div><h3>No applications yet</h3><p>Submit your internship details and they will appear here for status updates.</p><button className="button button-primary" onClick={() => showTab("apply")}>Start an application <span>→</span></button></div>
                ) : (
                  <div className="request-list">{requests.map((request) => (
                    <article className="request-card" key={request.requestId}>
                      <div className="request-avatar">{request.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
                      <div className="request-main">
                        <div className="request-title"><h3>{request.domain}</h3><StatusBadge status={request.status} /></div>
                        <p>{request.name} <span>·</span> {request.duration} <span>·</span> {request.mode}</p>
                        <div className="request-meta"><span><CalendarDays size={13} /> {formatDate(request.startDate)} – {formatDate(request.endDate)}</span><span>Applied {formatDate(request.appliedAt.slice(0, 10))}</span></div>
                        {request.status === "rejected" ? <div className="rejected-note">This request was not approved. Please double-check your details and submit a new application if needed.</div> : null}
                        {request.certificateId ? <div className="certificate-id"><BadgeCheck size={14} /> Certificate ID <code>{request.certificateId}</code></div> : null}
                      </div>
                      {request.status === "approved" ? <button className="button button-primary download-button" onClick={() => openCertificate(request)}><Download size={16} /> Download certificate</button> : null}
                    </article>
                  ))}</div>
                )}
              </div>
            ) : null}

            {activeTab === "admin" ? (
              <div className="list-panel no-print">
                <div className="list-toolbar"><div><strong>Application review queue</strong><span>Review the details before approving a certificate.</span></div><span className="queue-pill">{pendingCount} awaiting review</span></div>
                {requests.length === 0 ? (
                  <div className="empty-state"><div><LayoutDashboard size={25} /></div><h3>Your review queue is clear</h3><p>New internship applications will be listed here as soon as they are submitted.</p></div>
                ) : (
                  <div className="admin-list">{requests.map((request) => (
                    <article className="admin-card" key={request.requestId}>
                      <div className="admin-card-heading"><div><div className="section-kicker">APPLICATION · {request.requestId.slice(0, 8).toUpperCase()}</div><h3>{request.name}</h3><a href={`mailto:${request.email}`}><Mail size={13} />{request.email}</a></div><StatusBadge status={request.status} /></div>
                      <div className="admin-details">
                        <div><small>DOMAIN</small><strong>{request.domain}</strong></div>
                        <div><small>DURATION</small><strong>{request.duration}</strong></div>
                        <div><small>MODE</small><strong>{request.mode}</strong></div>
                        <div><small>DATES</small><strong>{formatDate(request.startDate)} – {formatDate(request.endDate)}</strong></div>
                      </div>
                      <div className="admin-card-footer"><span>Submitted {formatDate(request.appliedAt.slice(0, 10))}</span>
                        {request.status === "pending" ? <div className="review-actions"><button className="button button-secondary button-reject" onClick={() => reviewRequest(request.requestId, "rejected")}><X size={15} /> Decline</button><button className="button button-primary" onClick={() => reviewRequest(request.requestId, "approved")}><Check size={16} /> Approve & issue</button></div> : request.certificateId ? <span className="issued-inline"><BadgeCheck size={15} /> Issued {request.certificateId}</span> : <span className="issued-inline declined-inline">Request declined</span>}
                      </div>
                    </article>
                  ))}</div>
                )}
              </div>
            ) : null}

            {activeTab === "verify" ? (
              <div className="verify-panel no-print">
                <div className="verify-intro">
                  <div className="verify-icon"><QrCode size={23} /></div>
                  <h3>Check a certificate&apos;s authenticity</h3>
                  <p>Scan the QR code printed on a Meridian certificate, or enter its unique certificate ID below.</p>
                </div>
                <form className="verify-form" onSubmit={verifyCertificate}>
                  <label htmlFor="certificate-id">Certificate ID</label>
                  <div><Search size={18} /><input id="certificate-id" placeholder="e.g. INT-2026-AB12CD34" value={queryId} onChange={(event) => setQueryId(event.target.value)} /><button className="button button-primary" type="submit">Verify certificate</button></div>
                </form>
                {verificationId ? verifiedCertificate ? (
                  <div className="verified-result">
                    <div className="verified-banner"><BadgeCheck size={19} /><div><strong>Certificate verified</strong><span>This credential is registered and approved.</span></div><span>VALID</span></div>
                    <div className="verified-details">
                      <div><small>CERTIFICATE HOLDER</small><strong>{verifiedCertificate.name}</strong></div>
                      <div><small>INTERNSHIP DOMAIN</small><strong>{verifiedCertificate.domain}</strong></div>
                      <div><small>DURATION</small><strong>{verifiedCertificate.duration}</strong></div>
                      <div><small>MODE</small><strong>{verifiedCertificate.mode}</strong></div>
                      <div><small>INTERNSHIP PERIOD</small><strong>{formatDate(verifiedCertificate.startDate)} – {formatDate(verifiedCertificate.endDate)}</strong></div>
                      <div><small>CERTIFICATE ID</small><strong className="mono-text">{verifiedCertificate.certificateId}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="not-found-result"><XCircle size={21} /><div><strong>Certificate not found</strong><span>Check the ID and try again. Only approved certificates can be verified.</span></div></div>
                ) : (
                  <div className="verify-hint"><ShieldCheck size={16} /> Verification shows only certificate details — never the holder&apos;s email.</div>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="page-footer no-print">
          <span>© Meridian Credentials</span>
          <span><ShieldCheck size={14} /> Secure certificate verification</span>
        </footer>
      </main>

      {selectedCertificate?.certificateId ? (
        <div className="certificate-overlay no-print" role="dialog" aria-modal="true" aria-label="Internship certificate">
          <div className="certificate-dialog">
            <div className="certificate-toolbar">
              <div><strong>Your certificate</strong><span>Use Download PDF, then select &quot;Save as PDF&quot; in the print dialog.</span></div>
              <div><button className="button button-secondary" onClick={() => setSelectedCertificate(null)}><X size={16} /> Close</button><button className="button button-primary" onClick={() => window.print()}><Download size={16} /> Download PDF</button></div>
            </div>
            <CertificateDocument certificate={selectedCertificate} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CertificateDocument({ certificate }: { certificate: CertificateRequest }) {
  const verificationUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(certificate.certificateId ?? "")}`;

  return (
    <article className="certificate-sheet">
      <div className="certificate-inner">
        <div className="certificate-topline"><span><Award size={19} /> MERIDIAN CREDENTIALS</span><span>INTERNSHIP PROGRAM</span></div>
        <div className="certificate-heading"><span>PROUDLY PRESENTS</span><h1>Certificate of<br /><em>Internship</em></h1><div className="certificate-rule" /></div>
        <p className="certificate-recipient-label">This certificate is awarded to</p>
        <h2 className="certificate-recipient">{certificate.name}</h2>
        <p className="certificate-copy">In recognition of successfully completing a <strong>{certificate.duration}</strong> internship in <strong>{certificate.domain}</strong>. The internship was completed in <strong>{certificate.mode.toLowerCase()}</strong> mode from <strong>{formatDate(certificate.startDate)}</strong> to <strong>{formatDate(certificate.endDate)}</strong>.</p>
        <div className="certificate-bottom">
          <div className="certificate-signature"><span className="signature-line">Meridian</span><span>Authorized issuer</span></div>
          <div className="certificate-seal"><BadgeCheck size={25} /><span>VERIFIED<br />CREDENTIAL</span></div>
          <div className="certificate-qr"><QRCodeImage value={verificationUrl} size={82} /><span>SCAN TO VERIFY</span><code>{certificate.certificateId}</code></div>
        </div>
      </div>
    </article>
  );
}
