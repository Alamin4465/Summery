const CACHE_NAME = 'expense-tracker-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './monthday.js',
  './transactionfrom.js',
  './from.js',
  './dashboard.js',
  './proflie.js',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// ফাইলগুলো ক্যাশে (মেমোরি) সেভ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// ক্যাশে থেকে ফাইল লোড করা (দ্রুত পারফরম্যান্সের জন্য)
self.addEventListener('fetch', (event) => {
  // Firebase বা API রিকোয়েস্টগুলো ক্যাশে করবো না, সরাসরি নেটওয়ার্ক থেকে নিবে
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// নতুন কোড আপডেট হলে পুরনো ক্যাশে মুছে ফেলা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
