export type ContactFormData = {
  name: string;
  email: string;
  company?: string;
  message: string;
};

export function validateContactForm(data: ContactFormData): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("Name is required.");
  } else if (data.name.trim().length > 100) {
    errors.push("Name must be 100 characters or fewer.");
  }

  if (!data.email?.trim()) {
    errors.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Please enter a valid email address.");
  }

  if (data.company && data.company.length > 100) {
    errors.push("Company name must be 100 characters or fewer.");
  }

  if (!data.message?.trim()) {
    errors.push("Message is required.");
  } else if (data.message.trim().length < 10) {
    errors.push("Message must be at least 10 characters.");
  } else if (data.message.length > 5000) {
    errors.push("Message must be 5,000 characters or fewer.");
  }

  return errors;
}
