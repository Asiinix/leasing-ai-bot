import QRCode from "qrcode";
import type { ProposalSnapshot } from "./snapshot";
import { publicCalculatorLink } from "./resume-link";

export async function proposalQr(snapshot: ProposalSnapshot) {
  const href = publicCalculatorLink(snapshot);
  const image = await QRCode.toDataURL(href, {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 6,
    color: { dark: "#183968ff", light: "#ffffffff" },
  });
  return { href, image };
}
