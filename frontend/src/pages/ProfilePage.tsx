import { LoaderCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/store/authStore';

export function ProfilePage() {
  const { isLoading } = useCurrentUser();
  const user = useAuthStore((state) => state.user);
  return (
    <div className="space-y-7 animate-fade-up">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Manage your personal information and account password."
      />
      {isLoading && !user ? (
        <div className="grid h-64 place-items-center">
          <LoaderCircle className="size-7 animate-spin text-primary-600" />
        </div>
      ) : user ? (
        <Card className="overflow-hidden">
          <ProfileHeader user={user} />
          <ProfileForm user={user} />
        </Card>
      ) : (
        <Card className="p-8 text-center text-sm text-slate-500">
          Your profile could not be loaded.
        </Card>
      )}
    </div>
  );
}
