'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  photoUrl?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

interface Skill {
  id: string;
  name: string;
  level?: string;
}

interface Certification {
  id: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
}

interface KRADocument {
  id: string;
  title: string;
  period?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  user?: { firstName: string; lastName: string; employeeId: string; designation?: string };
}

interface ProfileData {
  user: {
    id: string; employeeId: string; email: string;
    firstName: string; lastName: string;
    role: string; designation?: string; phoneNumber?: string;
    joiningDate?: string;
    department?: { name: string };
    manager?: { firstName: string; lastName: string };
  };
  profile: UserProfile | null;
  skills: Skill[];
  certifications: Certification[];
  kraDocuments: KRADocument[];
}

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const ROLE_BADGE: Record<string, string> = {
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-green-100 text-green-700',
  HR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};
const LEVEL_COLOR: Record<string, string> = {
  Beginner: 'bg-gray-100 text-gray-600',
  Intermediate: 'bg-blue-100 text-blue-700',
  Advanced: 'bg-purple-100 text-purple-700',
  Expert: 'bg-green-100 text-green-700',
};

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Resize image to max 300x300 and return base64
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 300;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Convert file to base64 for KRA (PDF/DOC)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, isRole } = useAuth();
  const [tab, setTab] = useState<'personal' | 'skills' | 'certifications' | 'kra'>('personal');
  const [data, setData] = useState<ProfileData | null>(null);
  const [allKRA, setAllKRA] = useState<KRADocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const kraFileRef = useRef<HTMLInputElement>(null);

  // Personal form
  const [personalForm, setPersonalForm] = useState({
    phoneNumber: '', designation: '',
    bio: '', address: '', city: '', state: '', pincode: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  });

  // Skill form
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');

  // Cert form
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '' });

  // KRA form
  const [kraTitle, setKraTitle] = useState('');
  const [kraPeriod, setKraPeriod] = useState('');
  const [kraFile, setKraFile] = useState<File | null>(null);
  const [kraUploading, setKraUploading] = useState(false);

  const isHRAdmin = isRole('HR', 'ADMIN');
  const isManager = isRole('MANAGER');
  const isAdmin = isRole('ADMIN');

  const loadProfile = useCallback(async () => {
    try {
      const d = await api.getMyProfile() as ProfileData;
      setData(d);
      setPersonalForm({
        phoneNumber: d.user.phoneNumber || '',
        designation: d.user.designation || '',
        bio: d.profile?.bio || '',
        address: d.profile?.address || '',
        city: d.profile?.city || '',
        state: d.profile?.state || '',
        pincode: d.profile?.pincode || '',
        emergencyName: d.profile?.emergencyName || '',
        emergencyPhone: d.profile?.emergencyPhone || '',
        emergencyRelation: d.profile?.emergencyRelation || '',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadProfile();
      if (isHRAdmin || isManager) {
        try {
          const kra = await api.getAllKRA() as KRADocument[];
          setAllKRA(kra);
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [isHRAdmin, isManager, loadProfile]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    setSaving(true);
    try {
      const base64 = await resizeImage(file);
      await api.updateProfile({ photoUrl: base64 });
      await loadProfile();
      showSuccess('Profile photo updated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setSaving(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  }

  async function handleSavePersonal() {
    setSaving(true);
    try {
      await Promise.all([
        api.updateBasicInfo({ phoneNumber: personalForm.phoneNumber, designation: personalForm.designation }),
        api.updateProfile({
          bio: personalForm.bio,
          address: personalForm.address,
          city: personalForm.city,
          state: personalForm.state,
          pincode: personalForm.pincode,
          emergencyName: personalForm.emergencyName,
          emergencyPhone: personalForm.emergencyPhone,
          emergencyRelation: personalForm.emergencyRelation,
        }),
      ]);
      await loadProfile();
      showSuccess('Profile saved successfully');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSkill() {
    if (!skillName.trim()) return;
    try {
      await api.addSkill(skillName.trim(), skillLevel);
      await loadProfile();
      setSkillName('');
      showSuccess('Skill added');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleDeleteSkill(id: string) {
    try {
      await api.deleteSkill(id);
      await loadProfile();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleAddCert() {
    if (!certForm.name.trim()) return;
    setSaving(true);
    try {
      await api.addCertification(certForm);
      await loadProfile();
      setShowCertForm(false);
      setCertForm({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '' });
      showSuccess('Certification added');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCert(id: string) {
    try {
      await api.deleteCertification(id);
      await loadProfile();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleKRAUpload() {
    if (!kraTitle.trim() || !kraFile) return;
    if (kraFile.size > 10 * 1024 * 1024) { setError('File too large. Max 10MB.'); return; }
    setKraUploading(true);
    try {
      const base64 = await fileToBase64(kraFile);
      await api.uploadKRA({
        title: kraTitle.trim(),
        period: kraPeriod.trim() || undefined,
        fileUrl: base64,
        fileName: kraFile.name,
        fileSize: kraFile.size,
        mimeType: kraFile.type,
      });
      await loadProfile();
      if (isHRAdmin || isManager) {
        const kra = await api.getAllKRA() as KRADocument[];
        setAllKRA(kra);
      }
      setKraTitle('');
      setKraPeriod('');
      setKraFile(null);
      if (kraFileRef.current) kraFileRef.current.value = '';
      showSuccess('KRA document uploaded');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload KRA');
    } finally {
      setKraUploading(false);
    }
  }

  async function handleDeleteKRA(id: string) {
    if (!confirm('Delete this KRA document?')) return;
    try {
      await api.deleteKRA(id);
      await loadProfile();
      if (isHRAdmin || isManager) {
        const kra = await api.getAllKRA() as KRADocument[];
        setAllKRA(kra);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  function downloadKRA(doc: KRADocument) {
    if (!doc.fileUrl) return;
    const a = document.createElement('a');
    a.href = doc.fileUrl;
    a.download = doc.fileName;
    a.click();
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const u = data?.user;
  const profile = data?.profile;
  const initials = u ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() : 'U';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400">✕</button>
        </div>
      )}

      {/* Profile header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
        {/* Orange banner */}
        <div className="h-36 w-full relative" style={{ background: 'linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))' }}>
          <div className="absolute top-5 right-10 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -top-3 right-28 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute bottom-4 left-1/2 w-10 h-10 rounded-full bg-white/10" />
        </div>
        <div className="px-6 pb-6">
          {/* Avatar row — overlaps the orange banner */}
          <div className="flex items-end gap-4 -mt-14 mb-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">{initials}</span>
                )}
              </div>
              <button
                onClick={() => photoRef.current?.click()}
                disabled={saving}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 text-sm"
                title="Change photo"
              >
                📷
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {/* Spacer to align button row to avatar bottom */}
            <div className="pb-1 invisible select-none" aria-hidden>placeholder</div>
          </div>
          {/* Name & role — clearly in the white area */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{u?.firstName} {u?.lastName}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {u?.designation && <span className="text-sm text-gray-500 font-medium">{u.designation}</span>}
              {u?.department && <span className="text-sm text-gray-400">· {u.department.name}</span>}
              {u?.role && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                  {u.role}
                </span>
              )}
            </div>
          </div>
          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {[
              { label: 'Employee ID', value: u?.employeeId },
              { label: 'Email', value: u?.email },
              { label: 'Joined', value: u?.joiningDate ? new Date(u.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Manager', value: u?.manager ? `${u.manager.firstName} ${u.manager.lastName}` : '—' },
            ].map(f => (
              <div key={f.label}>
                <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                <div className="text-sm font-medium text-gray-800 truncate">{f.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'personal', label: '👤 Personal' },
          { id: 'skills', label: '⚡ Skills' },
          { id: 'certifications', label: '🏆 Certifications' },
          { id: 'kra', label: '📊 KRA' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Personal Tab ──────────────────────────────────────── */}
      {tab === 'personal' && (
        <div className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="+91 98765 43210"
                  value={personalForm.phoneNumber}
                  onChange={e => setPersonalForm(p => ({ ...p, phoneNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Designation</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="e.g. Senior Developer"
                  value={personalForm.designation}
                  onChange={e => setPersonalForm(p => ({ ...p, designation: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Bio</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  placeholder="A short description about yourself..."
                  rows={3}
                  value={personalForm.bio}
                  onChange={e => setPersonalForm(p => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Street Address</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="House no., Street, Area"
                  value={personalForm.address}
                  onChange={e => setPersonalForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="Mumbai"
                  value={personalForm.city}
                  onChange={e => setPersonalForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="Maharashtra"
                  value={personalForm.state}
                  onChange={e => setPersonalForm(p => ({ ...p, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pincode</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="400001"
                  value={personalForm.pincode}
                  onChange={e => setPersonalForm(p => ({ ...p, pincode: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="Full name"
                  value={personalForm.emergencyName}
                  onChange={e => setPersonalForm(p => ({ ...p, emergencyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="+91 98765 43210"
                  value={personalForm.emergencyPhone}
                  onChange={e => setPersonalForm(p => ({ ...p, emergencyPhone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Relationship</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="e.g. Spouse, Parent"
                  value={personalForm.emergencyRelation}
                  onChange={e => setPersonalForm(p => ({ ...p, emergencyRelation: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSavePersonal}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* ── Skills Tab ─────────────────────────────────────────── */}
      {tab === 'skills' && (
        <div className="space-y-5">
          {/* Add skill */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Add Skill</h2>
            <div className="flex gap-3 flex-wrap">
              <input
                className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="e.g. React, Python, Project Management"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
              />
              <select
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value)}
              >
                {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={handleAddSkill}
                disabled={!skillName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Skills list */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              My Skills <span className="text-gray-400 font-normal text-sm">({data?.skills.length || 0})</span>
            </h2>
            {(data?.skills.length || 0) === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <div className="text-3xl mb-2">⚡</div>
                No skills added yet. Add your first skill above.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data?.skills.map(skill => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl group hover:border-red-200 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800">{skill.name}</span>
                    {skill.level && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEVEL_COLOR[skill.level] || 'bg-gray-100 text-gray-500'}`}>
                        {skill.level}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Certifications Tab ─────────────────────────────────── */}
      {tab === 'certifications' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Certifications & Credentials</h2>
            <button
              onClick={() => setShowCertForm(!showCertForm)}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-xl"
              style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
            >
              {showCertForm ? 'Cancel' : '+ Add Certification'}
            </button>
          </div>

          {showCertForm && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">New Certification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Certification Name *</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="e.g. AWS Solutions Architect"
                    value={certForm.name}
                    onChange={e => setCertForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Issuing Organization</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="e.g. Amazon Web Services"
                    value={certForm.issuer}
                    onChange={e => setCertForm(p => ({ ...p, issuer: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Credential ID</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="Certificate number / URL"
                    value={certForm.credentialId}
                    onChange={e => setCertForm(p => ({ ...p, credentialId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Issue Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    value={certForm.issueDate}
                    onChange={e => setCertForm(p => ({ ...p, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    value={certForm.expiryDate}
                    onChange={e => setCertForm(p => ({ ...p, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={handleAddCert}
                disabled={saving || !certForm.name.trim()}
                className="mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
              >
                {saving ? 'Saving...' : 'Save Certification'}
              </button>
            </div>
          )}

          {(data?.certifications.length || 0) === 0 && !showCertForm ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-400 text-sm">No certifications added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.certifications.map(cert => {
                const expired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                const expiringSoon = cert.expiryDate && !expired &&
                  new Date(cert.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <div key={cert.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-xl shrink-0">🏆</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{cert.name}</span>
                        {expired && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Expired</span>}
                        {expiringSoon && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-medium">Expiring soon</span>}
                      </div>
                      {cert.issuer && <div className="text-xs text-gray-500 mt-0.5">{cert.issuer}</div>}
                      <div className="flex gap-4 mt-1">
                        {cert.issueDate && (
                          <span className="text-xs text-gray-400">
                            Issued: {new Date(cert.issueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span className={`text-xs ${expired ? 'text-red-400' : expiringSoon ? 'text-yellow-500' : 'text-gray-400'}`}>
                            Expires: {new Date(cert.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {cert.credentialId && (
                        <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">ID: {cert.credentialId}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCert(cert.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── KRA Tab ────────────────────────────────────────────── */}
      {tab === 'kra' && (
        <div className="space-y-5">
          {/* Upload form */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Upload KRA Document</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="e.g. Annual KRA FY 2025-26"
                  value={kraTitle}
                  onChange={e => setKraTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Period</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="e.g. Q1 2026, FY 2025-26"
                  value={kraPeriod}
                  onChange={e => setKraPeriod(e.target.value)}
                />
              </div>
            </div>
            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                kraFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
              }`}
              onClick={() => kraFileRef.current?.click()}
            >
              <input
                ref={kraFileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={e => setKraFile(e.target.files?.[0] || null)}
              />
              {kraFile ? (
                <div>
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-sm font-medium text-gray-800">{kraFile.name}</div>
                  <div className="text-xs text-gray-400">{formatBytes(kraFile.size)}</div>
                  <button
                    onClick={e => { e.stopPropagation(); setKraFile(null); if (kraFileRef.current) kraFileRef.current.value = ''; }}
                    className="mt-2 text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📂</div>
                  <div className="text-sm text-gray-600 font-medium">Click to select file</div>
                  <div className="text-xs text-gray-400 mt-1">PDF, Word, Excel, PowerPoint · Max 10MB</div>
                </div>
              )}
            </div>
            <button
              onClick={handleKRAUpload}
              disabled={kraUploading || !kraTitle.trim() || !kraFile}
              className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex items-center gap-2"
              style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
            >
              {kraUploading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
              ) : (
                '⬆️ Upload KRA'
              )}
            </button>
          </div>

          {/* My KRA documents */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-sm">My KRA Documents</h3>
            </div>
            {(data?.kraDocuments.length || 0) === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <div className="text-3xl mb-2">📊</div>
                No KRA documents uploaded yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.kraDocuments.map(doc => (
                  <div key={doc.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-lg shrink-0">📄</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{doc.title}</div>
                      <div className="flex gap-3 mt-0.5">
                        {doc.period && <span className="text-xs text-gray-400">{doc.period}</span>}
                        <span className="text-xs text-gray-400">{doc.fileName}</span>
                        {doc.fileSize && <span className="text-xs text-gray-300">{formatBytes(doc.fileSize)}</span>}
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => downloadKRA(doc)}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        ⬇️ Download
                      </button>
                      <button
                        onClick={() => handleDeleteKRA(doc.id)}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HR/Admin/Manager: all KRAs */}
          {(isHRAdmin || isManager) && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">All Employee KRA Documents</h3>
                <span className="text-xs text-gray-400">{allKRA.length} total</span>
              </div>
              {allKRA.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No KRA documents submitted yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Document</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Period</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Uploaded</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allKRA.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          {doc.user && (
                            <div>
                              <div className="font-medium text-gray-900">{doc.user.firstName} {doc.user.lastName}</div>
                              <div className="text-xs text-gray-400">{doc.user.employeeId}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{doc.title}</div>
                          <div className="text-xs text-gray-400">{doc.fileName}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{doc.period || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => downloadKRA(doc)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                          >
                            ⬇️ Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Admin shortcut to Employees directory ──────────────── */}
      {isAdmin && (
        <a
          href="/dashboard/employees"
          className="mt-6 flex items-center justify-between bg-white border border-red-100 rounded-2xl p-5 hover:shadow-md transition-shadow group"
          style={{ background: 'linear-gradient(90deg, rgb(255,247,247), rgb(255,252,247))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))' }}>
              <span>👥</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Employee Directory</div>
              <div className="text-xs text-gray-400 mt-0.5">View all employees · Assign & change managers</div>
            </div>
          </div>
          <span className="text-red-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
        </a>
      )}
    </div>
  );
}
