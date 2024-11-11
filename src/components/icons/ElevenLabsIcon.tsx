import { SVGProps } from 'react';

export function ElevenLabsIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      {...props}
    >
      <rect width="512" height="512" fill="#000000" rx="104" ry="104"/>
      <path
        fill="#FFFFFF"
        d="M274 146h60v220h-60V146z"
      />
      <path
        fill="#FFFFFF" 
        d="M154 146h60v220h-60V146z"
      />
    </svg>
  );
}