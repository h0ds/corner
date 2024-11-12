import { SVGProps } from 'react';

export function ElevenLabsIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 876 876"
      className={className}
      {...props}
    >
      <path d="M468 292H528V584H468V292Z" fill="currentColor"/>
      <path d="M348 292H408V584H348V292Z" fill="currentColor"/>
    </svg>
  );
}