# Audio interview readiness

Smart Scout already has a real browser audio interview implementation with microphone capture, MediaRecorder, speech synthesis, language/voice selection, silence handling, transcript/answer processing and interview analysis. See `components/AudioInterview.tsx`.

## Release contract
- Candidate gives recording consent before interview.
- Browser microphone permission is explicit.
- Audio answers are captured locally in the browser before processing.
- The interviewer speaks questions using browser speech synthesis.
- Responses are persisted/analyzed through the existing interview service path.
- The interview produces an evidence-backed report used by the decision stage.
- Automated transcription beyond browser capture requires a provider credential; it is not represented as active when no provider is configured.

## Production activation
A production transcription provider can be connected later without changing the interview UX. Until then, browser speech recognition/audio capture and the configured AI analysis path remain the supported experience.
