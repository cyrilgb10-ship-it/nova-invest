const BASE_URL = "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("❌ CRON_SECRET est introuvable dans .env");
  process.exit(1);
}

async function completeInvestments() {
  try {
    const response = await fetch(
      `${BASE_URL}/api/investments/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Erreur ${response.status}:`, data);
      return;
    }

    console.log(
      `[${new Date().toLocaleTimeString("fr-FR")}]`,
      `Investissements terminés : ${data.completed}`
    );
  } catch (error) {
    console.error(
      "❌ Impossible de contacter Nova Invest :",
      error.message
    );
  }
}

console.log("⏱️ Automatisation des échéances démarrée.");
console.log("🔄 Vérification toutes les 60 secondes.");

await completeInvestments();

setInterval(completeInvestments, 60_000);