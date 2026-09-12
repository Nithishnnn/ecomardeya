'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
  User,
} from 'lucide-react';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { createGeneralWhatsAppUrl } from '@/lib/whatsapp';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });

  const whatsAppUrl = createGeneralWhatsAppUrl('Hi! I have an enquiry regarding an order/product from ARDEYA ENTERPRISES.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', phone: '', email: '', message: '' });
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <Image
            src="/logo.png"
            alt="ARDEYA ENTERPRISES Logo"
            width={64}
            height={64}
            priority
            className="w-full h-full object-contain rounded-full drop-shadow-md"
          />
        </div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
          ARDEYA ENTERPRISES
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1 mb-3">
          Contact Customer Support
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Have an inquiry about your order, products, or shipping? Contact us directly, email, call, or chat with us on WhatsApp & Instagram.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          {/* Business Details Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Official Business Information
              </span>
              <h2 className="text-xl font-black text-slate-900">ARDEYA ENTERPRISES</h2>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">Contact Person: ARIKUMAR P</p>
            </div>

            <div className="space-y-4 text-sm text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Registered Address</p>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
                    17, THIRUVALLUVAR CITY PHASE 2,<br />
                    RAGUNADHAPURAM,<br />
                    MANGADU,<br />
                    CHENNAI - 600122
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Phone</p>
                  <a
                    href="tel:9498109777"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors text-sm"
                  >
                    9498109777
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Email Address</p>
                  <a
                    href="mailto:ardeyaenterprises@gmail.com"
                    className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors text-sm break-all"
                  >
                    ardeyaenterprises@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <InstagramIcon className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Instagram</p>
                  <a
                    href="https://instagram.com/ecomardeya_2025"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-700 font-semibold transition-colors text-sm"
                  >
                    @ecomardeya_2025
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Chat Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-xl font-bold">Fastest Response on WhatsApp</h2>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Connect directly with our team for immediate assistance, order tracking, and product queries.
            </p>
            <div className="pt-2">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-emerald-800 font-bold px-6 py-3 rounded-xl text-sm shadow-md hover:bg-emerald-50 transition-all hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                <span>Open WhatsApp Chat</span>
              </a>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Send an Enquiry</h2>
          <p className="text-xs text-slate-500 mb-6">
            Fill out the form below and our customer relations team will contact you within 24 hours.
          </p>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-base">Message Sent Successfully!</h4>
              <p className="text-xs text-emerald-600">
                Thank you for reaching out. A representative will get in touch with you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Roy"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9498109777"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="ananya@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Message / Order Query <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we assist you today? Mention Order ID if applicable..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:bg-white focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
