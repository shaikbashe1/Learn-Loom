import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, Search, Download, Share2, QrCode, CheckCircle, XCircle, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import type { DBCertificate as Certificate } from '@/types/types';

interface VerifyResult { valid: boolean; course?: string; issued?: string; score?: number }

function generateCertificatePDF(cert: Certificate, userName: string) {
  const courseTitle = cert.courses?.title ?? 'Course';
  const date = new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build SVG certificate content and trigger print/download
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#eff4ff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#004ac6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#632ecd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="560" fill="url(#bg)" rx="12"/>
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="url(#accent)" stroke-width="2" rx="8"/>
  <rect x="0" y="0" width="800" height="6" fill="url(#accent)"/>
  <!-- Logo text -->
  <text x="400" y="80" font-family="Hanken Grotesk, Georgia" font-size="28" font-weight="bold" fill="url(#accent)" text-anchor="middle">LearnLoom</text>
  <text x="400" y="108" font-family="Inter, Arial" font-size="12" fill="#64748b" text-anchor="middle" letter-spacing="4">CERTIFICATE OF COMPLETION</text>
  <!-- Divider -->
  <rect x="150" y="122" width="500" height="1" fill="#cbd5e1"/>
  <!-- Awarded to -->
  <text x="400" y="160" font-family="Inter, Arial" font-size="13" fill="#64748b" text-anchor="middle">This certifies that</text>
  <text x="400" y="205" font-family="Hanken Grotesk, Georgia" font-size="32" font-weight="bold" fill="#0f172a" text-anchor="middle">${userName}</text>
  <text x="400" y="240" font-family="Inter, Arial" font-size="13" fill="#64748b" text-anchor="middle">has successfully completed</text>
  <text x="400" y="285" font-family="Hanken Grotesk, Georgia" font-size="22" font-weight="bold" fill="url(#accent)" text-anchor="middle">${courseTitle}</text>
  <!-- Stats -->
  <text x="250" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">ISSUED ON</text>
  <text x="250" y="360" font-family="Inter, Arial" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="middle">${date}</text>
  <text x="400" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">SCORE</text>
  <text x="400" y="360" font-family="Inter, Arial" font-size="14" font-weight="bold" fill="#004ac6" text-anchor="middle">${cert.score}%</text>
  <text x="550" y="340" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">CERTIFICATE ID</text>
  <text x="550" y="360" font-family="JetBrains Mono, monospace" font-size="11" fill="#0f172a" text-anchor="middle">${cert.verification_code}</text>
  <!-- Footer -->
  <rect x="150" y="395" width="500" height="1" fill="#cbd5e1"/>
  <text x="400" y="430" font-family="Inter, Arial" font-size="11" fill="#64748b" text-anchor="middle">This certificate can be verified at learnloom.app/verify/${cert.verification_code}</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LearnLoom-Certificate-${cert.verification_code}.svg`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Certificate downloaded!');
}

export default function CertificatePage() {
  const { user, profile } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [qrCert, setQrCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('certificates')
        .select('*, courses!certificates_course_id_fkey(title, instructor_name, instructor)')
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .order('issued_at', { ascending: false });
      if (error) { console.error(error); toast.error('Failed to load certificates'); }
      setCerts(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    const { data } = await supabase
      .from('certificates')
      .select('*, courses!certificates_course_id_fkey(title)')
      .eq('verification_code', verifyId.trim())
      .eq('is_valid', true)
      .maybeSingle();
    setVerifying(false);
    if (data) {
      setVerifyResult({ valid: true, course: data.courses?.title, issued: data.issued_at, score: data.score });
    } else {
      setVerifyResult({ valid: false });
    }
  };

  const handleShare = (cert: Certificate) => {
    const url = `${window.location.origin}/verify/${cert.verification_code}`;
    if (navigator.share) {
      navigator.share({ title: 'My LearnLoom Certificate', text: `I completed ${cert.courses?.title}!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Certificate link copied to clipboard!');
    }
  };

  const userName = profile?.full_name ?? 'Student';
  const featuredCert = certs.length > 0 ? certs[0] : null;
  const remainingCerts = certs.length > 1 ? certs.slice(1) : [];

  return (
    <AppLayout title="Certificates & Achievements">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl flex gap-gutter w-full">
        
        {/* Left Sidebar (Desktop) */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="sticky top-28 glass-panel rounded-xl border border-border-base p-6 shadow-sm card-lift">
            <h3 className="font-headline-md text-[24px] font-bold text-text-primary mb-6">Achievements</h3>
            <nav className="flex flex-col gap-2">
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container border border-border-base text-primary font-label-md text-[14px] font-bold shadow-sm" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Certificates
              </a>
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-primary hover:border-border-base border border-transparent transition-all font-label-md text-[14px] font-medium" href="#">
                <span className="material-symbols-outlined">military_tech</span>
                Badges
              </a>
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-primary hover:border-border-base border border-transparent transition-all font-label-md text-[14px] font-medium" href="#">
                <span className="material-symbols-outlined">flag</span>
                Skill Milestones
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-stack-lg max-w-[800px] w-full">
          
          {/* QR Dialog */}
          <Dialog open={!!qrCert} onOpenChange={open => !open && setQrCert(null)}>
            <DialogContent className="bg-surface border-border-base max-w-[calc(100%-2rem)] md:max-w-sm text-center rounded-2xl shadow-md p-8">
              <DialogHeader>
                <DialogTitle className="text-text-primary font-headline-md text-[20px] font-bold mb-2">Certificate QR Code</DialogTitle>
              </DialogHeader>
              {qrCert && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-border-base">
                    <QRCodeDataUrl
                      text={`${window.location.origin}/verify/${qrCert.verification_code}`}
                      width={200}
                    />
                  </div>
                  <p className="text-[14px] text-text-secondary font-mono font-bold bg-surface-container px-3 py-1 rounded-md border border-border-base">{qrCert.verification_code}</p>
                  <p className="text-[13px] text-text-secondary">Scan to verify this certificate on LearnLoom</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-[400px] w-full bg-surface border border-border-base rounded-2xl shadow-sm" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-[250px] bg-surface border border-border-base rounded-2xl shadow-sm" />
                <Skeleton className="h-[250px] bg-surface border border-border-base rounded-2xl shadow-sm" />
              </div>
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border-base rounded-2xl bg-surface/50 shadow-sm">
              <Award className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-30" />
              <h3 className="font-headline-md text-[24px] font-bold text-text-primary mb-2">No Certificates Yet</h3>
              <p className="text-[15px] font-body-md text-text-secondary max-w-sm mx-auto">
                Complete a course and pass the Grand Test to earn your certificate.
              </p>
            </div>
          ) : (
            <>
              {/* Hero: Featured Certificate */}
              {featuredCert && (
                <section className="glass-panel rounded-2xl border border-border-base p-6 md:p-8 shadow-sm card-lift relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tertiary to-secondary"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border-base text-primary font-label-sm text-[12px] font-bold uppercase tracking-wider mb-3 shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">verified</span> Featured
                      </span>
                      <h1 className="font-display-lg-mobile md:font-display-lg text-[32px] md:text-[40px] font-bold text-text-primary leading-tight">{featuredCert.courses?.title}</h1>
                      <p className="font-body-lg text-[16px] text-text-secondary mt-2">Mastery Level Certification</p>
                    </div>
                  </div>
                  
                  {/* Certificate Preview (SVG Rendered) */}
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-6 border border-border-base bg-surface-container-highest shadow-inner flex items-center justify-center p-2 md:p-4">
                     <div className="w-full h-full bg-white rounded-lg shadow-sm border border-border-base flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-surface to-surface"></div>
                        <GraduationCap className="w-12 h-12 text-primary mb-2 relative z-10" />
                        <h2 className="text-[24px] md:text-[32px] font-headline-md font-bold text-text-primary relative z-10">{featuredCert.courses?.title}</h2>
                        <p className="text-[14px] text-text-secondary mt-2 relative z-10">Awarded to <span className="font-bold text-text-primary">{userName}</span></p>
                        <p className="text-[12px] text-text-secondary mt-1 relative z-10">Score: <span className="text-primary font-bold">{featuredCert.score}%</span> • Issued: {new Date(featuredCert.issued_at).toLocaleDateString()}</p>
                        
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-surface to-transparent p-4 flex flex-col justify-end">
                          <div className="flex items-center justify-center gap-2 text-primary font-label-sm font-bold text-[11px] bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 mx-auto">
                            <span className="material-symbols-outlined text-[14px]">shield_locked</span>
                            ID: {featuredCert.verification_code}
                          </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <button onClick={() => generateCertificatePDF(featuredCert, userName)} className="flex-1 bg-primary text-white font-label-md text-[14px] font-bold py-3 rounded-xl hover:bg-primary-container transition-colors flex justify-center items-center gap-2 shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">download</span> Download PDF
                    </button>
                    <div className="flex flex-1 gap-4">
                      <button onClick={() => handleShare(featuredCert)} className="flex-1 bg-surface border border-border-base text-text-primary font-label-md text-[14px] font-bold py-3 rounded-xl hover:bg-surface-container transition-colors flex justify-center items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">share</span> Share
                      </button>
                      <button onClick={() => setQrCert(featuredCert)} className="flex-1 bg-surface border border-border-base text-text-primary font-label-md text-[14px] font-bold py-3 rounded-xl hover:bg-surface-container transition-colors flex justify-center items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">qr_code</span> QR
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Grid Gallery */}
              {remainingCerts.length > 0 && (
                <section>
                  <h2 className="font-headline-lg text-[28px] font-bold text-text-primary mb-6">Earned Credentials</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {remainingCerts.map(cert => (
                      <div key={cert.id} className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm card-lift flex flex-col">
                        <div className="w-full h-32 rounded-xl bg-surface-container-low mb-4 overflow-hidden relative border border-border-base flex items-center justify-center bg-gradient-to-br from-surface to-surface-container-highest shadow-inner">
                           <GraduationCap className="w-8 h-8 text-text-secondary opacity-50" />
                           <div className="absolute top-2 right-2 bg-success/10 border border-success/20 px-2 py-1 rounded text-success font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                             <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified
                           </div>
                        </div>
                        <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-1 line-clamp-2">{cert.courses?.title}</h3>
                        <p className="font-body-sm text-[13px] text-text-secondary mb-4 flex-grow flex items-center gap-1">
                          Score: <span className="font-bold text-primary">{cert.score}%</span> • {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                        <div className="flex justify-between items-center mt-auto border-t border-border-base pt-4">
                          <button onClick={() => setQrCert(cert)} className="text-text-secondary hover:text-primary font-label-sm text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">qr_code</span> QR Code
                          </button>
                          <div className="flex gap-2">
                             <button onClick={() => handleShare(cert)} className="w-8 h-8 rounded-full bg-surface border border-border-base flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 transition-colors shadow-sm">
                               <span className="material-symbols-outlined text-[16px]">share</span>
                             </button>
                             <button onClick={() => generateCertificatePDF(cert, userName)} className="w-8 h-8 rounded-full bg-surface border border-border-base flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 transition-colors shadow-sm">
                               <span className="material-symbols-outlined text-[16px]">download</span>
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Certificate Verification Section */}
          <section className="glass-panel rounded-2xl border border-border-base p-6 md:p-8 shadow-sm relative overflow-hidden card-lift mt-4">
             <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
             <h3 className="font-headline-md text-[24px] font-bold text-text-primary flex items-center gap-2 mb-2">
               <span className="material-symbols-outlined text-primary">verified_user</span> Verify Certificate
             </h3>
             <p className="text-[14px] text-text-secondary mb-6">Enter a certificate ID below to verify its authenticity on the LearnLoom network.</p>
             
             <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-4 relative z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <Input
                    placeholder="e.g. LL-2026-CERT-XXXXXXXX"
                    className="pl-12 bg-surface border-border-base text-[15px] h-12 rounded-xl focus:ring-primary/50 focus:border-primary shadow-sm"
                    value={verifyId}
                    onChange={e => { setVerifyId(e.target.value); setVerifyResult(null); }}
                  />
                </div>
                <Button type="submit" disabled={verifying} className="h-12 px-8 bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-bold rounded-xl shadow-sm">
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                </Button>
             </form>

             {verifyResult?.valid && (
                <div className="mt-6 p-4 rounded-xl bg-success/10 border border-success/30 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-bold text-success mb-1">Certificate is Valid</p>
                    <p className="text-[13px] text-text-secondary leading-relaxed">
                      <span className="font-bold text-text-primary block mb-1">{verifyResult.course}</span>
                      {verifyResult.issued && `Issued: ${new Date(verifyResult.issued).toLocaleDateString()}`}
                      {verifyResult.score !== undefined && ` • Score: ${verifyResult.score}%`}
                    </p>
                  </div>
                </div>
              )}
              {verifyResult && !verifyResult.valid && (
                <div className="mt-6 p-4 rounded-xl bg-error/10 border border-error/30 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <XCircle className="w-6 h-6 text-error shrink-0" />
                  <div>
                    <p className="text-[15px] font-bold text-error mb-1">Certificate Not Found</p>
                    <p className="text-[13px] text-text-secondary">No valid certificate found with this code. Please check and try again.</p>
                  </div>
                </div>
              )}
          </section>

        </main>

        {/* Right Sidebar */}
        <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-8">
          
          {/* Skill Radar */}
          <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm card-lift">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-4 border-b border-border-base pb-3">Skill Focus</h3>
            <div className="w-full aspect-square rounded-full border border-border-base relative flex items-center justify-center bg-surface-container-highest overflow-hidden shadow-inner">
              <div className="absolute inset-4 rounded-full border border-border-base flex items-center justify-center">
                <div className="absolute inset-4 rounded-full border border-border-base flex items-center justify-center">
                  <div className="absolute inset-4 rounded-full border border-border-base bg-surface-container/50">
                    <svg className="w-full h-full opacity-70" viewBox="0 0 100 100">
                      <polygon fill="url(#grad1)" points="50,10 90,40 70,90 30,90 10,40" stroke="#004ac6" strokeWidth="1"></polygon>
                      <defs>
                        <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#57dffe', stopOpacity: 0.6 }}></stop>
                          <stop offset="100%" style={{ stopColor: '#632ecd', stopOpacity: 0.6 }}></stop>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="px-2 py-1 rounded bg-surface border border-border-base text-text-secondary font-label-sm text-[11px] font-bold uppercase tracking-wider shadow-sm">Frontend</span>
              <span className="px-2 py-1 rounded bg-surface border border-border-base text-text-secondary font-label-sm text-[11px] font-bold uppercase tracking-wider shadow-sm">AI/ML</span>
              <span className="px-2 py-1 rounded bg-surface border border-border-base text-text-secondary font-label-sm text-[11px] font-bold uppercase tracking-wider shadow-sm">Backend</span>
            </div>
          </div>

          {/* Achievement Timeline */}
          <div className="glass-panel rounded-2xl border border-border-base p-6 shadow-sm card-lift">
            <h3 className="font-headline-md text-[20px] font-bold text-text-primary mb-4 border-b border-border-base pb-3">Timeline</h3>
            <div className="relative pl-5 border-l-2 border-surface-container-highest flex flex-col gap-6 ml-2">
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-surface shadow-sm"></div>
                <p className="font-label-md text-[14px] font-bold text-text-primary">First Certificate</p>
                <p className="font-body-sm text-[12px] text-text-secondary mt-0.5">Earned your first cert.</p>
                <p className="font-label-sm text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest mt-1.5">Recent</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-warning ring-4 ring-surface shadow-sm"></div>
                <p className="font-label-md text-[14px] font-bold text-text-primary">7-Day Streak</p>
                <p className="font-body-sm text-[12px] text-text-secondary mt-0.5">Consistent learning.</p>
                <p className="font-label-sm text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest mt-1.5">Last Week</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-tertiary ring-4 ring-surface shadow-sm"></div>
                <p className="font-label-md text-[14px] font-bold text-text-primary">Joined LearnLoom</p>
                <p className="font-body-sm text-[12px] text-text-secondary mt-0.5">Started the journey.</p>
                <p className="font-label-sm text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest mt-1.5">Last Month</p>
              </div>
            </div>
          </div>
          
        </aside>

      </div>
    </AppLayout>
  );
}
