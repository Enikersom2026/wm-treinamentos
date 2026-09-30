import React, { useState, useEffect } from 'react';
import { Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerCarouselProps {
  bannerText?: string;
  noticesText?: string;
  images?: string[];
}

const DEFAULT_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1584282481015-84242828b85b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ bannerText, noticesText, images }) => {
  const bannerList = images && images.length > 0 ? images : DEFAULT_BANNER_IMAGES;
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const intervalTime = 3500; // 3.5 segundos
    const timer = setInterval(() => {
      setCounter((prevCounter) => {
        if (prevCounter + 1 >= bannerList.length) {
          return 0;
        }
        return prevCounter + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [bannerList.length]);

  const handlePrev = () => {
    setCounter((prev) => (prev === 0 ? bannerList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCounter((prev) => (prev + 1 >= bannerList.length ? 0 : prev + 1));
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Banner de Promoções / Destaque */}
      {bannerText && (
        <div id="c-promocoes" className="banner bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white p-3 rounded-xl font-bold text-center shadow-lg border border-orange-500/60 text-xs sm:text-sm flex items-center justify-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{bannerText}</span>
        </div>
      )}

      {/* Container do Carrossel com transição suave e 100% por slide */}
      <div className="carousel-container shadow-xl border border-[#3b5235] relative group">
        {/* Contagem / Badge de Banners (ex: 3 / 20) */}
        <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-orange-400 border border-orange-500/40 text-[11px] font-extrabold px-2 py-0.5 rounded-full z-10 shadow-md">
          {counter + 1} / {bannerList.length}
        </div>

        {/* Setas de Navegação Esquerda / Direita */}
        {bannerList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-orange-600 text-white p-1.5 rounded-full transition-all z-10 cursor-pointer backdrop-blur-sm border border-white/20"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-orange-600 text-white p-1.5 rounded-full transition-all z-10 cursor-pointer backdrop-blur-sm border border-white/20"
              aria-label="Próximo banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div 
          className="carousel-slide" 
          style={{ transform: `translateX(${-100 * counter}%)` }}
        >
          {bannerList.map((item, idx) => {
            const t = (item || '').trim();
            const isYouTube = t.includes('youtube.com') || t.includes('youtu.be');
            const isLocalVideo = t.startsWith('data:video/') || t.match(/\.(mp4|webm|ogg|mov|m4v|3gp|quicktime)$/i) != null;
            const isImage = t.startsWith('data:image/') || t.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null || t.startsWith('http://') || t.startsWith('https://');

            if (isYouTube) {
              let videoId = "";
              if (t.includes('v=')) videoId = t.split('v=')[1].split('&')[0];
              else if (t.includes('youtu.be/')) videoId = t.split('youtu.be/')[1].split('?')[0];
              return (
                <div key={idx} className="carousel-item shrink-0 w-full h-44 sm:h-52 md:h-60">
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} title={`Banner Video ${idx + 1}`} frameBorder="0" allowFullScreen />
                </div>
              );
            } else if (isLocalVideo) {
              return (
                <div key={idx} className="carousel-item shrink-0 w-full h-44 sm:h-52 md:h-60 bg-black flex items-center justify-center">
                  <video 
                    controls 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    src={t}
                    className="object-contain w-full h-full max-h-60"
                  >
                    <source src={t} />
                    Seu navegador não suporta a exibição deste vídeo.
                  </video>
                </div>
              );
            } else if (isImage) {
              return (
                <div key={idx} className="carousel-item shrink-0 w-full h-44 sm:h-52 md:h-60 overflow-hidden bg-black flex items-center justify-center">
                  <img 
                    src={t} 
                    alt={`Banner de Aviso ${idx + 1}`} 
                    className="carousel-image h-44 sm:h-52 md:h-60 object-cover w-full shrink-0" 
                    onError={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        e.currentTarget.style.display = 'none';
                        parent.innerHTML = `<div class="p-4 text-center text-xs font-bold text-orange-400 bg-slate-900 w-full h-full flex items-center justify-center">🎯 Banner de Destaque WM Treinamentos</div>`;
                      }
                    }}
                  />
                </div>
              );
            } else {
              return (
                <div key={idx} className="carousel-item shrink-0 w-full h-44 sm:h-52 md:h-60 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-[#182216] text-white font-bold text-center text-sm border border-[#2d3e28]">
                  🎯 {t}
                </div>
              );
            }
          })}
        </div>

        {/* Indicadores de slides (Acomoda até 20 banners) */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10 px-4">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1 px-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 scrollbar-none">
            {bannerList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCounter(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                  counter === idx ? 'bg-orange-500 w-4 sm:w-5' : 'bg-white/50 hover:bg-white w-1.5'
                }`}
                aria-label={`Ver banner ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

