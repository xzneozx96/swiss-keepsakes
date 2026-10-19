import type { AdviceQuestionSet, AdviceRequest, PrivateTourRequest } from '@sk/domain/requests'

/** Advice and private-tour requests (C21, C22, M20, M21). */
export interface RequestsClient {
  adviceQuestions: () => Promise<AdviceQuestionSet>
  adviceRequests: () => Promise<AdviceRequest[]>
  privateTourRequests: () => Promise<PrivateTourRequest[]>
}
