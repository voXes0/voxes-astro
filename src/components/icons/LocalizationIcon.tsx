import type { JSX } from "solid-js";

interface LocalizationIconProps {
  class?: string;
}

export default function LocalizationIcon(props: LocalizationIconProps): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132.29 132.29" class={props.class}>
      <g fill="none" stroke="currentColor" stroke-width="7.84" stroke-linejoin="bevel">
        <circle cx="66.15" cy="66.15" r="62.23" />
        <path d="M 3.92,66.15 H 128.37" />
        <path d="M 119.11,98.81 H 13.19" />
        <path fill="currentColor" d="M 13.19,33.48 H 119.11" />
        <ellipse cx="66.15" cy="66.15" rx="31.11" ry="62.23" />
        <path fill="currentColor" d="M 66.15,128.37 V 3.92" />
      </g>
    </svg>
  );
}
