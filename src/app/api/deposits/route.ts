import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SASPAY_API_URL = (
  process.env.SASPAY_API_URL || "https://api.saspay.me/api/v1"
).replace(/\/+$/, "");

const ALLOWED_NETWORKS = ["moov_tg", "togocel"] as const;

type AllowedNetwork = (typeof ALLOWED_NETWORKS)[number];

function isAllowedNetwork(value: unknown): value is AllowedNetwork {
  return (
    typeof value === "string" &&
    ALLOWED_NETWORKS.includes(value as AllowedNetwork)
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

/**
 * Normalise un numéro de téléphone togolais.
 */
function normalizeTogoPhone(phone: string): string | null {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");

  let localNumber = cleaned;

  if (cleaned.startsWith("+228")) {
    localNumber = cleaned.slice(4);
  } else if (cleaned.startsWith("228") && cleaned.length === 11) {
    localNumber = cleaned.slice(3);
  }

  if (!/^\d{8}$/.test(localNumber)) {
    return null;
  }

  return `+228${localNumber}`;
}

/**
 * Extrait un message d'erreur lisible depuis la réponse SasPay.
 */
function getProviderError(result: unknown): string {
  if (typeof result === "string") {
    return result.slice(0, 1000);
  }

  if (!result || typeof result !== "object") {
    return "Réponse vide ou non exploitable de SasPay.";
  }

  const data = result as Record<string, unknown>;

  for (const key of ["message", "detail", "error", "errors"]) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value.slice(0, 1000);
    }

    if (value && typeof value === "object") {
      try {
        return JSON.stringify(value).slice(0, 1000);
      } catch {
        // Continuer avec les autres champs.
      }
    }
  }

  return "SasPay n'a pas fourni de message d'erreur exploitable.";
}

/**
 * Recherche l'identifiant du paiement dans les formats
 * de réponse les plus courants.
 */
