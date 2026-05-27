const CROSS_COMPANY_POSTING_USER_MSG =
  "This transaction cannot be posted because one or more selected records belong to another company.";

export function getFinancePostingErrorMessage(
  error: unknown,
  fallback = "Request failed"
): string {
  const msg = (error as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  if (!msg) return fallback;
  if (
    msg.includes("Posting blocked because the source document") ||
    msg.includes("does not belong to active company")
  ) {
    return CROSS_COMPANY_POSTING_USER_MSG;
  }
  return msg;
}
