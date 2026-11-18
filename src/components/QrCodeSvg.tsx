import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size = 64, className = '' }) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    const payload = value.trim() || 'EXAMCORE';

    QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`border border-slate-300 bg-slate-50 flex items-center justify-center font-mono text-[9px] text-slate-500 ${className}`}
        aria-label={`QR Token ${value}`}
      >
        {value}
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`shrink-0 bg-white [&>svg]:w-full [&>svg]:h-full [&>svg]:block ${className}`}
      aria-label={`QR Code Token Ujian ${value}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