function getPaymentId(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const data = result as Record<string, unknown>;

  const nestedData =
    data.data && typeof data.data === "object"
      ? (data.data as Record<string, unknown>)
      : null;

  const candidates = [
    data.id,
    data.reference,
    data.transaction_id,
    data.payment_id,
    nestedData?.id,
    nestedData?.reference,
    nestedData?.transaction_id,
    nestedData?.payment_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  let depositId: string | undefined;

  try {
    // 1. Vérifier l'utilisateur connecté.
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(
        "Connecte-toi pour effectuer un dépôt.",
        401
      );
    }

    // 2. Lire les données envoyées par le formulaire.
    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      !("amount" in body) ||
      !("network" in body) ||
      !("phone" in body)
    ) {
      return errorResponse(
        "Renseigne le montant, le réseau Mobile Money et le numéro de téléphone.",
        400
      );
    }

    const amount = body.amount;
    const network = body.network;
    const submittedPhone = body.phone;

    // 3. Valider le montant.
    if (
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount < 500 ||
      amount > 1_000_000
    ) {
      return errorResponse(
        "Le montant doit être compris entre 500 et 1 000 000 FCFA.",
        400
      );
    }

    // 4. Valider le réseau Mobile Money.
    if (!isAllowedNetwork(network)) {
      return errorResponse(
        "Choisis Moov Money ou Togocel Money.",
        400
      );
    }

    // 5. Valider le numéro de téléphone.
    if (typeof submittedPhone !== "string") {
      return errorResponse(
        "Renseigne un numéro de téléphone valide.",
        400
      );
    }

    const phone = normalizeTogoPhone(submittedPhone);

    if (!phone) {
      return errorResponse(
        "Le numéro doit contenir 8 chiffres togolais, avec ou sans l'indicatif +228.",
        400
      );
    }

    // 6. Vérifier la configuration SasPay.
    const secretKey = process.env.SASPAY_SECRET_KEY;

    if (!secretKey) {
      console.error("SASPAY_CONFIGURATION_ERROR: clé absente");

      return errorResponse(
        "La configuration SasPay est incomplète.",
        503
      );
    }

    // 7. Conserver la protection des paiements.
    if (
      process.env.SASPAY_ENABLE_LIVE_PAYMENTS !== "true" ||
      process.env.NODE_ENV !== "production"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paiements désactivés pendant le développement. Aucun paiement n'a été envoyé.",
        },
        { status: 503 }
      );
    }

    // 8. Vérifier l'URL publique.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (
      !appUrl ||
      !appUrl.startsWith("https://") ||
      /localhost|127\.0\.0\.1/i.test(appUrl)
    ) {
      return errorResponse(
        "Une URL publique HTTPS doit être configurée.",
        503
      );
    }

    // 9. Créer le dépôt en attente.
    // Aucun solde n'est crédité à cette étape.
    const deposit = await prisma.deposit.create({
      data: {
        userId: user.id,
        amount,
        network,
        provider: "saspay",
        status: "PENDING",
      },
    });

    depositId = deposit.id;

    // 10. Préparer la requête destinée à SasPay.
    const payload = {
      amount: String(amount),
      currency: "XOF",
      country: "TG",
      description: `Dépôt Nova Invest ${deposit.id}`,
      customer: {
        first_name: user.firstName,
        last_name: user.lastName,
        phone,
      },
      network,
    };

    const sasPayUrl = `${SASPAY_API_URL}/payments/softpay/`;

    // Ne jamais journaliser la clé secrète.
    console.log("SASPAY_PAYMENT_REQUEST", {
      depositId: deposit.id,
      amount,
      currency: "XOF",
      country: "TG",
      network,
      phoneSuffix: phone.slice(-4),
      endpoint: sasPayUrl,
    });

    // 11. Envoyer la demande de paiement.
    const response = await fetch(sasPayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": deposit.id,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    // 12. Lire la réponse brute de SasPay.
    const responseText = await response.text();

    let result: unknown = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      result = {
        rawResponse: responseText.slice(0, 1000),
      };
    }

    // 13. Enregistrer les informations de diagnostic.
    console.log("SASPAY_PAYMENT_RESPONSE", {
      httpStatus: response.status,
      success: response.ok,
      depositId: deposit.id,
      responseContentType: response.headers.get("content-type"),
      responseBody: responseText.slice(0, 2000),
    });

    // 14. Traiter les refus de SasPay.
    if (!response.ok) {
      console.error("SASPAY_PAYMENT_ERROR", {
        httpStatus: response.status,
        depositId: deposit.id,
        providerMessage: getProviderError(result),
      });

      return NextResponse.json(
        {
          success: false,
          depositId: deposit.id,
          error:
            "SasPay a refusé la demande. Consulte les journaux du déploiement pour connaître le motif exact. Vérifie le statut du dépôt avant toute nouvelle tentative.",
        },
        { status: 502 }
      );
    }

    // 15. Extraire l'identifiant externe.
    const paymentId = getPaymentId(result);

    if (!paymentId) {
      console.error("SASPAY_INVALID_RESPONSE", {
        depositId: deposit.id,
        responseBody: responseText.slice(0, 2000),
      });

      return NextResponse.json(
        {
          success: false,
          depositId: deposit.id,
          error:
            "SasPay a répondu, mais son identifiant de paiement est introuvable. Vérifie le dépôt avant toute nouvelle tentative.",
        },
        { status: 502 }
      );
    }

    // 16. Enregistrer la référence du paiement SasPay.
    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data: {
        externalId: paymentId,
      },
    });

    // 17. Renvoyer le résultat au formulaire.
    const paymentData =
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : {};

    const nestedData =
      paymentData.data && typeof paymentData.data === "object"
        ? (paymentData.data as Record<string, unknown>)
        : {};

    const checkoutUrl =
      paymentData.checkout_url ??
      paymentData.checkoutUrl ??
      nestedData.checkout_url ??
      nestedData.checkoutUrl ??
      null;

    const paymentStatus =
      typeof paymentData.status === "string"
        ? paymentData.status
        : typeof nestedData.status === "string"
          ? nestedData.status
          : "PENDING";

    return NextResponse.json({
      success: true,
      message:
        "Demande de paiement transmise à SasPay. Confirme le paiement sur ton téléphone si nécessaire.",
      depositId: deposit.id,
      paymentId,
      status: paymentStatus,
      checkoutUrl:
        typeof checkoutUrl === "string" ? checkoutUrl : null,
    });
  } catch (error) {
    console.error("DEPOSIT_API_ERROR", {
      depositId,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue",
    });

    return NextResponse.json(
      {
        success: false,
        ...(depositId ? { depositId } : {}),
        error:
          "Une erreur est survenue. Vérifie le statut du dépôt avant de réessayer.",
      },
      { status: 500 }
    );
  }
}
