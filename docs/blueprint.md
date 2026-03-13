# **App Name**: Sentinel Ukraine

## Core Features:

- 3D Interactive Globe: Render a high-performance 3D Earth globe using React Three Fiber and r3f-globe, with the camera defaulting to focus on Ukraine.
- Real-time Incident Spikes: Visualize incident data from Firestore by rendering vertical, glowing neon-red spikes at their precise GPS coordinates on the 3D globe.
- Firestore Database Integration: Set up a Cloud Firestore database to store and manage all incident data.
- Mock Data Generator: A Cloud Function to generate 10 random conflict points within Ukraine's borders and save them to Firestore for initial testing.
- NASA FIRMS Data Polling: A background Cloud Function that polls the NASA FIRMS API every 30 minutes for thermal anomalies (fires/strikes) in the Ukraine region and saves them to Firestore. The provided NASA FIRMS API key 'e554047808a5fdc4922408d6a7a725d6' will be securely stored as an environment variable.
- Glass-morphism Incident List Panel: Display a glass-morphism style side panel listing the latest 5 incidents with their corresponding timestamps.
- Firebase Deployment Setup: Configure the application for one-click deployment to Firebase App Hosting, including proper environment variable handling for the API key.

## Style Guidelines:

- Primary color: Deep indigo (#333399), evoking a sense of professionalism and digital clarity, serving as the main hue for UI elements against a dark background.
- Background color: Very dark charcoal with a cool blue hint (#1A1A1F), providing a stark, tactical canvas for the data visualization and glass-morphism effects.
- Accent color: Vibrant sky blue/cyan (#73DDFF), offering bright highlights and interactive states, while providing a modern contrast to the darker primary and background tones. The 'neon-red' effect for spikes will be a distinct visual element, enhancing urgency and visibility.
- Headline font: 'Space Grotesk' (sans-serif) for its modern, techy aesthetic, suitable for clear, impactful titles and dashboard elements. Body font: 'Inter' (sans-serif) for optimal readability in data lists and smaller text sections, maintaining a neutral and objective feel.
- Minimalist, vector-based icons with a clean, possibly illuminated or glowing line art style to complement the 'neon-red' data visualization and glass-morphism aesthetic.
- A centralized, dominant 3D globe presentation, flanked by a translucent, glass-morphism side panel. Emphasis on spaciousness, hierarchy, and data readability to avoid visual clutter.
- Smooth, fluid transitions for globe rotations, camera movements, and interactive elements. Subtle, captivating glow and pulsation animations for incident spikes to denote activity and urgency.