/** Platform marks share a small, quiet silhouette and the site's existing ink colour. */
export default function SocialIcon({ name }: { name: "Instagram" | "X" | "YouTube" | "OpenSea" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "Instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".85" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "X" && (
        <>
          <path d="M4 3h4.3L20 21h-4.3L4 3Z" />
          <path d="m20 3-6.6 7.6M4 21l6.6-7.6" />
        </>
      )}
      {name === "YouTube" && (
        <>
          <path d="M21 8a3 3 0 0 0-2.1-2.2C17.4 5.4 12 5.4 12 5.4s-5.4 0-6.9.4A3 3 0 0 0 3 8a23 23 0 0 0 0 8 3 3 0 0 0 2.1 2.2c1.5.4 6.9.4 6.9.4s5.4 0 6.9-.4A3 3 0 0 0 21 16a23 23 0 0 0 0-8Z" />
          <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "OpenSea" && (
        <>
          <path d="M12 2v14M9.5 4.5 3.5 14h6V4.5Zm5 0 6 9.5h-6V4.5ZM3 17h18l-3 4H6l-3-4Z" />
        </>
      )}
    </svg>
  );
}
