import Image from "next/image";
import Link from "next/link";

type WordmarkProps = {
  compact?: boolean;
};

export function Wordmark({ compact = false }: WordmarkProps) {
  return (
    <Link className="wordmark" href="/" aria-label="Tejjora Lake View home" data-compact={compact ? "true" : "false"}>
      <span className="wordmark__mark" aria-hidden="true">
        <Image
          src="/brand/tejjora-mark.png"
          alt=""
          width={980}
          height={900}
          sizes="48px"
          priority
        />
      </span>
      <span className="wordmark__copy" aria-hidden="true">
        <span className="wordmark__primary">TEJJORA</span>
        <span className="wordmark__secondary">LAKE VIEW</span>
      </span>
    </Link>
  );
}
