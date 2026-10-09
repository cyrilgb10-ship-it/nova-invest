import "dotenv/config";

const BASE_URL =
  process.env.NOVA_INVEST_URL || "http://localhost:3000";

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("❌ CRON_SECRET est introuvable dans .env");
  process.exit(1);
}

let isRunning = false;

async function completeInvestments() {
  if (isRunning) {
    console.log("⏳ Une vérification est déjà en cours.");
    return;
  }

  isRunning = true;

  try {
    const response = await fetch(
      `${BASE_URL}/api/investments/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30_000),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}:`, data);
      return;
    }

    console.log(
      `[${new Date().toLocaleString("fr-FR", {
        timeZone: "Africa/Lome",
      })}]`,
      `Investissements traités : ${data.completed ?? 0}`
    );
  } catch (error) {
    console.error("❌ Erreur du récupérateur :", error.message);
  } finally {
    isRunning = false;
  }
}

console.log("⏱️ Récupérateur Nova Invest démarré.");
console.log(`🌐 Serveur : ${BASE_URL}`);
console.log("🔄 Vérification toutes les 60 secondes.");

await completeInvestments();

setInterval(completeInvestments, 60_000);