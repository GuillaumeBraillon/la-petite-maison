import type { AppError, Member } from "../types";

type ErrorInfo = {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
};

const getText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
};

const buildOperationId = (): string => {
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${entropy}`;
};

const getMemberDebugLabel = (member: Member | null | undefined): string | undefined => {
  if (!member) return undefined;

  const identity = member.label.trim() || `${member.firstName} ${member.lastName}`.trim() || member.id;
  const roleLabel = member.role === "owner" && member.isEditor ? "owner-validateur" : member.role;
  return `${identity} (${roleLabel})`;
};

export const extractErrorInfo = (error: unknown): ErrorInfo => {
  if (error instanceof Error) {
    const errorWithMetadata = error as Error & { code?: unknown; status?: unknown; details?: unknown; hint?: unknown };
    return {
      message: getText(error.message) ?? "Une erreur est survenue.",
      code: getText(errorWithMetadata.code),
      status: getNumber(errorWithMetadata.status),
      details: getText(errorWithMetadata.details),
      hint: getText(errorWithMetadata.hint),
    };
  }

  if (typeof error === "string") {
    return {
      message: getText(error) ?? "Une erreur est survenue.",
    };
  }

  if (typeof error === "object" && error !== null) {
    const unknownError = error as { message?: unknown; code?: unknown; status?: unknown; details?: unknown; hint?: unknown };
    return {
      message: getText(unknownError.message) ?? "Une erreur est survenue.",
      code: getText(unknownError.code),
      status: getNumber(unknownError.status),
      details: getText(unknownError.details),
      hint: getText(unknownError.hint),
    };
  }

  return {
    message: "Une erreur est survenue.",
  };
};

export const buildAppError = (params: { error: unknown; context: string; currentMember?: Member | null; subjectId?: string }): AppError => {
  const { error, context, currentMember, subjectId } = params;
  const errorInfo = extractErrorInfo(error);
  const operationId = buildOperationId();
  const extraDetails = [subjectId ? `ID: ${subjectId}` : undefined, getMemberDebugLabel(currentMember), errorInfo.details].filter((value): value is string =>
    Boolean(value)
  );

  return {
    message: errorInfo.message,
    code: errorInfo.code,
    status: errorInfo.status,
    context,
    details: extraDetails.length > 0 ? extraDetails.join(" | ") : undefined,
    hint: errorInfo.hint,
    operationId,
    timestamp: new Date().toISOString(),
    page: typeof window !== "undefined" ? window.location.href : undefined,
  };
};

export const buildToastErrorMessage = (fallbackMessage: string, error: unknown): string => {
  const errorInfo = extractErrorInfo(error);
  const parts = [fallbackMessage];

  if (errorInfo.code) {
    parts.push(`Code ${errorInfo.code}`);
  }

  if (errorInfo.message && errorInfo.message !== "Une erreur est survenue.") {
    parts.push(errorInfo.message);
  }

  return parts.join(" — ");
};

export const formatAppErrorForShare = (error: AppError): string => {
  const parts = [
    "Erreur La Petite Maison",
    `Date : ${(error.timestamp ? new Date(error.timestamp) : new Date()).toLocaleString("fr-FR")}`,
    error.operationId ? `Référence : ${error.operationId}` : undefined,
    `Message : ${error.message}`,
    error.context ? `Contexte : ${error.context}` : undefined,
    error.code ? `Code : ${error.code}` : undefined,
    typeof error.status === "number" ? `Statut : ${error.status}` : undefined,
    error.details ? `Détails : ${error.details}` : undefined,
    error.hint ? `Indice : ${error.hint}` : undefined,
    error.page ? `Page : ${error.page}` : undefined,
    typeof navigator !== "undefined" ? `Navigateur : ${navigator.userAgent}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return parts.join("\n");
};
