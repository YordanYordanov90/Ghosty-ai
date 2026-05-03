import { SignIn } from "@clerk/nextjs";

import { AuthRouteShell } from "@/components/auth/auth-route-shell";
import {
  getClerkAuthPaths,
  getClerkSignInForceRedirectUrl,
} from "@/lib/clerk-auth-paths";

export default function SignInPage() {
  const { signInPath, signUpPath } = getClerkAuthPaths();

  return (
    <AuthRouteShell>
      <SignIn
        routing="path"
        path={signInPath}
        signUpUrl={signUpPath}
        forceRedirectUrl={getClerkSignInForceRedirectUrl()}
      />
    </AuthRouteShell>
  );
}
