export const QUOTES = [
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is not final; failure is not fatal. It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Little by little, a little becomes a lot.", author: "Tanzanian Proverb" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Success usually comes to those too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Work hard in silence, let your success be the noise.", author: "Frank Ocean" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "The harder I work, the luckier I get.", author: "Gary Player" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Keep your eyes on the stars, and your feet on the ground.", author: "Theodore Roosevelt" },
  { text: "Stay focused and never give up.", author: "Unknown" },
]

export function getDailyQuote() {
  const t = new Date()
  const seed = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate()
  return QUOTES[seed % QUOTES.length]
}
