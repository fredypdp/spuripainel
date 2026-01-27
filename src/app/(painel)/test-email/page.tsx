// app/(painel)/test-email/page.tsx

import EmailTestForm from '@/components/email/EmailTestForm';

export const metadata = {
  title: 'Teste de E-mail - Sistema SPURI',
  description: 'Teste de envio de e-mails via SMTP',
};

export default function TestEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <EmailTestForm />
    </div>
  );
}