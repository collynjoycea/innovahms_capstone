import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import NeighborhoodMap from '../components/NeighborhoodMap';
import { CALOOCAN_HOTELS } from '../data/caloocanHotels';
import resolveImg from '../utils/resolveImg';

/* =========================================================
   ABOUT US CONTENT
   EDIT YOUR CONTENT HERE
   ========================================================= */

const ABOUT_CONTENT = {

  // =========================
  // HERO
  // =========================

  heroEyebrow: 'About Innova HMS',

  heroTitle: 'Revolutionizing Hospitality',

  heroHighlight: 'Through AI',

  heroSubtitle:
    'Empowering hotels with intelligent operations, seamless management, and better guest experiences.',


  // =========================
  // OUR STORY
  // =========================

  storyEyebrow: 'Our Story',

  storyTitle:
    'Transforming Hotel Operations Through Smart Technology',

  storyBody:
    'INNOVA-HMS is a smart hotel operations information system designed to help hotels manage reservations, guest information, room availability, housekeeping, staff attendance, inventory, and payments through one connected platform.',


  // =========================
  // LOCATION / NETWORK
  // =========================

  networkEyebrow: 'Our Location',

  networkTitle:
    'Designed for Hotels in Caloocan City',

  networkBody:
    'INNOVA-HMS supports selected hotels in Caloocan City by providing centralized hotel operations, real-time information, and intelligent forecasting for better decision-making.',


  // =========================
  // CTA
  // =========================

  ctaTitle:
    'Smarter Hotel Operations Start Here',

  ctaBody:
    'Experience a connected hotel management platform designed to improve operational efficiency and support better decision-making.',

  ctaButtonLabel:
    'Explore Platform',


  // =========================
  // IMAGES
  // =========================

  heroImageUrl:
    '/images/hero-lobby.jpg',

  storyImageUrl:
    '/images/about-story-staff.jpg',
};


/* =========================================================
   HOTEL LOCATION
   ========================================================= */

const ABOUT_LOCATION = {
  id: 'innovahms-hq',
  name: 'Innova HMS Headquarters',
  address: 'Congressional Road Extension, Caloocan, Philippines',
  lat: 14.753889,
  lng: 121.031389,
};

const CALOOCAN_MAP_BOUNDS = [
  [14.62, 120.94],
  [14.79, 121.09],
];


/* =========================================================
   STATISTICS
   ========================================================= */

const ABOUT_STATS = [
  {
    label: 'Hotels Connected',
    value: 5,
  },
];


/* =========================================================
   NUMBER FORMATTER
   ========================================================= */

const compact = (value) => {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `${(amount / 1000000)
      .toFixed(1)
      .replace(/\.0$/, '')}M+`;
  }

  if (amount >= 1000) {
    return `${(amount / 1000)
      .toFixed(1)
      .replace(/\.0$/, '')}K+`;
  }

  return amount.toLocaleString();
};


/* =========================================================
   ABOUT US PAGE
   ========================================================= */

