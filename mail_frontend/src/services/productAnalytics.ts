import { monitoringAPI } from '@/api/monitoring'
import {
  getBrowserInstanceId,
  getClientPlatform,
  getTabSessionId
} from '@/services/sessionIdentity'

export type ProductEventName =
  | 'guest_home_view'
  | 'guest_mailbox_created'
  | 'guest_mailbox_create_failed'
  | 'guest_first_email_received'
  | 'guest_verification_code_detected'
  | 'guest_verification_code_copied'
  | 'guest_save_prompt_shown'
  | 'guest_save_prompt_confirmed'
  | 'guest_auth_succeeded'
  | 'guest_mailboxes_claimed'

type ProductEventProperties = {
  duration_ms?: number
  provider?: string
  claimed_count?: number
}

export const trackProductEvent = (
  eventName: ProductEventName,
  properties: ProductEventProperties = {}
) => {
  if (typeof window === 'undefined') return
  try {
    monitoringAPI
      .recordProductEvent({
        event_name: eventName,
        visitor_id: getBrowserInstanceId(),
        session_id: getTabSessionId(),
        page_path: window.location.pathname,
        client_platform: getClientPlatform(),
        properties
      })
      .catch(() => {})
  } catch {
    // Analytics must never interrupt mailbox or authentication flows.
  }
}
