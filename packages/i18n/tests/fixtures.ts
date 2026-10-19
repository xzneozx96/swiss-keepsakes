// Copies of a few real mail keys, broken on purpose. The tests never change mailEn or mailDe.
export const en = {
  'mail.greeting': 'Hello,',
  'mail.N01.code': 'Your sign-in code is {code}.',
  'mail.N01.expiry': 'Enter it in the sign-in window. It works for 10 minutes.',
}

export const deMissingKey = {
  'mail.greeting': 'Grüezi',
  'mail.N01.code': 'Ihr Anmeldecode lautet {code}.',
}

export const deExtraKey = {
  'mail.greeting': 'Grüezi',
  'mail.N01.code': 'Ihr Anmeldecode lautet {code}.',
  'mail.N01.expiry': 'Geben Sie ihn im Anmeldefenster ein. Er gilt 10 Minuten.',
  'mail.N01.footer': 'Swiss Keepsakes, Luzern',
}
