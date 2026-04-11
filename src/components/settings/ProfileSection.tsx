import { useState, useEffect, useRef } from 'react';
import { useProfile, useUpdateProfile } from '@/lib/store';
import { ArrowLeft, User, Eye, EyeOff, Save, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileSectionProps {
  onBack: () => void;
}

const ProfileSection = ({ onBack }: ProfileSectionProps) => {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    const updates: Record<string, any> = {};
    if (displayName.trim() && displayName !== profile?.display_name) {
      updates.display_name = displayName.trim();
    }
    if (Object.keys(updates).length === 0 && !newPassword) {
      toast({ title: 'No changes to save' });
      return;
    }
    try {
      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates);
      }
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
      }
      toast({ title: 'Profile updated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Please upload a JPG, PNG, or WebP image', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image must be under 2MB', variant: 'destructive' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      await updateProfile.mutateAsync({ avatar_url: avatarUrl });
      toast({ title: 'Profile photo updated! 📸' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = () => {
    if (!profile?.display_name) return '?';
    return profile.display_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Profile</h2>
      </div>

      <div className="rounded-xl bg-card p-5 border border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Profile</h3>
        </div>

        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={(profile as any)?.avatar_url || undefined} alt="Profile" />
              <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-90 transition-all disabled:opacity-50"
            >
              <Camera size={14} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
            <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-muted-foreground border border-border outline-none opacity-60" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">New Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button onClick={handleSaveProfile} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Save size={16} />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
