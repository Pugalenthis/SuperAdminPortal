import React from 'react';
import { Employee } from '@shared/schema';
import { Mail, Phone } from 'lucide-react';

interface EuroBankCardTemplateProps {
  employee: Employee;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export function EuroBankCardTemplate({
  employee,
  primaryColor = '#f5b700', // Gold/amber color
  secondaryColor = '#f5b700', // Same as primary by default
  backgroundColor = '#0a2540', // Dark blue
  textColor = '#ffffff', // White
}: EuroBankCardTemplateProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-lg" style={{ height: '220px' }}>
      {/* Main background */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ backgroundColor }}
      />
      
      {/* Yellow curved section at bottom */}
      <div 
        className="absolute bottom-0 w-full"
        style={{ 
          height: '80px',
          backgroundColor: primaryColor,
          borderTopLeftRadius: '100% 80px',
          borderTopRightRadius: '0',
        }}
      />
      
      {/* Content container */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Header - Logo and Name */}
        <div className="flex flex-col items-center mb-2">
          <div className="text-center">
            <h1 
              className="text-2xl font-bold tracking-wider"
              style={{ color: textColor }}
            >
              EURO EXIM BANK
            </h1>
            <p 
              className="text-sm italic"
              style={{ color: secondaryColor }}
            >
              Facilitating Global Trade
            </p>
          </div>
        </div>
        
        {/* Spacer */}
        <div className="flex-grow"></div>
        
        {/* Contact Information in yellow section */}
        <div className="mt-auto">
          <div className="space-y-1 text-left">
            <p className="font-semibold" style={{ color: backgroundColor }}>
              Website: www.euroeximbank.com
            </p>
            <p className="font-semibold" style={{ color: backgroundColor }}>
              Enquiries: info@euroeximbank.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}