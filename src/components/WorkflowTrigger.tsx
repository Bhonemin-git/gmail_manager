import { Zap, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { EmailField } from '../types/gmail';

interface WorkflowTriggerProps {
  onTrigger: (emailFields: EmailField[]) => void;
  loading: boolean;
  onClose?: () => void;
}

const STATIC_LABELS = [
  { id: '1', name: '1: Billing' },
  { id: '2', name: '2: Bug Report' },
  { id: '3', name: '3: Feature Request' },
  { id: '4', name: '4: Abuse Report' }
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WorkflowTrigger({ onTrigger, loading, onClose }: WorkflowTriggerProps) {
  const [emailFields, setEmailFields] = useState([
    { labelId: '', email: '' },
    { labelId: '', email: '' },
    { labelId: '', email: '' },
    { labelId: '', email: '' }
  ]);
  const [emailErrors, setEmailErrors] = useState<(string | null)[]>([null, null, null, null]);

  const gradientStart = '#2d4a5a';
  const gradientEnd = '#3d5a6a';
  const focusRingColor = '#3d5a6a';
  const buttonTextColor = '#2d4a5a';
  const buttonHoverBg = '#f5f5f5';

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true;
    return EMAIL_REGEX.test(email);
  };

  const handleLabelChange = (index: number, newLabelId: string) => {
    const updated = [...emailFields];
    updated[index].labelId = newLabelId;
    setEmailFields(updated);
  };

  const handleEmailChange = (index: number, newEmail: string) => {
    const updated = [...emailFields];
    updated[index].email = newEmail;
    setEmailFields(updated);

    const updatedErrors = [...emailErrors];
    updatedErrors[index] = null;
    setEmailErrors(updatedErrors);
  };

  const handleEmailBlur = (index: number) => {
    const email = emailFields[index].email;
    const updatedErrors = [...emailErrors];

    if (email.trim() && !validateEmail(email)) {
      updatedErrors[index] = 'Please enter a valid email address (e.g. name@example.com).';
    } else {
      updatedErrors[index] = null;
    }

    setEmailErrors(updatedErrors);
  };

  const handleSubmit = () => {
    const updatedErrors: (string | null)[] = [null, null, null, null];
    let hasErrors = false;
    let firstErrorIndex = -1;

    emailFields.forEach((field, index) => {
      const email = field.email.trim();
      if (email && !validateEmail(email)) {
        updatedErrors[index] = 'Please enter a valid email address (e.g. name@example.com).';
        hasErrors = true;
        if (firstErrorIndex === -1) {
          firstErrorIndex = index;
        }
      }
    });

    setEmailErrors(updatedErrors);

    if (hasErrors) {
      if (firstErrorIndex !== -1) {
        const firstErrorInput = document.getElementById(`email-input-${firstErrorIndex}`);
        firstErrorInput?.focus();
      }
      return;
    }

    const filteredFields = emailFields.filter(field => field.labelId && field.email);

    const sortedFields = [...filteredFields].sort((a, b) => {
      const aNum = parseInt(a.labelId);
      const bNum = parseInt(b.labelId);
      return aNum - bNum;
    });

    const enrichedFields: EmailField[] = sortedFields.map(field => {
      const label = STATIC_LABELS.find(l => l.id === field.labelId);
      return {
        labelId: field.labelId,
        labelName: label?.name || '',
        email: field.email
      };
    });
    onTrigger(enrichedFields);
  };

  return (
    <div className="rounded-lg shadow-lg p-4 md:p-6 text-white" style={{ background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})` }}>
      <div className="mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-bold mb-2">Trigger n8n Workflow</h3>
        <p className="text-sm md:text-base text-white">
          Send your Gmail data to n8n for automated processing
        </p>
      </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-5 space-y-3 md:space-y-4">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Mail className="w-4 h-4 md:w-5 md:h-5" />
            <h4 className="text-sm md:text-base font-semibold">Email Recipients</h4>
          </div>

          {emailFields.map((field, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 md:gap-3">
                <select
                  value={field.labelId}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                  className="custom-select px-2 md:px-3 py-2 text-sm md:text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 transition-all w-full sm:w-auto"
                  onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${focusRingColor}`}
                  onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <option value="">Select Label</option>
                  {STATIC_LABELS.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>

                <div className="flex-1 space-y-1">
                  <input
                    id={`email-input-${index}`}
                    type="email"
                    value={field.email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    onBlur={() => handleEmailBlur(index)}
                    placeholder="Enter email address"
                    className={`w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-lg border focus:outline-none focus:ring-2 placeholder-gray-400 dark:placeholder-gray-500 transition-all ${
                      emailErrors[index]
                        ? 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100 border-red-500 dark:border-red-600'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600'
                    }`}
                    onFocus={(e) => {
                      if (!emailErrors[index]) {
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${focusRingColor}`;
                      }
                    }}
                    style={{
                      boxShadow: emailErrors[index] ? '0 0 0 2px rgba(239, 68, 68, 0.5)' : undefined
                    }}
                  />
                  {emailErrors[index] && (
                    <p className="text-xs text-red-200 dark:text-red-300 px-1">
                      {emailErrors[index]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-4 md:mt-6 px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-white dark:bg-gray-100 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ color: buttonTextColor }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = buttonHoverBg)}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'white')}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
              Submit
            </>
          )}
        </button>
      </div>
    </div>
  );
}