export default function AboutUs() {

  const navigate = useNavigate();
  const [hotelPins, setHotelPins] = useState(CALOOCAN_HOTELS);


  /* =========================================================
     DARK MODE
     Same theme behavior as Features.jsx
     ========================================================= */

  const [isDark, setIsDark] = useState(() => {

    const saved = localStorage.getItem('theme');

    return saved
      ? saved === 'dark'
      : window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;

  });


  useEffect(() => {

    const sync = () => {

      const saved = localStorage.getItem('theme');

      setIsDark(
        saved
          ? saved === 'dark'
          : window.matchMedia(
              '(prefers-color-scheme: dark)'
            ).matches
      );

    };


    window.addEventListener(
      'themeChanged',
      sync
    );

    window.addEventListener(
      'storage',
      sync
    );


    return () => {

      window.removeEventListener(
        'themeChanged',
        sync
      );

      window.removeEventListener(
        'storage',
        sync
      );

    };

  }, []);


  /* =========================================================
     LOAD HOTEL LOCATIONS
     
     This API is ONLY used for the map.
     It does NOT replace the text above.
     ========================================================= */

  useEffect(() => {

    const loadHotels = async () => {

      try {

        const [res, homeHotelsRes] = await Promise.all([
          fetch('/api/about'),
          fetch('/api/home/hotels'),
        ]);

        if (!res.ok) {
          throw new Error(`Unable to load hotel locations (${res.status}).`);
        }

        const payload =
          await res.json().catch(() => ({}));
        const homeHotelsPayload = homeHotelsRes.ok
          ? await homeHotelsRes.json().catch(() => ({}))
          : {};
        const homeHotels = Array.isArray(homeHotelsPayload.hotels)
          ? homeHotelsPayload.hotels
          : [];


        const pins =
          Array.isArray(
            payload.featuredHotels
          )
            ? payload.featuredHotels
                .filter(
                  (hotel) => {
                    const lat = Number(hotel.lat);
                    const lng = Number(hotel.lng);
                    const address = String(hotel.address || '').trim();

                    return (
                      address.length > 0 &&
                      address.toLowerCase().includes('caloocan') &&
                      Number.isFinite(lat) &&
                      Number.isFinite(lng) &&
                      lat >= CALOOCAN_MAP_BOUNDS[0][0] &&
                      lat <= CALOOCAN_MAP_BOUNDS[1][0] &&
                      lng >= CALOOCAN_MAP_BOUNDS[0][1] &&
                      lng <= CALOOCAN_MAP_BOUNDS[1][1]
                    );
                  }
                )
                .map((hotel) => ({
                  ...hotel,
                  lat: Number(hotel.lat),
                  lng: Number(hotel.lng),
                }))
            : [];


        const pinsByName = new Map(pins.map((hotel) => [
          hotel.name.trim().toLowerCase(),
          {
            ...hotel,
            image: resolveImg(homeHotels.find((item) =>
              item.name?.trim().toLowerCase() === hotel.name.trim().toLowerCase()
            )?.image || '/images/signup-img.png'),
          },
        ]));
        CALOOCAN_HOTELS.forEach((hotel) => {
          const name = hotel.name.toLowerCase();
          const apiHotel = homeHotels.find(
            (item) => item.name?.trim().toLowerCase() === name
          );
          const aboutHotel = pinsByName.get(name);
          pinsByName.set(name, {
            ...apiHotel,
            ...aboutHotel,
            ...hotel,
            id: apiHotel?.id ?? aboutHotel?.id ?? hotel.id,
            image: resolveImg(apiHotel?.image || aboutHotel?.image || hotel.image),
          });
        });

        setHotelPins(Array.from(pinsByName.values()));


      } catch (error) {

        console.error(
          'Unable to load hotel locations:',
          error
        );

        setHotelPins(CALOOCAN_HOTELS);

      }

    };


    loadHotels();

  }, []);


  /* =========================================================
     PAGE
     ========================================================= */

  return (

    <div
      className={`
        min-h-screen
        w-full
        ${isDark ? 'dark' : ''}
        bg-slate-50
        dark:bg-[#080d0b]
        text-[#14231e]
        dark:text-[#EEEEEE]
        font-sans
        transition-colors
        duration-300
        selection:bg-[#2FA084]/30
        overflow-x-hidden
      `}
    >


      {/* =====================================================
          HERO SECTION
          ===================================================== */}

      <section
        className="
          relative
          min-h-[48vh]
          flex
          items-center
          justify-center
          overflow-hidden
          bg-[#0a120f]
        "
      >

        {/* BACKGROUND IMAGE */}

        <div className="absolute inset-0 z-0">

          <img
            src={ABOUT_CONTENT.heroImageUrl}
            className="
              w-full
              h-full
              object-cover
              opacity-40
              scale-105
            "
            alt="Luxury Hotel Lobby"
            onError={(e) => {
              e.currentTarget.style.display =
                'none';
            }}
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-b
              from-[#080d0b]/80
              via-[#080d0b]/50
              to-[#080d0b]
            "
          />

        </div>


        {/* HERO CONTENT */}

        <div
          className="
            relative
            z-10
            w-full
            max-w-5xl
            px-6
            py-16
            text-center
          "
        >

          {/* EYEBROW */}

          <span
            className="
              text-[11px]
              font-mono
              tracking-widest
              text-[#6FCF97]
              uppercase
              block
              mb-3
            "
          >
            {ABOUT_CONTENT.heroEyebrow}
          </span>


          {/* HERO TITLE */}

          <h1
            className="
              text-4xl
              sm:text-5xl
              md:text-6xl
              font-light
              tracking-tight
              text-white
              leading-tight
            "
          >
            {ABOUT_CONTENT.heroTitle}
          </h1>


          {/* HERO HIGHLIGHT
              INDEPENDENT FROM HERO TITLE */}

          <div
            className="
              font-semibold
              text-[#6FCF97]
              text-4xl
              sm:text-5xl
              md:text-6xl
              tracking-tight
              leading-tight
            "
          >
            {ABOUT_CONTENT.heroHighlight}
          </div>


          {/* HERO DESCRIPTION */}

          <p
            className="
              mt-4
              max-w-xl
              mx-auto
              text-sm
              sm:text-base
              text-gray-300
              font-normal
              leading-relaxed
            "
          >
            {ABOUT_CONTENT.heroSubtitle}
          </p>

        </div>

      </section>


      {/* =====================================================
          OUR STORY SECTION
          ===================================================== */}

      <section
        className="
          max-w-7xl
          mx-auto
          px-6
          py-20
          grid
          lg:grid-cols-2
          gap-12
          items-center
        "
      >

        {/* STORY CONTENT */}

        <div>

          {/* SECTION EYEBROW */}

          <span
            className="
              text-[11px]
              font-mono
              tracking-widest
              text-[#1F6F5F]
              dark:text-[#6FCF97]
              uppercase
              block
              mb-1
            "
          >
            {ABOUT_CONTENT.storyEyebrow}
          </span>


          {/* STORY TITLE */}

          <h2
            className="
              text-2xl
              sm:text-3xl
              font-light
              text-[#111C18]
              dark:text-white
              leading-tight
            "
          >
            {ABOUT_CONTENT.storyTitle}
          </h2>


          {/* STORY DESCRIPTION */}

          <p
            className="
              mt-4
              text-sm
              sm:text-base
              text-gray-600
              dark:text-gray-300
              leading-relaxed
              font-normal
              mb-8
            "
          >
            {ABOUT_CONTENT.storyBody}
          </p>


          {/* STATISTICS */}

          <div
            className="
              grid
              grid-cols-2
              gap-6
              pt-6
              border-t
              border-gray-200
              dark:border-[#182924]
            "
          >

            {ABOUT_STATS.map((stat) => (

              <div key={stat.label}>

                <h3
                  className="
                    text-3xl
                    font-light
                    text-[#1F6F5F]
                    dark:text-[#6FCF97]
                  "
                >
                  {compact(stat.value)}
                </h3>

                <p
                  className="
                    text-xs
                    font-mono
                    text-gray-500
                    dark:text-gray-400
                    uppercase
                    tracking-wider
                    mt-1
                  "
                >
                  {stat.label}
                </p>

              </div>

            ))}

          </div>

        </div>


        {/* STORY IMAGE */}

        <div
          className="
            relative
            rounded-2xl
            overflow-hidden
            border
            border-gray-200
            dark:border-[#243B33]
            shadow-lg
            dark:shadow-[0_4px_25px_rgba(0,0,0,0.5)]
          "
        >

          <img
            src={ABOUT_CONTENT.storyImageUrl}
            alt="Hotel Staff"
            onError={(e) => {
              e.currentTarget.src =
                '/images/1.webp';
            }}
            className="
              w-full
              h-full
              object-cover
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-black/40
              via-transparent
              to-transparent
            "
          />

        </div>

      </section>


      {/* =====================================================
          LOCATION + MAP SECTION
          ===================================================== */}

      <section
        className="
          bg-[#0e1a16]
          dark:bg-[#0c1612]
          text-white
          py-20
          border-y
          border-[#182924]
        "
      >

        <div
          className="
            max-w-7xl
            mx-auto
            px-6
            grid
            lg:grid-cols-12
            gap-10
            items-center
          "
        >

          {/* LEFT CONTENT */}

          <div className="lg:col-span-5">

            {/* EYEBROW */}

            <span
              className="
                text-[11px]
                font-mono
                tracking-widest
                text-[#6FCF97]
                uppercase
                block
                mb-1
              "
            >
              {ABOUT_CONTENT.networkEyebrow}
            </span>


            {/* TITLE */}

            <h2
              className="
                text-2xl
                sm:text-3xl
                font-light
                mb-4
                leading-tight
                text-white
              "
            >
              {ABOUT_CONTENT.networkTitle}
            </h2>


            {/* DESCRIPTION */}

            <p
              className="
                text-sm
                sm:text-base
                text-gray-300
                leading-relaxed
                font-normal
              "
            >
              {ABOUT_CONTENT.networkBody}
            </p>

          </div>


          {/* MAP */}

          <div
            className="
              lg:col-span-7
              relative
            "
          >

            <div
              className="
                h-[480px]
                rounded-2xl
                overflow-hidden
                border
                border-[#243B33]
                shadow-xl
                relative
              "
            >

              <NeighborhoodMap
                hotels={hotelPins}
                landmarks={[]}
                hotelCenter={{
                  lat:
                    hotelPins[0]?.lat ||
                    ABOUT_LOCATION.lat,

                  lng:
                    hotelPins[0]?.lng ||
                    ABOUT_LOCATION.lng,
                }}
                focusedHotelId={null}
                maxBounds={CALOOCAN_MAP_BOUNDS}
                minZoom={10}
                hotelLocationsOnly
                showHotelAddressLabels
                showFallbackMarker={false}
                fitHotelMarkers
                showHotelImageMarkers
                onHotelClick={(hotel) => navigate(`/hoteldetail/${hotel.id}`)}
                mapHeight={480}
                isDarkMode={isDark}
              />

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          CTA SECTION
          ===================================================== */}

      <section
        className="
          max-w-4xl
          mx-auto
          px-6
          py-20
          text-center
        "
      >

        {/* CTA BADGE */}

        <span
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#2FA084]/30
            bg-[#1F6F5F]/10
            px-4
            py-1
            text-[11px]
            font-mono
            uppercase
            tracking-widest
            text-[#1F6F5F]
            dark:text-[#6FCF97]
            mb-4
          "
        >

          <Sparkles size={12} />

          Innovation

        </span>


        {/* CTA TITLE */}

        <h3
          className="
            text-2xl
            sm:text-3xl
            font-light
            text-[#111C18]
            dark:text-white
          "
        >
          {ABOUT_CONTENT.ctaTitle}
        </h3>


        {/* CTA DESCRIPTION */}

        <p
          className="
            mt-4
            max-w-xl
            mx-auto
            text-sm
            sm:text-base
            text-gray-500
            dark:text-gray-400
            leading-relaxed
            font-normal
          "
        >
          {ABOUT_CONTENT.ctaBody}
        </p>


        {/* CTA BUTTON */}

        <div className="mt-8">

          <a
            href="/vision-suites"
            className="
              inline-flex
              items-center
              gap-2
              bg-[#1F6F5F]
              hover:bg-[#288B77]
              dark:bg-[#2FA084]
              dark:hover:bg-[#288B77]
              text-white
              text-xs
              font-medium
              uppercase
              tracking-wider
              px-7
              py-3.5
              rounded-xl
              transition-all
              shadow-md
              hover:shadow-lg
            "
          >

            {ABOUT_CONTENT.ctaButtonLabel}

            <ArrowRight size={14} />

          </a>

        </div>

      </section>

    </div>
  );
}