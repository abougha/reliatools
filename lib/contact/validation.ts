export type ContactFormData = {
  name: string;
  email: string;
  company?: string;
  message: string;
};

/**
 * Validates a contact submission. The worker passes untrusted JSON here, so
 * every field is type-checked before any string method is called on it.
 */
export function validateContactForm(input: unknown): string[] {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return ["Invalid request body."];
  }

  const data = input as Record<string, unknown>;
  const errors: string[] = [];
  const { name, email, company, message } = data;

  if (typeof name !== "string" || !name.trim()) {
    errors.push("Name is required.");
  } else if (name.trim().length > 100) {
    errors.push("Name must be 100 characters or fewer.");
  }

  if (typeof email !== "string" || !email.trim()) {
    errors.push("Email is required.");
  } else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (company !== undefined && company !== null && company !== "") {
    if (typeof company !== "string" || company.length > 100) {
      errors.push("Company name must be 100 characters or fewer.");
    }
  }

  if (typeof message !== "string" || !message.trim()) {
    errors.push("Message is required.");
  } else if (message.trim().length < 10) {
    errors.push("Message must be at least 10 characters.");
  } else if (message.length > 5000) {
    errors.push("Message must be 5,000 characters or fewer.");
  }

  return errors;
}
