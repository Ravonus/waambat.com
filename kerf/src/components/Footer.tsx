import Sigil from "./Sigil";
import SocialIcon from "./SocialIcon";
import SiteLink from "./navigation/SiteLink";
import styles from "./Footer.module.css";
const socials = [
  { name: "Instagram", href: "https://instagram.com/waambat" },
  { name: "X", href: "https://twitter.com/waambat" },
  { name: "YouTube", href: "https://www.youtube.com/waambat" },
  { name: "OpenSea", href: "https://opensea.io/waambat" },
] as const;
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <SiteLink href="/" className={styles.signature} aria-label="WAAMB.AT home">
        <Sigil />
        <span>WAAMB.AT</span>
      </SiteLink>
      <nav aria-label="Social links" className={styles.socials}>
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WAAMBAT on ${social.name}`}
            className={styles.social}
          >
            <SocialIcon name={social.name} />
            <span>{social.name}</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}
