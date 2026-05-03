import { SignUp } from "@clerk/nextjs";

import { AuthRouteShell } from "@/components/auth/auth-route-shell";
import {
  getClerkAuthPaths,
  getClerkSignUpForceRedirectUrl,
} from "@/lib/clerk-auth-paths";

export default function SignUpPage() {
  const { signInPath, signUpPath } = getClerkAuthPaths();

  return (
    <AuthRouteShell>
      <SignUp
        routing="path"
        path={signUpPath}
        signInUrl={signInPath}
        forceRedirectUrl={getClerkSignUpForceRedirectUrl()}
      />
    </AuthRouteShell>
  );
}
