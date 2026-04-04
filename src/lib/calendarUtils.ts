
export function generateICS(candidateName: string, recruiterEmail: string, startTime: Date): string {
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartScout//Interview Scheduler//EN',
    'BEGIN:VEVENT',
    `UID:${Math.random().toString(36).substring(2)}@smartscout.ai`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:Technical Interview: ${candidateName}`,
    `DESCRIPTION:Audio interview session with ${candidateName}. Report will be sent to ${recruiterEmail}.`,
    `ORGANIZER;CN=SmartScout:MAILTO:noreply@smartscout.ai`,
    `ATTENDEE;RSVP=TRUE;CN=${candidateName}:MAILTO:candidate@example.com`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
