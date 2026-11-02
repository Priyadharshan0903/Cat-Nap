import type { SVGProps } from "react";
import { REGION_COATS } from "../lib/palette";
export const CATS = [
  {
    id: "mochi",
    name: "Mochi",
    coat: "#eee9df",
    patch: "#b9ae9c",
    nose: "#bd7772",
    description: "Professional sunbeam finder.",
    unlock: 0,
  },
  {
    id: "ginger",
    name: "Ginger",
    coat: "#e9ae69",
    patch: "#bb783e",
    nose: "#b96965",
    description: "A little curious. A lot of fluff.",
    unlock: 0,
  },
  {
    id: "luna",
    name: "Luna",
    coat: "#616e72",
    patch: "#394b4e",
    nose: "#d39794",
    description: "The moonlight kind of company.",
    unlock: 0,
  },
  {
    id: "olive",
    name: "Olive",
    coat: "#b8b49c",
    patch: "#797d61",
    nose: "#ad7770",
    description: "Happiest between the houseplants.",
    unlock: 8,
  },
  {
    id: "peaches",
    name: "Peaches",
    coat: "#edc1af",
    patch: "#c98f7a",
    nose: "#a96362",
    description: "Soft paws. Strong opinions.",
    unlock: 24,
  },
  {
    id: "cloud",
    name: "Cloud",
    coat: "#fffdf4",
    patch: "#d4dce0",
    nose: "#c58b88",
    description: "A very small, very sleepy cloud.",
    unlock: 48,
  },
];
type Props = SVGProps<SVGSVGElement> & {
  kind?: string;
  sleeping?: boolean;
  faceOnly?: boolean;
  happy?: boolean;
  region?: number;
};
export function Cat({
  kind = "mochi",
  sleeping = false,
  faceOnly = false,
  happy = false,
  region,
  ...props
}: Props) {
  const base = CATS.find((c) => c.id === kind) ?? CATS[0];
  const cat =
    region === undefined
      ? base
      : { ...base, ...REGION_COATS[region % REGION_COATS.length] };
  return (
    <svg
      viewBox={faceOnly ? "16 5 98 87" : "0 0 140 140"}
      fill="none"
      aria-hidden="true"
      data-coat={cat.coat}
      {...props}
    >
      {!faceOnly && (
        <g>
          <path
            d="M99 112C133 124 143 87 124 85C111 84 125 106 106 102"
            stroke={cat.patch}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M35 119C26 109 28 91 36 80C49 64 89 65 101 87C112 107 104 125 85 128L49 129Z"
            fill={cat.coat}
            stroke="#384f49"
            strokeWidth="2.6"
          />
          <path
            d="M48 125L51 110M80 126L78 111"
            stroke={cat.patch}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M37 94L46 97M34 104L43 106M95 93L87 97"
            stroke={cat.patch}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
      <g className="cat-head">
        <path
          d="M26 42L24 13Q23 8 28 10L47 24Q62 20 76 25L94 11Q98 8 99 14L98 45C110 66 95 85 66 86C37 87 17 73 24 51Z"
          fill={cat.coat}
          stroke="#384f49"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M29 19L31 37L42 28Z M92 20L81 30L93 38Z"
          fill={cat.nose}
          opacity=".65"
        />
        <path
          d="M51 25L54 35M63 24L64 36M76 27L73 36"
          stroke={cat.patch}
          strokeWidth="4"
          strokeLinecap="round"
        />
        {sleeping || happy ? (
          <g stroke="#384f49" strokeWidth="2.6" strokeLinecap="round">
            <path d={happy ? "M39 54Q45 45 51 54" : "M39 50Q45 57 51 50"} />
            <path d={happy ? "M76 54Q82 45 88 54" : "M76 50Q82 57 88 50"} />
          </g>
        ) : (
          <g fill="#384f49">
            <ellipse cx="45" cy="51" rx="3" ry="4" />
            <ellipse cx="82" cy="51" rx="3" ry="4" />
            <circle cx="46" cy="49.5" r="1" fill="white" />
            <circle cx="83" cy="49.5" r="1" fill="white" />
          </g>
        )}
        <ellipse
          cx="37"
          cy="63"
          rx="7"
          ry="3.5"
          fill={cat.nose}
          opacity=".24"
        />
        <ellipse
          cx="90"
          cy="63"
          rx="7"
          ry="3.5"
          fill={cat.nose}
          opacity=".24"
        />
        <path d="M59 59Q64 56 69 59L64 64Z" fill={cat.nose} />
        <path
          d="M64 64V67Q59 73 55 68M64 67Q69 73 73 68"
          stroke="#384f49"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <g
          stroke="#384f49"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".7"
        >
          <path d="M33 59L20 56M33 66L19 68M95 59L108 55M96 66L110 68" />
        </g>
      </g>
    </svg>
  );
}
export function WindowScene({
  kind = "mochi",
  happy = false,
}: {
  kind?: string;
  happy?: boolean;
}) {
  return (
    <svg
      className="window-scene"
      viewBox="0 0 280 290"
      fill="none"
      aria-hidden="true"
    >
      <path d="M55 216V102a86 86 0 0 1 172 0v114" fill="#e7eee6" />
      <path d="M63 215V103a78 78 0 0 1 156 0v112" fill="#f2e9cb" />
      <circle cx="167" cy="91" r="30" fill="#e9c96e" />
      <path d="M66 161Q100 132 137 158T216 153V215H66Z" fill="#c8d8bc" />
      <path d="M66 184Q106 165 144 184T216 179V216H66Z" fill="#a9c5a9" />
      <path d="M140 29V214M64 121H220" stroke="#fffdf7" strokeWidth="7" />
      <path
        d="M58 216V103a83 83 0 0 1 166 0v113"
        stroke="#8f9a7c"
        strokeWidth="3"
      />
      <path d="M40 218H239V230H40Z" fill="#d6c7aa" />
      <path d="M40 230H239" stroke="#b3a487" strokeWidth="2" />
      <ellipse cx="143" cy="246" rx="75" ry="10" fill="#e8e7dc" />
      <Cat
        x="73"
        y="117"
        width="150"
        height="150"
        kind={kind}
        sleeping={!happy}
        happy={happy}
      />
      <path
        d="M34 214Q25 178 37 157M34 197Q9 191 14 174Q34 175 34 197M34 183Q56 177 53 165Q34 164 34 183"
        stroke="#6c886c"
        strokeWidth="3"
        fill="#9bb28a"
        strokeLinecap="round"
      />
      <path d="M19 214H49L44 238H25Z" fill="#c4ac8a" />
      <path
        d="M230 183L230 163M220 173H240"
        stroke="#d3ba68"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M48 65L48 55M43 60H53"
        stroke="#8b9b85"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M239 108L239 98M234 103H244"
        stroke="#d3ba68"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
