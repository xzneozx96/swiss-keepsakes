/** Email copy (UX spec section 6), shared by the prototype's mail log and the server's mail templates (D12). */
export const mailEn = {
  'mail.greeting': 'Hello,',
  'mail.N19.subject': 'Your code for the {shop} commission report: {code}',
  'mail.N19.greeting': 'Hello {partner},',
  'mail.N19.code': 'Your code for the commission report from {shop} is {code}.',
  'mail.N19.ignore':
    'If you didn\'t open the report link, you can ignore this email. Nobody can open your report without this code.',
  'mail.N01.subject': 'Your {shop} sign-in code: {code}',
  'mail.N01.label': 'Your sign-in code',
  'mail.N01.code': 'Your sign-in code is {code}.',
  'mail.N01.expiry': 'Enter it in the sign-in window. It works for 5 minutes.',
  'mail.N01.reason': 'You get this because a sign-in code was asked for at {shop}.',
  'mail.N01.ignore': 'If you didn’t try to sign in, you can ignore this email.',
  'mail.pickup': 'Pickup: {pickupDate} at {place}.',
  'mail.N02.subject': 'We received your request {orderRef}',
  'mail.N02.request':
    'Your request {orderRef} is with the shop. You asked to pick it up on {pickupDate} at {place}.',
  'mail.N02.noPayment': 'Nothing has been charged.',
  'mail.N02.status':
    'Status: awaiting seller confirmation. We’ll email you when the shop replies.',
  'mail.N03.subject': 'New keepsake request {orderRef}',
  'mail.N03.new': 'A guest sent a new keepsake request, {orderRef}.',
  'mail.N03.action':
    'Open it in Orders to accept it, change the date or place, or decline it.',
  'mail.N04.subject': '{orderRef} accepted: please pay {amount} by {dueAt}',
  'mail.N04.accepted': 'Good news: the shop accepted your order {orderRef}.',
  'mail.N04.pay': 'Please pay {amount} by {dueAt}.',
  'mail.N04.warning':
    'If it isn’t paid by then, the order is cancelled automatically.',
  'mail.N04.action': 'Pay now: open the order under Account.',
  'mail.N05.subject': '{orderRef} accepted: nothing to pay now',
  'mail.N05.pay': 'Nothing to pay now. Please pay {amount} by {dueDate}.',
  'mail.N06.subject': 'The shop couldn’t accept {orderRef}',
  'mail.N06.declined': 'Sorry, the shop declined your order {orderRef}.',
  'mail.N06.reason': 'Reason: {reason}',
  'mail.N06.others': 'Your other orders are not affected.',
  'mail.N07.subject': 'Receipt for {orderRef}: {amount} paid',
  'mail.N07.seller': 'Seller: {seller}',
  'mail.N07.paid': 'Paid: {amount}',
  'mail.N07.balance': 'Still to pay: {balance}',
  'mail.N08.subject': 'Your payment for {orderRef} didn’t go through',
  'mail.N08.failed':
    'Your payment of {amount} for {orderRef} failed. Nothing was charged.',
  'mail.N08.retry':
    'Try again from the order under Account. Until it’s paid, the items may not stay reserved for you.',
  'mail.N12.subject': '{orderRef} is ready for pickup',
  'mail.N12.ready':
    'Your order {orderRef} is ready. Pick it up at {place}, {placeAddress}.',
  'mail.N12.hours': 'Opening hours: {placeHours}',
  'mail.N12.instructions': '{placeInstructions}',
  'mail.N15.subject': 'How was your keepsake? Review {orderRef}',
  'mail.N15.thanks': 'Your order {orderRef} is complete. Thank you!',
  'mail.N15.review':
    'Tell other travellers what you thought: write a review from the order under Account.',
  'mail.N21.subject': 'Guest paid {amount} for {orderRef}',
  'mail.N21.paid':
    'The guest paid {amount} online for {orderRef}. Still to collect: {balance}.',
  'mail.N21.preparing': 'The order is now being prepared.',
  'mail.N23.subject': '{orderRef} cancelled: payment deadline passed',
  'mail.N23.guest':
    'Your order {orderRef} was cancelled because the first payment wasn’t made by {dueAt}.',
  'mail.N23.again':
    'If you still want it, send a new request so the shop can confirm the pickup date again.',
  'mail.N23.staff':
    'Order {orderRef} was cancelled automatically: the first payment wasn’t made by {dueAt}.',
  'mail.N23.stock': 'The items it held are back in stock.',
  'mail.linkFallback': 'If the button doesn’t work, copy this link into your browser:',
  'mail.footer': 'Swiss Keepsakes · Lucerne',
  'mail.invitation.expiry': 'The link works for 7 days.',
  'mail.invitation.ignore':
    'If you didn’t expect this invitation, you can ignore this email.',
  'mail.N18.subject': '{inviter} invited you to {store}',
  'mail.N18.invited': '{inviter} invited you to join {store} as Store Manager.',
  'mail.N18.accept': 'Open the invitation, sign in and accept it',
  'mail.N18.button': 'Accept invitation',
  'mail.N20.subject': 'You’re invited to open {store}',
  'mail.N20.invited': 'You’re invited to run {store} as its Owner.',
  'mail.N20.setup':
    'Open the invitation, sign in and complete the steps your store needs before it can sell',
  'mail.N20.button': 'Set up your store',

  'tourMail.greeting': 'Hello {guest},',
  'tourMail.seller': 'Seller: {seller}',
  'tourMail.tourLine': 'Tour: {tour}, {startsAt}',
  'tourMail.when': 'When: {startsAt}',
  'tourMail.meeting': 'Meeting point: {meetingPoint}',
  'tourMail.group':
    'Group: adults {adults} · children {children} · infants {infants}',
  'tourMail.paid': 'Paid: {paid}',
  'tourMail.balanceDue': 'Still to pay: {balance}, due by {dueAt}',
  'tourMail.paidInFull': 'Paid in full. Nothing more to pay.',
  'tourMail.N07.subject': 'Receipt for {ref}: {amount} paid',
  'tourMail.N07.paid': 'Paid: {amount}',
  'tourMail.N08.subject': 'Your payment for {ref} didn’t go through',
  'tourMail.N08.failed':
    'Your payment of {amount} for {tour} did not go through. No money was taken.',
  'tourMail.N08.retryHold':
    'You can try again until {holdUntil}. After that your seats are no longer held.',
  'tourMail.N08.retry': 'You can try again from your booking page.',
  'tourMail.N09.subject': 'Booking confirmed: {tour}, {startsAt}',
  'tourMail.N09.confirmed': 'Your booking {ref} is confirmed.',
  'tourMail.N10.subject': 'Reminder: {balance} due for {ref} by {dueAt}',
  'tourMail.N10.due':
    'The balance of {balance} for {tour} on {startsAt} is due by {dueAt}.',
  'tourMail.N10.cancel':
    'If it is not paid by then, the booking is cancelled and your seats are released, as the tour’s payment policy states.',
  'tourMail.N10.grace':
    'If it is still open then, the organiser waits a few more days and then decides about your booking.',
  'tourMail.N10.merchant':
    'If it is still open then, the organiser decides about your booking.',
  'tourMail.N10.pay':
    'Pay online from your booking page, or as agreed with the organiser.',
  'tourMail.N11.subject': 'Booking {ref} cancelled: balance not paid',
  'tourMail.N11.cancelled':
    'The balance of {balance} for {tour} on {startsAt} was not paid by {dueAt}. As the tour’s payment policy states, your booking is cancelled and your seats are released.',
  'tourMail.N11.money':
    'You paid {paid}. The organiser handles money already paid under the cancellation policy.',
  'tourMail.N11.again': 'To join another departure, make a new booking.',
  'tourMail.N11.staffSubject': '{ref} cancelled automatically: balance overdue',
  'tourMail.N11.staff':
    '{guest}’s booking for {tour} on {startsAt} was cancelled after the balance deadline {dueAt}. {seats} seats are free again.',
  'tourMail.N11.staffMoney':
    'Paid before cancellation: {paid}. Not paid: {balance}.',
  'tourMail.N13.subject': 'Tomorrow: {tour}',
  'tourMail.N13.tomorrow': 'Your tour {ref} starts tomorrow, {startsAt}.',
  'tourMail.N13.contact': 'Questions? Contact {seller}: {sellerPhone}.',
  'tourMail.N15.subject': 'How was {tour}? Review {ref}',
  'tourMail.N15.thanks':
    'Your booking {ref} is complete. Thank you for joining us!',
  'tourMail.N15.review': 'Share a review of the tour from your booking page.',
  'tourMail.N22.subject': 'Payment received after {ref} expired',
  'tourMail.N22.guest':
    'We received {amount} after your reservation for {tour} expired. The booking stays expired and is not confirmed.',
  'tourMail.N22.next':
    'The payment is being checked. The organiser will tell you what happens to the money.',
  'tourMail.N22.staffSubject': 'Payment to reconcile: {ref}',
  'tourMail.N22.staff':
    '{amount} arrived for {ref} after its hold expired. The booking stays expired and is not confirmed. Check the payment and arrange a refund if needed.',

  'requestMail.link.advice': 'Open the request',
  'requestMail.link.private': 'Open private tour requests',
  'requestMail.guestEmail': 'Guest email: {email}',
  'requestMail.N16.subject': 'New advice request from {email}',
  'requestMail.N16.intro':
    'A guest answered the trip assistant’s questions on {at}.',
  'requestMail.guestLanguage': 'Guest language: {language}',
  'requestMail.N16.answer': '{question} — {answer}',
  'requestMail.N16.skipped': 'Questions the guest skipped are left out.',
  'requestMail.N16.reply': 'Reply to the guest by email.',
  'requestMail.N17.subject': 'New private tour request: {group}, {dates}',
  'requestMail.N17.greeting': 'Hello {name},',
  'requestMail.N17.intro': 'A guest asked for a private tour on {at}.',
  'requestMail.N17.group': 'Group: {group}',
  'requestMail.N17.dates': 'Preferred dates: {dates}',
  'requestMail.N17.interests': 'Interests: {interests}',
  'requestMail.N17.reply':
    'Reply by email with a tour plan and its price, then mark the request as answered.',
} as const

export type MailKey = keyof typeof mailEn
