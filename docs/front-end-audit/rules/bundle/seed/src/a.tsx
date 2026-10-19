// First-load module: uses one icon and renders a QR code only after a click.
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { OneIcon } from "@/components/icons";

export function A() {
  const [open, setOpen] = useState(false);

  return (
    <button type="button" onClick={() => setOpen(true)}>
      <OneIcon />
      {open && <QRCodeSVG value="seed" />}
    </button>
  );
}
