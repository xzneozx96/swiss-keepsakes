// Three real mail keys copied word for word, then broken on purpose: deMissingKey drops one and
// deExtraKey adds a made-up key. The tests never change mailEn or mailDe.
export const en = {
  'mail.greeting': 'Hello,',
  'mail.N01.code': 'Your sign-in code is {code}.',
  'mail.N01.expiry': 'Enter it in the sign-in window. It works for 5 minutes.',
}

export const deMissingKey = {
  'mail.greeting': 'Grüezi',
  'mail.N01.code': 'Ihr Anmeldecode lautet {code}.',
}

export const deExtraKey = {
  'mail.greeting': 'Grüezi',
  'mail.N01.code': 'Ihr Anmeldecode lautet {code}.',
  'mail.N01.expiry': 'Geben Sie ihn im Anmeldefenster ein. Er ist 5 Minuten gültig.',
  'mail.N01.footer': 'Swiss Keepsakes, Luzern',
}
