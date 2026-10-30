import { SignUp } from "@clerk/react";
import Nav from "@/components/Nav";
import { CLERK_ENABLED } from "@/lib/clerk-config";

function AuthUnavailable() {
  return (
    <div className="max-w-md text-center space-y-3">
      <h1 className="font-display text-3xl text-ink">Sign-in is not available here</h1>
      <p className="text-ink/70">Accounts work on catscandance.com. Everything else on this page works as normal.</p>
      <a href="https://catscandance.com/sign-up" className="inline-block underline text-magenta">Go to catscandance.com</a>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Nav />
      <div className="flex-1 flex items-center justify-center p-6">
        {!CLERK_ENABLED ? <AuthUnavailable /> : <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />}
      </div>
    </div>
  );
}
