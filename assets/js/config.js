"use strict";
/* =====================================================================
   НАСТРОЙКИ ПЛАТНОГО ДОСТУПА — меняйте здесь.
   SUPABASE_URL и SUPABASE_ANON_KEY подставляет сборка (tools/build.py) из .env.local.
   Ключ «anon» публичный по замыслу Supabase: он ничего не открывает без входа в аккаунт.
   ===================================================================== */
const LG_CONFIG = {
  SUPABASE_URL: "https://berhrwckwojqwugcjxhq.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcmhyd2Nrd29qcXd1Z2NqeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMDQzNTAsImV4cCI6MjEwNjg4MDM1MH0.5idp9zm773EXw7P9vjkAVTcrgB8nngm7SSUF1w-Gdn4",

  // бесплатно: эти темы и только этот уровень сложности
  FREE_TOPICS: ["odd", "pattern"],
  FREE_LEVEL: 1,

  // сколько устройств на аккаунт и как часто можно отключать устройство (дней)
  DEVICE_LIMIT: { family: 2, teacher: 3 },
  REMOVE_COOLDOWN_DAYS: 7,

  // цены в тенге — поменяйте на свои
  PRICES: {
    family: { month: 990, year: 9990, forever: 16990 },
    teacher: { month: 990, year: 9990, forever: 16990 },
  },

  // куда платить вручную (Kaspi) и куда присылать чек
  PAY: {
    kaspi_phone: "+7 771 885 83 11",
    receiver: "Мұқағали З.",
    whatsapp: "77718858311",
  },
};
