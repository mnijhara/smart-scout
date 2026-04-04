class AudioInterviewEngine {
    constructor() {
        this.isMicrophoneGranted = false;
    }

    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.isMicrophoneGranted = true;
            stream.getTracks().forEach(track => track.stop()); // Stop the microphone after granting permission
        } catch (error) {
            console.error('Microphone permission denied', error);
            this.isMicrophoneGranted = false;
        }
    }

    playAcceptanceAudio() {
        const audio = new Audio('path/to/acceptance-sound.mp3');
        audio.play().catch(error => {
            console.error('Error playing acceptance audio', error);
        });
    }

    async startSpeechRecognition() {
        if (!this.isMicrophoneGranted) {
            console.error('Microphone permission is not granted.');
            return;
        }

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Speech recognized:', transcript);
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.start();
    }
}

export default AudioInterviewEngine;