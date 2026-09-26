/** An expected, user-facing failure. Printed without a stack trace. */
export class EaswError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "EaswError";
  }
}
