"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function VideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;

    setVideoSrc(
      mobile
        ? "/videos/tejjora-hero-mobile.mp4"
        : "/videos/tejjora-hero-desktop.mp4",
    );
  }, []);

  useEffect(() => {
    if (!videoSrc || !videoRef.current) return;

    const video = videoRef.current;

    video.load();

    const play = async () => {
      try {
        await video.play();
      } catch {
        // Poster remains visible if browser blocks autoplay.
      }
    };

    void play();
  }, [videoSrc]);

  return (
    <section
      className="video-hero"
      data-header-tone="light"
      aria-label="Tejjora Lake View"
    >
      <div className="video-hero__media">
        <picture className="video-hero__poster">
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero/video-poster-mobile.webp"
          />

          <img src="/images/hero/video-poster-desktop.webp" alt="" />
        </picture>

        {videoSrc && (
          <video
            ref={videoRef}
            className={`video-hero__video ${ready ? "is-ready" : ""}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={
              videoSrc.includes("mobile")
                ? "/images/hero/video-poster-mobile.webp"
                : "/images/hero/video-poster-desktop.webp"
            }
            onCanPlay={() => setReady(true)}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}

        <div className="video-hero__shade" />
        <div className="video-hero__water-glow" />
      </div>

      <div className="video-hero__content site-container">
        <div className="video-hero__copy">
          <span className="video-hero__eyebrow">
            TEJJORA · GOMTI NAGAR · LUCKNOW
          </span>

          <h1>
            Stay close to the city.
            <em> Wake up by the lake.</em>
          </h1>

          <p>
            Contemporary rooms, dining and a terrace overlooking the quieter
            side of Gomti Nagar.
          </p>

          {/* <div className="video-hero__actions">
            <Link href="/book" className="luxury-button">
              <span>Find a Stay</span>
            </Link>

            <Link href="/rooms" className="video-hero__text-link">
              Explore Rooms
            </Link>
          </div> */}
        </div>
      </div>

      {/* <div className="video-hero__scroll">
        <span>DISCOVER</span>
        <i />
      </div> */}
    </section>
  );
}
