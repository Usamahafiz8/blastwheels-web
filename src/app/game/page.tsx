'use client';

export default function GamePage() {
  return (
    <div className="min-h-screen bg-black w-full h-screen overflow-hidden">
      <iframe
        src="https://plum-starling-225350.hostingersite.com/game/Buildd/"
        className="w-full h-full border-0"
        title="Blast Wheels Game"
        allow="fullscreen; autoplay; gamepad; microphone; camera"
        allowFullScreen
      />
    </div>
  );
}

