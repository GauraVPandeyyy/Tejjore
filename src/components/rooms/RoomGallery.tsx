"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  roomName: string;
  images: string[];
};

export function RoomGallery({ roomName, images }: Props) {
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open(index: number) {
    setActive(index);
    dialogRef.current?.showModal();
  }

  function change(delta: number) {
    setActive((current) => (current + delta + images.length) % images.length);
  }

  return (
    <>
      <div className="room-gallery">
        <button className="room-gallery__hero" type="button" onClick={() => open(0)} aria-label={`Open ${roomName} gallery`}>
          <Image src={images[0]} alt={`${roomName} interior`} fill sizes="(max-width: 820px) 100vw, 62vw" />
          <span className="room-gallery__open micro">OPEN GALLERY / {String(images.length).padStart(2, "0")}</span>
        </button>
        <div className="room-gallery__strip" aria-label={`${roomName} image previews`}>
          {images.slice(1, 4).map((src, index) => (
            <button key={src} type="button" onClick={() => open(index + 1)} aria-label={`Open ${roomName} image ${index + 2}`}>
              <Image src={src} alt="" fill sizes="(max-width: 820px) 33vw, 18vw" />
            </button>
          ))}
        </div>
      </div>

      <dialog ref={dialogRef} className="room-lightbox" onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}>
        <div className="room-lightbox__panel">
          <div className="room-lightbox__top">
            <span className="micro">{roomName} / {String(active + 1).padStart(2, "0")} OF {String(images.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => dialogRef.current?.close()}>Close</button>
          </div>
          <div className="room-lightbox__media">
            <Image src={images[active]} alt={`${roomName} image ${active + 1}`} fill sizes="100vw" />
          </div>
          <div className="room-lightbox__controls">
            <button type="button" onClick={() => change(-1)} aria-label="Previous image">← Previous</button>
            <button type="button" onClick={() => change(1)} aria-label="Next image">Next →</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
