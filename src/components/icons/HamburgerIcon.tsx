import { createEffect } from "solid-js";
import type { JSX } from "solid-js";

interface HamburgerIconProps {
  isOpen: boolean;
  class?: string;
}

/** One SMIL animation, started by `beginElement()` in the effect below. */
function Morph(props: {
  to: "toX" | "toHamburger";
  attr: "d" | "stroke-width";
  value: string;
}): JSX.Element {
  const spline =
    props.attr === "d" ? { calcMode: "spline", keyTimes: "0;1", keySplines: "0.4 0 0.2 1" } : {};
  return (
    <animate
      data-anim={props.to}
      attributeName={props.attr}
      dur="0.2s"
      begin="indefinite"
      fill="freeze"
      to={props.value}
      {...spline}
    />
  );
}

export default function HamburgerIcon(props: HamburgerIconProps): JSX.Element {
  let svgRef: SVGSVGElement | undefined;

  createEffect(() => {
    const svg = svgRef;
    if (!svg) return;

    const selector = props.isOpen ? '[data-anim="toX"]' : '[data-anim="toHamburger"]';
    svg
      .querySelectorAll<SVGAnimateElement>(selector)
      .forEach((el) => el.beginElement());
  });

  return (
    <svg
      ref={svgRef}
      viewBox="-30 -30 324.58 324.58"
      xmlns="http://www.w3.org/2000/svg"
      class={props.class}
    >
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="31.75"
        stroke-linecap="round"
        d="M 0,198.44 L 264.58,198.44"
      >
        <Morph to="toX" attr="d" value="M 49.89,49.89 L 214.69,214.69" />
        <Morph to="toHamburger" attr="d" value="M 0,198.44 L 264.58,198.44" />
      </path>
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="40"
        stroke-linecap="round"
        d="M 0,69.45 L 264.58,69.45"
      >
        <Morph to="toX" attr="d" value="M 49.89,214.69 L 214.69,49.89" />
        <Morph to="toX" attr="stroke-width" value="31.75" />
        <Morph to="toHamburger" attr="d" value="M 0,69.45 L 264.58,69.45" />
        <Morph to="toHamburger" attr="stroke-width" value="40" />
      </path>
    </svg>
  );
}
