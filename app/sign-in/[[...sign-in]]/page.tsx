import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="h-full w-full absolute inset-0 z-0">
        <div className="w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        </div>
      </div>

      <div className="relative z-10">
        <SignIn 
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-purple-600 hover:bg-purple-700 text-sm normal-case',
              card: 'bg-gray-900/95 border border-gray-700 backdrop-blur-sm',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-300',
              socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
              formFieldLabel: 'text-gray-300',
              formFieldInput: 'bg-gray-800 border-gray-600 text-white focus:border-purple-500',
              footerActionLink: 'text-purple-400 hover:text-purple-300',
              dividerText: 'text-gray-400',
              formHeaderTitle: 'text-white',
              formHeaderSubtitle: 'text-gray-300',
              identityPreviewText: 'text-gray-300',
              identityPreviewEditButton: 'text-purple-400 hover:text-purple-300'
            }
          }}
        />
      </div>
    </div>
  );
}