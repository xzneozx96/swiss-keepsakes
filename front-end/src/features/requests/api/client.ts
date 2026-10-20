import type {
  AdviceQuestion,
  AdviceQuestionSet,
  AdviceRequest,
  PrivateTourRequest,
} from '@sk/domain/requests'

/** Advice and private-tour requests and the advice questions (C21, C22, M19, M20). */
export interface RequestsClient {
  adviceQuestions: () => Promise<AdviceQuestionSet>
  adviceRequests: () => Promise<AdviceRequest[]>
  privateTourRequests: () => Promise<PrivateTourRequest[]>
  /** Stores the guest's answers as asked and mails them to the shop's request address (N16, AC18). */
  sendAdviceRequest: (request: Omit<AdviceRequest, 'sentAt'>) => Promise<void>
  /** Stores the request and mails the Owner and the Manager (N17); the guest gets no email. */
  sendPrivateTourRequest: (
    request: Omit<PrivateTourRequest, 'sentAt'>,
  ) => Promise<void>
  /** The first time staff open it; later openings change nothing. */
  markAdviceRequestRead: (input: { id: string }) => Promise<void>
  setPrivateTourAnswered: (input: {
    id: string
    answered: boolean
  }) => Promise<void>
  /**
   * The question set edits (M19), each applied to the latest set. Requests already sent keep
   * their own wording (AC18).
   */
  saveQuestion: (question: AdviceQuestion) => Promise<void>
  removeQuestion: (input: { id: string }) => Promise<void>
  moveQuestion: (input: { id: string, by: -1 | 1 }) => Promise<void>
  setRecipient: (input: { email: string }) => Promise<void>
}
