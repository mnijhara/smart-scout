# External activation checklist

These items require provider accounts or production credentials and cannot be honestly marked active from application code alone.

- Calendar OAuth + meeting-link provider
- Automated transcription provider
- Compensation market-data/internal parity source
- Offer email/SMS/WhatsApp provider + acceptance webhooks
- HRIS employee creation and onboarding task/document provider
- Production Supabase migrations and persistent-state verification

The application must expose a clear unavailable/configuration state for each integration rather than presenting a simulated external action as completed.
