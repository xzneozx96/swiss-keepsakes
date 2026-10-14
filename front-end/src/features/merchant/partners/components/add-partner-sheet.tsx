import type { NewPartner } from "@/features/partners/hooks/use-partner-actions";
import type { Partner } from "@/features/partners/types";

import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";
import {
  isValidCode,
  suggestCode,
} from "@/features/partners/hooks/use-partner-actions";

/** Same choice card as M08 and the M04 sheets: ink frame when selected. */
const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

const kinds: Partner["kind"][] = ["hotel", "guide", "other"];

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * M15 "Add partner" in the M08 sheet frame: name, type, email for the report code (N19),
 * and the referral code, suggested from the name until edited. Commission rates stay per
 * product (O08), so there is no rate here. Errors show after the first save attempt.
 */
export function AddPartnerSheet({
  existingCodes,
  onAdd,
  onClose,
}: {
  existingCodes: string[];
  onAdd: (partner: NewPartner) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Partner["kind"]>("hotel");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [tried, setTried] = useState(false);

  const shownCode = codeEdited ? code : suggestCode(name);
  const errors = {
    name: name.trim() ? undefined : t("merchantPartners.add.nameError"),
    email: isEmail(email.trim())
      ? undefined
      : t("merchantPartners.add.emailError"),
    code: !isValidCode(shownCode)
      ? t("merchantPartners.add.codeError")
      : existingCodes.includes(shownCode)
        ? t("merchantPartners.add.codeTaken")
        : undefined,
  };
  const isValid = !errors.name && !errors.email && !errors.code;

  const save = () => {
    setTried(true);
    if (!isValid) return;
    onAdd({ name: name.trim(), kind, email: email.trim(), code: shownCode });
  };

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={save}>
            {t("merchantPartners.add.save")}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t("merchantPartners.add.title")}
      onClose={onClose}
    >
      <TextField
        fullWidth
        isRequired
        isInvalid={tried && !!errors.name}
        value={name}
        onChange={setName}
      >
        <Label className="text-heading">{t("merchantPartners.add.name")}</Label>
        <Input placeholder={t("merchantPartners.add.namePlaceholder")} />
        <FieldError>{errors.name}</FieldError>
      </TextField>

      <RadioGroup value={kind} onChange={(v) => setKind(v as Partner["kind"])}>
        <Label className="text-heading">{t("merchantPartners.add.kind")}</Label>
        {kinds.map((k) => (
          <Radio key={k} className={choiceCard} value={k}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(`merchantPartners.kind.${k}`)}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>

      <TextField
        fullWidth
        isRequired
        isInvalid={tried && !!errors.email}
        type="email"
        value={email}
        onChange={setEmail}
      >
        <Label className="text-heading">
          {t("merchantPartners.add.email")}
        </Label>
        <Input placeholder="name@example.com" />
        <Description>{t("merchantPartners.add.emailHelp")}</Description>
        <FieldError>{errors.email}</FieldError>
      </TextField>

      <TextField
        fullWidth
        isRequired
        isInvalid={tried && !!errors.code}
        value={shownCode}
        onChange={(v) => {
          setCodeEdited(true);
          setCode(suggestCode(v));
        }}
      >
        <Label className="text-heading">{t("merchantPartners.add.code")}</Label>
        <Input className="font-mono uppercase" />
        <Description>
          {t("merchantPartners.add.codeHelp", { code: shownCode || "…" })}
        </Description>
        <FieldError>{errors.code}</FieldError>
      </TextField>
    </SheetFrame>
  );
}
