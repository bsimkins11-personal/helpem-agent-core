"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const personas = [
    {
      title: "Busy Parent",
      description: "Juggling kids, work, and life—HelpEm keeps it all organized",
      image: "👨‍👩‍👧‍👦"
    },
    {
      title: "Entrepreneur", 
      description: "Managing multiple projects—HelpEm never lets anything slip",
      image: "💼"
    },
    {
      title: "Student",
      description: "Balancing classes and deadlines—HelpEm keeps you on track",
      image: "🎓"
    }
  ];

  const features = [
    {
      icon: "⚡",
      title: "Instant Capture",
      description: "Just say it. HelpEm captures todos, appointments, and reminders instantly—no typing, no friction."
    },
    {
      icon: "🧠",
      title: "Smart Organization", 
      description: "Automatically categorizes everything into todos, appointments, routines, and groceries."
    },
    {
      icon: "🗣️",
      title: "Voice-First",
      description: "Optimized for natural conversation. Talk to HelpEm like you'd talk to a friend."
    },
    {
      icon: "🎯",
      title: "Zero Friction",
      description: "No back-and-forth. HelpEm asks only what's necessary, then gets out of your way."
    }
  ];

  const faqs = [
    {
      q: "How does HelpEm work?",
      a: "Simply talk or type to HelpEm. It captures your todos, appointments, and reminders, organizing them automatically. No complex setup—just natural conversation."
    },
    {
      q: "Is my data private and secure?",
      a: "Absolutely. Your data is encrypted and stored securely. We never share your information with third parties."
    },
    {
      q: "What platforms does HelpEm support?",
      a: "HelpEm is available as a native iOS app (coming soon) and web app. More platforms coming soon."
    },
    {
      q: "How much does it cost?",
      a: "HelpEm will be free during beta testing. We'll announce pricing details before general availability."
    },
    {
      q: "Can I use HelpEm with my team?",
      a: "Currently HelpEm is designed for personal use. Team features are on our roadmap!"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % personas.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-xl font-bold text-white">
                H
              </div>
              <div>
                <p className="text-lg font-semibold text-brandText">helpem</p>
                <p className="text-xs text-brandTextLight hidden sm:block">Your calm personal assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="#features" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors hidden sm:block">
                Features
              </a>
              <a href="#about" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors hidden sm:block">
                About
              </a>
              <a href="#support" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                Support
              </a>
              <Link
                href="/app"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white text-sm font-semibold hover:shadow-lg transition-all"
              >
                Try App
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Carousel */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-[500px] sm:h-[600px] rounded-3xl overflow-hidden bg-gradient-to-br from-brandBlue via-brandBlue/90 to-brandGreen">
            {personas.map((persona, index) => (
              <div
                key={index}
                className={`absolute inset-0 flex flex-col items-center justify-center text-center px-6 transition-opacity duration-1000 ${
                  currentSlide === index ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="text-8xl sm:text-9xl mb-6 animate-pulse">{persona.image}</div>
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">{persona.title}</h2>
                <p className="text-lg sm:text-xl text-white/90 max-w-2xl">{persona.description}</p>
              </div>
            ))}
            {/* Carousel dots */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {personas.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === index ? "bg-white w-8" : "bg-white/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-brandText leading-tight mb-6">
            Life's busy enough.<br />Let HelpEm handle the details.
          </h1>
          <p className="text-lg sm:text-2xl text-brandTextLight leading-relaxed max-w-3xl mx-auto">
            A personal assistant that listens, organizes, and follows through—so you can focus on what matters most.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/app"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold text-lg hover:shadow-2xl transition-all"
            >
              Try HelpEm Free
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-brandBlue text-brandBlue font-semibold text-lg hover:bg-brandBlue hover:text-white transition-all"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-brandText mb-4">How It Works</h2>
            <p className="text-lg text-brandTextLight">Three simple steps to stay organized</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-brandText mb-3">Just Say It</h3>
              <p className="text-brandTextLight leading-relaxed">
                Talk or type to HelpEm like you would to a friend. No special commands or complicated setup.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-brandText mb-3">HelpEm Organizes</h3>
              <p className="text-brandTextLight leading-relaxed">
                Automatically categorizes into todos, appointments, routines, and groceries. Smart defaults, zero friction.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-brandText mb-3">Stay On Track</h3>
              <p className="text-brandTextLight leading-relaxed">
                Get reminders at the right time. Check things off. Feel the satisfaction of an organized life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-brandText mb-4">Designed for Real Life</h2>
            <p className="text-lg text-brandTextLight">Simple features that make a big difference</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-brandBlue/20 transition-all"
              >
                <div className="text-4xl sm:text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-brandText mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-brandTextLight leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 sm:py-24 bg-gradient-to-br from-brandBlue to-brandGreen text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-6">Built by People Who Get It</h2>
          <p className="text-lg sm:text-xl leading-relaxed mb-8 text-white/90">
            We built HelpEm because we were tired of complicated productivity apps that required more management than the tasks themselves. 
            Life's busy—you need an assistant that just works.
          </p>
          <p className="text-lg sm:text-xl leading-relaxed text-white/90">
            Our mission: Make organization effortless, so you can focus on what truly matters.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-brandText mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-brandTextLight">Everything you need to know</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-brandText text-base sm:text-lg">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-brandBlue transition-transform ${openFaq === index ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === index ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-5 text-brandTextLight leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section id="support" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-brandText mb-6">Need Help?</h2>
          <p className="text-lg sm:text-xl text-brandTextLight mb-10">
            Our AI support agent is here 24/7 to answer questions and help you get the most out of HelpEm.
          </p>
          <a
            href="mailto:support@helpem.app"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold text-lg hover:shadow-2xl transition-all"
          >
            Get Support
          </a>
        </div>
      </section>

      {/* Download CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-brandBlue to-brandGreen rounded-3xl p-8 sm:p-16 text-center text-white">
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">Ready to Get Organized?</h2>
            <p className="text-lg sm:text-xl mb-10 text-white/90 max-w-2xl mx-auto">
              Join the beta and experience effortless organization. Available soon on iOS.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-brandBlue font-semibold text-lg hover:shadow-2xl transition-all"
              >
                Try Web App Now
              </Link>
              <a
                href="mailto:hello@helpem.app?subject=iOS%20Beta%20Access"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-white text-white font-semibold text-lg hover:bg-white hover:text-brandBlue transition-all"
              >
                Request iOS Beta
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-brandText mb-6">Let's Talk</h2>
          <p className="text-lg sm:text-xl text-brandTextLight mb-10">
            Have questions, feedback, or partnership ideas? We'd love to hear from you.
          </p>
          <a
            href="mailto:hello@helpem.app"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl border-2 border-brandBlue text-brandBlue font-semibold text-lg hover:bg-brandBlue hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-semibold text-lg mb-4">Product</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><Link href="/app" className="hover:text-white transition-colors">Try App</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Support</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#support" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="mailto:support@helpem.app" className="hover:text-white transition-colors">Email Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-2 text-white/70">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-xl font-bold">
                H
              </div>
              <div>
                <p className="font-semibold">helpem</p>
                <p className="text-xs text-white/60">Your calm personal assistant</p>
              </div>
            </div>
            <p className="text-sm text-white/60">© 2026 HelpEm. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
