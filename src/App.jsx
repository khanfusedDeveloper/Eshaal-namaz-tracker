import React, { useState, useEffect, useRef } from 'react';

const PRAYER_DETAILS = {
  Fajr: { sunnah: 2, fardh: 2, color: 'bg-orange-400' },
  Dhuhr: { sunnah: 4, fardh: 4, sunnahAfter: 2, color: 'bg-yellow-400' },
  Asr: { fardh: 4, color: 'bg-amber-500' },
  Maghrib: { fardh: 3, sunnahAfter: 2, color: 'bg-purple-500' },
  Isha: { fardh: 4, sunnahAfter: 2, witr: 3, color: 'bg-indigo-600' }
};

const REWARDS = [
  { points: 50, title: "🍿 Popcorn Time!" },
  { points: 150, title: "🛝 Park Trip!" },
  { points: 500, title: "🧸 Pick a New Toy!" }
];

const format12Hour = (time24) => {
  if (!time24) return "";
  const [hourString, minute] = time24.split(':');
  const hour = parseInt(hourString, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
};

export default function App() {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState({ name: 'Loading...', timeLeft: '--' });
  
  // CHANGED: Points now start at 0 every time the app loads
  const [points, setPoints] = useState(0);
  
  // Completed prayers start empty every time the app loads
  const [completedToday, setCompletedToday] = useState([]);

  const audioRef = useRef(null);

  useEffect(() => {
    const fetchTimes = async (lat, lng) => {
      try {
        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`);
        const data = await res.json();
        const timings = data.data.timings;
        setPrayerTimes({
          Fajr: timings.Fajr,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha
        });
      } catch (error) {
        console.error("Failed to fetch prayer times:", error);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchTimes(position.coords.latitude, position.coords.longitude),
        () => fetchTimes(38.9072, -77.0369)
      );
    } else {
      fetchTimes(38.9072, -77.0369);
    }
  }, []);

  useEffect(() => {
    if (!prayerTimes) return;

    const timer = setInterval(() => {
      const now = new Date();
      let upcomingPrayer = null;
      let minDiff = Infinity;

      for (const [prayer, timeStr] of Object.entries(prayerTimes)) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const prayerDate = new Date();
        prayerDate.setHours(hours, minutes, 0, 0);

        const diffMs = prayerDate.getTime() - now.getTime();
        
        if (diffMs > 0 && diffMs < minDiff) {
          minDiff = diffMs;
          upcomingPrayer = { name: prayer, diffMs };
        }
      }

      if (!upcomingPrayer) {
        const [fHours, fMins] = prayerTimes['Fajr'].split(':').map(Number);
        const fajrTomorrow = new Date();
        fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
        fajrTomorrow.setHours(fHours, fMins, 0, 0);
        
        const diffMs = fajrTomorrow.getTime() - now.getTime();
        upcomingPrayer = { name: 'Fajr (Tomorrow)', diffMs };
      }

      const totalSeconds = Math.floor(upcomingPrayer.diffMs / 1000);
      const hrsLeft = Math.floor(totalSeconds / 3600);
      const minsLeft = Math.floor((totalSeconds % 3600) / 60);
      const secsLeft = totalSeconds % 60;
      
      if (totalSeconds === 0) {
        audioRef.current?.play().catch(e => console.log("Audio play blocked by browser:", e));
      }

      setNextPrayer({
        name: upcomingPrayer.name,
        timeLeft: `${hrsLeft}h ${minsLeft}m ${secsLeft}s`
      });

    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  const handleCompletePrayer = (prayerName) => {
    if (!completedToday.includes(prayerName)) {
      setCompletedToday([...completedToday, prayerName]);
      // Just add 15 points to the current state!
      setPoints(points + 15);
    }
  };

  return (
    <div className="min-h-screen bg-sky-100 p-4 md:p-8 font-sans text-gray-800 flex justify-center items-start">
      <audio ref={audioRef} src="/azan.mp3" preload="auto" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl p-6 text-center border-4 border-sky-300">
            <h1 className="text-3xl md:text-4xl font-black text-sky-600 mb-2">My Daily Salah 🕌</h1>
            <div className="flex flex-col gap-4 mt-6">
              <div className="bg-green-100 p-4 rounded-2xl border-2 border-green-300">
                <p className="text-sm font-bold text-green-700 uppercase tracking-wider">Total Points</p>
                <p className="text-4xl font-black text-green-600">⭐ {points}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-2xl border-2 border-blue-300">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">Next: {nextPrayer.name}</p>
                <p className="text-3xl font-black text-blue-600 font-mono tracking-tighter">⏱️ {nextPrayer.timeLeft}</p>
              </div>
            </div>
          </div>

          <div className="bg-pink-100 rounded-3xl p-6 shadow-xl border-4 border-pink-300">
            <h3 className="text-2xl font-black text-pink-600 mb-4 text-center">🎁 Rewards Chest</h3>
            <div className="space-y-3">
              {REWARDS.map((reward, idx) => (
                <div key={idx} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${
                  points >= reward.points ? 'bg-pink-400 border-pink-500 text-white shadow-md transform scale-105' : 'bg-white border-pink-200 text-gray-400'
                }`}>
                  <span className="font-bold text-lg">{reward.title}</span>
                  <span className="font-black text-lg">{reward.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prayerTimes ? Object.keys(PRAYER_DETAILS).map((prayer, index) => {
              const details = PRAYER_DETAILS[prayer];
              const isCompleted = completedToday.includes(prayer);
              const spanClass = index === 4 ? "md:col-span-2" : "";

              return (
                <div key={prayer} className={`${details.color} ${spanClass} p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between hover:-translate-y-1 transition-transform`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-3xl font-black">{prayer}</h2>
                      <span className="bg-white/30 px-4 py-1.5 rounded-full text-lg font-bold shadow-sm tracking-wide">
                        {format12Hour(prayerTimes[prayer])}
                      </span>
                    </div>
                    
                    <div className="bg-white/20 p-4 rounded-2xl mb-6 text-base md:text-lg font-bold flex gap-3 flex-wrap shadow-inner">
                      {details.sunnah && <span>{details.sunnah} Sunnah</span>}
                      <span className="underline decoration-wavy decoration-2">{details.fardh} Fardh</span>
                      {details.sunnahAfter && <span>{details.sunnahAfter} Sunnah</span>}
                      {details.witr && <span>{details.witr} Witr</span>}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCompletePrayer(prayer)}
                    disabled={isCompleted}
                    className={`w-full py-4 rounded-2xl font-black text-xl transition-all ${
                      isCompleted 
                        ? 'bg-white/50 text-white cursor-not-allowed shadow-inner' 
                        : 'bg-white text-gray-800 hover:scale-[1.02] shadow-xl hover:shadow-2xl'
                    }`}
                  >
                    {isCompleted ? '🎉 Completed!' : 'Mark as Done! (+15 pts)'}
                  </button>
                </div>
              );
            }) : (
              <div className="md:col-span-2 text-center p-12 bg-white/50 rounded-3xl border-4 border-dashed border-sky-300">
                <p className="text-2xl font-bold animate-pulse text-sky-600">Loading your prayer times... 📡</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}