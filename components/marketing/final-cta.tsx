import { SignInButton } from "./sign-in-button";
import { Zap } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Start ranking. Stop writing manually.
        </h2>
        <p className="text-blue-100 text-lg max-w-xl mx-auto mb-10">
          Sign up free today and generate your first AI SEO article in under 2
          minutes.
        </p>
        <SignInButton />
        <p className="text-blue-200 text-sm mt-4">
          No credit card required · 14-day free trial on all paid plans
        </p>
      </div>
    </section>
  );
}
