import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-top bg-no-repeat "
        style={{ backgroundImage: "url('/uth-gate.jpg')" }}
      />
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative z-10">
        <LoginForm recaptchaSiteKey={recaptchaSiteKey} />
      </div>
    </main>
  );
}