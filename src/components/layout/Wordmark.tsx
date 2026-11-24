import Image from "next/image";
import Link from "next/link";

/** Header lockup: the official Tejjora mark plus the wordmark set in the display face. */
export function Wordmark() {
  return (
    <Link className="tj-wordmark" href="/" aria-label="Tejjora Lake View home">
      <span className="tj-wordmark__mark" aria-hidden="true">
        <Image src="/brand/tejjora-mark.png" alt="" width={1686} height={2048} sizes="40px" />
      </span>
      <span className="tj-wordmark__copy" aria-hidden="true">
        <span className="tj-wordmark__primary">Tejjora</span>
        <span className="tj-wordmark__secondary">Lake View</span>
      </span>
    </Link>
  );
}
