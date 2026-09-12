'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { createGeneralWhatsAppUrl } from '@/lib/whatsapp';

export default function WhatsAppFloatingBtn() {
  const url = createGeneralWhatsAppUrl('Hello! I would like to enquire about your products.');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-2xl hover:bg-[#20bd5a] hover:scale-105 active:scale-95 transition-all duration-300 group"
    >
      <div className="relative">
        <MessageCircle className="w-6 h-6 fill-current" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </div>
      <span className="font-semibold text-sm hidden sm:inline-block pr-1">Chat on WhatsApp</span>
    </a>
  );
}
