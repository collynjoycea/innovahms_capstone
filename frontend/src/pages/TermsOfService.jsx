import React from "react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-800 dark:bg-[#07110d] dark:text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#1F6F5F] dark:text-[#6FCF97]">
              INNOVA-HMS
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Terms of Service
            </h1>
          </div>

          <Link
            to="/"
            className="inline-flex w-fit items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1F6F5F] hover:text-[#1F6F5F] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#2FA084] dark:hover:text-[#6FCF97]"
          >
            Back to Home
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#101d1a] sm:p-8 lg:p-10">
          <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300">
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">1. Welcome</h2>
              <p>
                These Terms of Service govern your access to and use of INNOVA-HMS, a hotel booking, guest services,
                and property management platform designed to help travelers and hotel operators manage reservations,
                room availability, and customer support services.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">2. Eligibility and Account Use</h2>
              <p>
                By creating an account or using INNOVA-HMS, you confirm that you are at least 18 years old or have
                proper parental or guardian consent where required by your jurisdiction. You agree to provide accurate,
                current, and complete information when registering and to keep your account credentials secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">3. Booking and Reservations</h2>
              <p>
                INNOVA-HMS acts as a digital platform that connects guests with hotel properties and related services.
                All bookings are subject to the availability, pricing, and policies of the participating hotel, and any
                reservation made through the platform is a commitment between the guest and the hotel operator. We do not
                guarantee that a reservation will be accepted without confirmation by the property.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">4. Payments and Charges</h2>
              <p>
                Payments, deposits, refunds, and cancellation rules may vary depending on the booked room, offer, or
                hotel policy. INNOVA-HMS may process or facilitate payments on behalf of participating properties, but
                the final transaction terms are governed by the applicable booking details and hotel policies disclosed
                before confirmation.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">5. Service Availability</h2>
              <p>
                INNOVA-HMS aims to provide a reliable and secure experience, but we do not guarantee uninterrupted,
                error-free, or completely secure access to the platform. We may suspend, update, or modify the service at
                any time to improve security, functionality, or compliance with legal or operational requirements.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">6. User Responsibilities</h2>
              <p>
                Users must not misuse the platform, attempt unauthorized access, upload malicious content, interfere with
                system integrity, or use INNOVA-HMS for unlawful or deceptive purposes. You are responsible for the
                accuracy of the information you provide and for any actions taken under your account.
              </p>
            </section>

            <section id="privacy-policy">
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">7. Privacy Policy</h2>
              <p>
                INNOVA-HMS collects information needed to process bookings, verify identity, improve services, manage
                hotel operations, and support customer communication. This information may include account details,
                reservation history, contact information, room preferences, and related operational data. We use this
                information only for stated business purposes and in accordance with applicable privacy laws.
              </p>
              <p className="mt-3">
                We take reasonable security precautions to protect personal and operational data, but no system is fully
                immune to risk. Users are responsible for safeguarding their own login information and should notify us
                immediately if they suspect unauthorized access or misuse of their account.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">8. Intellectual Property</h2>
              <p>
                All branding, content, interface design, and software features within INNOVA-HMS are protected by
                applicable copyright, trademark, and intellectual property laws. Users may not copy, reproduce, or reuse
                our platform content without written permission, except as expressly allowed by these terms or by law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">9. Limitation of Liability</h2>
              <p>
                INNOVA-HMS is provided on an “as is” basis. While we aim to provide accurate and useful information,
                we do not warrant that the platform will be error-free, uninterrupted, or suitable for every individual
                need. We shall not be liable for indirect, incidental, or consequential damages resulting from the use
                of the service, except where required by law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">10. Changes to Terms</h2>
              <p>
                INNOVA-HMS may update these Terms of Service from time to time to reflect operational changes, legal
                requirements, or improvements to the platform. Continued use of the service after changes become
                effective indicates your acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">11. Contact</h2>
              <p>
                If you have questions about these Terms of Service or the Privacy Policy, please contact the INNOVA-HMS
                support team through the official contact details provided on the platform or in the Help Center section.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
