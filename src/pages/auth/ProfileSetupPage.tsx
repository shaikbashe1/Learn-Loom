import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const domains = ['Data Science', 'Web Development', 'AI/ML', 'Cybersecurity', 'DSA', 'Mobile Dev', 'Cloud Computing', 'DevOps'];

export default function ProfileSetupPage() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const toggleDomain = (d: string) => {
    setSelectedDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim() || null,
        bio: bio.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save profile', { description: error.message });
      setSaving(false);
      return;
    }

    await refreshProfile();
    toast.success('Profile setup complete!');
    navigate('/dashboard');
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex items-center justify-center p-gutter relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-[pulse_10s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute top-[40%] right-[10%] w-80 h-80 bg-secondary-container/30 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-[pulse_12s_ease-in-out_infinite_alternate_reverse]"></div>
        <div className="absolute bottom-[10%] left-[30%] w-[30rem] h-[30rem] bg-tertiary-container/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <main className="relative z-10 w-full max-w-xl px-margin-mobile md:px-0 py-2xl">
        {/* Brand Header */}
        <div className="text-center mb-xl">
          <h1 className="font-display text-display text-primary tracking-tight mb-sm">Quovexi</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Engineer your potential.</p>
        </div>

        <div className="glass-panel rounded-[24px] p-stack-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="mb-stack-lg border-b border-outline-variant/30 pb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Complete Your Profile</h2>
            <div className="flex gap-2 mt-4">
              {['Account', 'Verification', 'Profile'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 2 ? 'bg-primary text-on-primary' : 'bg-primary/20 text-primary border border-primary/40'}`}>
                    {i < 2 ? <span className="material-symbols-outlined text-[14px]">check</span> : 3}
                  </div>
                  <span className={`text-label-sm font-label-sm ${i === 2 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{step}</span>
                  {i < 2 && <span className="text-on-surface-variant mx-1">›</span>}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-2xl border-2 border-primary/40">
                  {name ? name.slice(0, 2).toUpperCase() : '??'}
                </div>
                <button type="button" className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-surface shadow-sm hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[14px] text-on-primary">photo_camera</span>
                </button>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface">Profile Photo</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">We'll use your initials for now</p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-sm">Display Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
                <input 
                  type="text" 
                  required 
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-full py-md pl-[3.5rem] pr-6 font-body-md text-body-md placeholder:text-outline transition-all duration-200" 
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-sm">Bio (Optional)</label>
              <textarea 
                placeholder="Tell us about yourself and your learning goals..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary rounded-2xl p-4 font-body-md text-body-md placeholder:text-outline transition-all duration-200 resize-none" 
              />
            </div>

            {/* Learning Interests */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-sm">Learning Interests (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {domains.map(d => {
                  const isSelected = selectedDomains.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDomain(d)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-sm text-label-sm border transition-all ${
                        isSelected 
                          ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_8px_rgba(0,74,198,0.2)]' 
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/60 hover:border-outline-variant hover:text-on-surface'
                      }`}
                    >
                      {isSelected && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-primary text-on-primary font-headline-md text-headline-md rounded-full py-md mt-sm hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-sm"
            >
              {saving ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">rocket_launch</span>}
              Complete Setup & Start Learning
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
