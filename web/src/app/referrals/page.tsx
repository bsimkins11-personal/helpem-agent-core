import Link from "next/link";

export default function ReferralsFaqPage() {
  return (
    <main className="bg-gradient-to-br from-gray-50 to-white">
      <section className="pt-6 pb-8 sm:pt-8 sm:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-2xl mx-auto mb-4">
            🤝
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-brandText mb-4">
            Evangelist Program FAQ
          </h1>
          <p className="text-base sm:text-lg text-brandTextLight max-w-2xl mx-auto">
            Invite friends to HelpEm. When they subscribe, you both win.
          </p>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-brandText mb-4">How It Works</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-orange-600 uppercase tracking-wide">Your Friend Gets</div>
                <p className="text-brandText font-semibold">+1 free month</p>
                <p className="text-sm text-brandTextLight">When they subscribe to Basic or Premium with your code</p>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-orange-600 uppercase tracking-wide">You Get</div>
                <p className="text-brandText font-semibold">1 free Premium month</p>
                <p className="text-sm text-brandTextLight">When they complete a paid month within 60 days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">
            <SectionTitle>Getting Started</SectionTitle>

            <FaqItem
              title="How do I invite a friend?"
              body="Share your 6-digit referral code. You can find it in Settings > Evangelist Program. Share via SMS, text, or any messaging app."
            />

            <FaqItem
              title="Where does my friend enter the code?"
              body="During signup, they'll see a 'Have a referral code?' link. They enter your 6-digit code there."
            />

            <Divider />
            <SectionTitle>Rewards for Your Friend</SectionTitle>

            <FaqItem
              title="What does my friend get for using my code?"
              body="When your friend subscribes to Basic or Premium, they get +1 free month of that tier. So if they subscribe to Premium, they get 2 months of Premium for the price of 1."
            />

            <FaqItem
              title="Do they get anything if they stay on the free tier?"
              body="No additional bonus. The +1 free month is only granted when they subscribe to a paid tier (Basic or Premium)."
            />

            <FaqItem
              title="When is their bonus applied?"
              body="Immediately when they first subscribe. Their subscription is automatically extended by 30 days."
            />

            <Divider />
            <SectionTitle>Rewards for You (the Inviter)</SectionTitle>

            <FaqItem
              title="When do I earn a free Premium month?"
              body="You earn a free Premium month when your friend completes a paid month (Basic or Premium) within 60 days of signing up."
            />

            <FaqItem
              title="What if my friend subscribes immediately?"
              body="You'll earn your reward after their first paid month completes (~30 days after they subscribe)."
            />

            <FaqItem
              title="What if they stay free for a while then upgrade?"
              body="They must convert to paid within 60 days of signup for you to receive the reward."
            />

            <FaqItem
              title="How is my free Premium month applied?"
              body="It's applied automatically to your subscription. You'll get an in-app notification when it's earned and when it starts."
            />

            <FaqItem
              title="How many free months can I earn?"
              body="Up to 3 free Premium months per calendar year."
            />

            <Divider />
            <SectionTitle>Other Questions</SectionTitle>

            <FaqItem
              title="What's the Evangelist badge?"
              body="You earn the Evangelist badge when someone signs up using your code. It appears on your profile to show you're a community advocate."
            />

            <FaqItem
              title="Where can I see my progress?"
              body="In the app, go to Settings > Evangelist Program. You'll see your signup count, earned months, and any pending rewards."
            />

            <FaqItem
              title="Can I refer myself?"
              body="No. Self-referrals are blocked."
            />

            <FaqItem
              title="Can my friend use multiple referral codes?"
              body="No. Only the first referral code used is honored. Additional codes are silently ignored."
            />

            <div className="pt-4 text-sm text-brandTextLight">
              Questions? Email support@helpem.ai
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold shadow-sm"
            >
              Open HelpEm
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-brandText">{children}</h2>
  );
}

function FaqItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-brandText">{title}</h3>
      <p className="text-brandTextLight leading-relaxed">{body}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-gray-200" />;
}
